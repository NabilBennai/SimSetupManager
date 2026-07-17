import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateSetupPayload,
  DownloadUrlResponse,
  Paginated,
  PublicSetup,
  PublicSetupSummary,
  PublicSetupVersionSummary,
  UpdateSetupPayload,
} from '@sim-setup-manager/contracts';

import { toPublicFileObject } from '../uploads/file-object.mapper';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  STORAGE_PROVIDER,
  type StorageProvider,
} from '../../infrastructure/storage/storage-provider';
import type { ListSetupsQueryDto } from './dto/list-setups-query.dto';

const DEFAULT_DOWNLOAD_URL_TTL_MS = 5 * 60 * 1000;

function downloadUrlTtlMs(): number {
  const value = Number(process.env['DOWNLOAD_URL_TTL_MS']);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_DOWNLOAD_URL_TTL_MS;
}

const summaryInclude = {
  game: { select: { name: true } },
  car: { select: { name: true } },
  track: { select: { name: true } },
} as const;

const detailInclude = {
  ...summaryInclude,
  referenceVersion: { include: { fileObject: true } },
} as const;

type SetupWithSummaryRelations = {
  id: string;
  title: string;
  gameId: string;
  carId: string;
  trackId: string;
  isArchived: boolean;
  updatedAt: Date;
  game: { name: string };
  car: { name: string };
  track: { name: string };
};

type SetupWithDetailRelations = SetupWithSummaryRelations & {
  ownerId: string;
  descriptionPublic: string | null;
  notesPrivate: string | null;
  visibility: string;
  sessionType: string | null;
  weather: string | null;
  trackTemperatureC: number | null;
  airTemperatureC: number | null;
  gameVersion: string | null;
  createdAt: Date;
  referenceVersion:
    | ({
        id: string;
        versionNumber: number;
        changeNotes: string | null;
        createdAt: Date;
      } & {
        fileObject: {
          id: string;
          originalName: string;
          mimeType: string;
          extension: string;
          sizeBytes: number;
          sha256: string;
          status: string;
          storageKey: string;
        };
      })
    | null;
};

@Injectable()
export class SetupsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async create(userId: string, payload: CreateSetupPayload): Promise<PublicSetup> {
    const [game, car, track, file] = await Promise.all([
      this.prisma.game.findUnique({ where: { id: payload.gameId } }),
      this.prisma.car.findUnique({ where: { id: payload.carId } }),
      this.prisma.track.findUnique({ where: { id: payload.trackId } }),
      this.prisma.fileObject.findUnique({ where: { id: payload.fileId } }),
    ]);

    if (!game || !game.isActive) {
      throw new NotFoundException('Jeu introuvable.');
    }
    if (!car || !car.isActive || car.gameId !== game.id) {
      throw new NotFoundException('Voiture introuvable pour ce jeu.');
    }
    if (!track || !track.isActive) {
      throw new NotFoundException('Circuit introuvable.');
    }
    if (!file || file.uploadedByUserId !== userId || file.status !== 'VALIDATED') {
      throw new NotFoundException('Fichier introuvable.');
    }

    const existingVersion = await this.prisma.setupVersion.findFirst({
      where: { fileObjectId: file.id },
    });
    if (existingVersion) {
      throw new NotFoundException('Ce fichier est déjà attaché à un setup.');
    }

    const setupId = await this.prisma.$transaction(async (tx) => {
      const setup = await tx.setup.create({
        data: {
          ownerId: userId,
          gameId: payload.gameId,
          carId: payload.carId,
          trackId: payload.trackId,
          title: payload.title,
          descriptionPublic: payload.descriptionPublic,
          notesPrivate: payload.notesPrivate,
          sessionType: payload.sessionType,
          weather: payload.weather,
          trackTemperatureC: payload.trackTemperatureC,
          airTemperatureC: payload.airTemperatureC,
          gameVersion: payload.gameVersion,
        },
      });

      const version = await tx.setupVersion.create({
        data: { setupId: setup.id, versionNumber: 1, fileObjectId: file.id },
      });

      await tx.setup.update({
        where: { id: setup.id },
        data: { referenceVersionId: version.id },
      });

      return setup.id;
    });

