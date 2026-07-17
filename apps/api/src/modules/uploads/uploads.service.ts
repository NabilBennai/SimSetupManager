import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PrepareUploadResponse, PublicFileObject } from '@sim-setup-manager/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  STORAGE_PROVIDER,
  type StorageProvider,
} from '../../infrastructure/storage/storage-provider';
import type { PrepareUploadDto } from './dto/prepare-upload.dto';
import { toPublicFileObject } from './file-object.mapper';

const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;
const DEFAULT_UPLOAD_URL_TTL_MS = 15 * 60 * 1000;

export function maxUploadSizeBytes(): number {
  const value = Number(process.env['MAX_UPLOAD_SIZE_BYTES']);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_UPLOAD_SIZE_BYTES;
}

function uploadUrlTtlMs(): number {
  const value = Number(process.env['UPLOAD_URL_TTL_MS']);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_UPLOAD_URL_TTL_MS;
}

function extensionOf(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot === -1 ? '' : fileName.slice(lastDot).toLowerCase();
}

@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async prepare(userId: string, dto: PrepareUploadDto): Promise<PrepareUploadResponse> {
    const game = await this.prisma.game.findUnique({ where: { id: dto.gameId } });
    if (!game || !game.isActive) {
      throw new NotFoundException('Jeu introuvable.');
    }

    const supportedExtensions = this.parseExtensions(game.supportedExtensions);
    const extension = extensionOf(dto.originalName);
    if (!extension || !supportedExtensions.includes(extension)) {
      throw new BadRequestException(
        `Extension non prise en charge pour ce jeu (${supportedExtensions.join(', ')}).`,
      );
    }

    if (dto.sizeBytes > maxUploadSizeBytes()) {
      throw new BadRequestException(
        `Fichier trop volumineux (max ${Math.floor(maxUploadSizeBytes() / (1024 * 1024))} Mo).`,
      );
    }

    const storageKey = `${randomUUID()}${extension}`;
    const expiresAt = new Date(Date.now() + uploadUrlTtlMs());

    const intent = await this.prisma.uploadIntent.create({
      data: {
        userId,
        gameId: dto.gameId,
        storageKey,
        originalName: dto.originalName,
        mimeType: dto.mimeType,
        expectedExtension: extension,
        expectedSizeBytes: dto.sizeBytes,
        expiresAt,
      },
    });

    const { uploadUrl } = this.storage.createUploadTarget({
      storageKey,
      expiresInMs: uploadUrlTtlMs(),
    });

    return { uploadId: intent.id, uploadUrl, expiresAt: expiresAt.toISOString() };
  }

  async assertPendingIntent(storageKey: string): Promise<void> {
    const intent = await this.prisma.uploadIntent.findUnique({ where: { storageKey } });
    if (!intent || intent.status !== 'PENDING' || intent.expiresAt.getTime() <= Date.now()) {
      throw new NotFoundException("Intention d'upload introuvable ou expirée.");
    }
  }

  async markUploaded(storageKey: string): Promise<void> {
    const intent = await this.prisma.uploadIntent.findUnique({ where: { storageKey } });
    if (!intent || intent.status !== 'PENDING' || intent.expiresAt.getTime() <= Date.now()) {
      throw new NotFoundException("Intention d'upload introuvable ou expirée.");
    }

    await this.prisma.uploadIntent.update({
      where: { id: intent.id },
      data: { status: 'UPLOADED' },
    });
  }

  async complete(userId: string, uploadId: string): Promise<PublicFileObject> {
    const intent = await this.prisma.uploadIntent.findUnique({ where: { id: uploadId } });
    if (!intent || intent.userId !== userId) {
      throw new NotFoundException("Intention d'upload introuvable.");
    }

    if (intent.status === 'COMPLETED') {
      const existing = await this.prisma.fileObject.findUnique({
        where: { storageKey: intent.storageKey },
      });
      if (existing) {
        return toPublicFileObject(existing);
      }
    }

    if (intent.status !== 'UPLOADED') {
      throw new ConflictException("Le fichier n'a pas encore été envoyé.");
    }

    if (intent.expiresAt.getTime() <= Date.now()) {
      throw new ConflictException("L'intention d'upload a expiré.");
    }

    const verified = await this.storage.verifyUploadedObject(intent.storageKey);
    if (!verified) {
      throw new NotFoundException('Fichier introuvable sur le stockage.');
    }

    const fileObject = await this.prisma.fileObject.create({
      data: {
        uploadedByUserId: userId,
        storageProvider: 'local',
        storageKey: intent.storageKey,
        originalName: intent.originalName,
        mimeType: intent.mimeType,
        extension: intent.expectedExtension,
        sizeBytes: verified.sizeBytes,
        sha256: verified.sha256,
      },
    });

    await this.prisma.uploadIntent.update({
      where: { id: intent.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    return toPublicFileObject(fileObject);
  }

  private parseExtensions(raw: string): string[] {
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : [];
    } catch {
      return [];
    }
  }
}