    return this.getForOwner(userId, setupId);
  }

  async listForOwner(
    userId: string,
    query: ListSetupsQueryDto,
  ): Promise<Paginated<PublicSetupSummary>> {
    const where = {
      ownerId: userId,
      deletedAt: null,
      ...(query.includeArchived ? {} : { isArchived: false }),
    };

    const [items, total] = await Promise.all([
      this.prisma.setup.findMany({
        where,
        include: summaryInclude,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.setup.count({ where }),
    ]);

    return {
      items: items.map((setup) => this.toPublicSummary(setup)),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async getForOwner(userId: string, setupId: string): Promise<PublicSetup> {
    const setup = await this.findOwnedOrThrow(userId, setupId, detailInclude);
    return this.toPublicSetup(setup as SetupWithDetailRelations);
  }

  async update(userId: string, setupId: string, payload: UpdateSetupPayload): Promise<PublicSetup> {
    await this.findOwnedOrThrow(userId, setupId, {});

    await this.prisma.setup.update({
      where: { id: setupId },
      data: {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.descriptionPublic !== undefined
          ? { descriptionPublic: payload.descriptionPublic }
          : {}),
        ...(payload.notesPrivate !== undefined ? { notesPrivate: payload.notesPrivate } : {}),
        ...(payload.sessionType !== undefined ? { sessionType: payload.sessionType } : {}),
        ...(payload.weather !== undefined ? { weather: payload.weather } : {}),
        ...(payload.trackTemperatureC !== undefined
          ? { trackTemperatureC: payload.trackTemperatureC }
          : {}),
        ...(payload.airTemperatureC !== undefined
          ? { airTemperatureC: payload.airTemperatureC }
          : {}),
        ...(payload.gameVersion !== undefined ? { gameVersion: payload.gameVersion } : {}),
      },
    });

    return this.getForOwner(userId, setupId);
  }

  async setArchived(userId: string, setupId: string, isArchived: boolean): Promise<PublicSetup> {
    await this.findOwnedOrThrow(userId, setupId, {});
    await this.prisma.setup.update({ where: { id: setupId }, data: { isArchived } });
    return this.getForOwner(userId, setupId);
  }

  async softDelete(userId: string, setupId: string): Promise<void> {
    await this.findOwnedOrThrow(userId, setupId, {});
    await this.prisma.setup.update({ where: { id: setupId }, data: { deletedAt: new Date() } });
  }

  async createDownloadUrl(userId: string, setupId: string): Promise<DownloadUrlResponse> {
    const setup = await this.findOwnedOrThrow(userId, setupId, detailInclude);
    const version = (setup as SetupWithDetailRelations).referenceVersion;
    if (!version) {
      throw new NotFoundException('Aucune version disponible pour ce setup.');
    }

    const { downloadUrl } = this.storage.createDownloadUrl({
      storageKey: version.fileObject.storageKey,
      originalName: version.fileObject.originalName,
      expiresInMs: downloadUrlTtlMs(),
    });

    return {
      downloadUrl,
      expiresAt: new Date(Date.now() + downloadUrlTtlMs()).toISOString(),
      originalName: version.fileObject.originalName,
    };
  }

  /**
   * 404 uniforme (jamais 403) que le setup n'existe pas ou n'appartienne
   * pas à l'appelant : ne jamais révéler l'existence d'un setup à un
   * utilisateur qui n'en est pas propriétaire (IDOR, docs/05 OPS-05).
   */
  private async findOwnedOrThrow(
    userId: string,
    setupId: string,
    include: Record<string, unknown>,
  ): Promise<unknown> {
    const setup = await this.prisma.setup.findFirst({
      where: { id: setupId, ownerId: userId, deletedAt: null },
      include,
    });
    if (!setup) {
      throw new NotFoundException('Setup introuvable.');
    }
    return setup;
  }

  private toPublicSummary(setup: SetupWithSummaryRelations): PublicSetupSummary {
    return {
      id: setup.id,
      title: setup.title,
      gameId: setup.gameId,
      gameName: setup.game.name,
      carId: setup.carId,
      carName: setup.car.name,
      trackId: setup.trackId,
      trackName: setup.track.name,
      isArchived: setup.isArchived,
      updatedAt: setup.updatedAt.toISOString(),
    };
  }

  private toPublicSetup(setup: SetupWithDetailRelations): PublicSetup {
    return {
      id: setup.id,
      ownerId: setup.ownerId,
      title: setup.title,
      descriptionPublic: setup.descriptionPublic,
      notesPrivate: setup.notesPrivate,
      visibility: setup.visibility,
      sessionType: setup.sessionType,
      weather: setup.weather,
      trackTemperatureC: setup.trackTemperatureC,
      airTemperatureC: setup.airTemperatureC,
      gameVersion: setup.gameVersion,
      isArchived: setup.isArchived,
      gameId: setup.gameId,
      gameName: setup.game.name,
      carId: setup.carId,
      carName: setup.car.name,
      trackId: setup.trackId,
      trackName: setup.track.name,
      referenceVersion: setup.referenceVersion
        ? this.toPublicVersion(setup.referenceVersion)
        : null,
      createdAt: setup.createdAt.toISOString(),
      updatedAt: setup.updatedAt.toISOString(),
    };
  }

  private toPublicVersion(
    version: SetupWithDetailRelations['referenceVersion'] & object,
  ): PublicSetupVersionSummary {
    return {
      id: version.id,
      versionNumber: version.versionNumber,
      changeNotes: version.changeNotes,
      createdAt: version.createdAt.toISOString(),
      file: toPublicFileObject(version.fileObject),
    };
  }
}
