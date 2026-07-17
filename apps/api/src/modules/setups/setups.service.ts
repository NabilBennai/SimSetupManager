import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AddSetupVersionPayload,
  CreateSetupPayload,
  DownloadUrlResponse,
  Paginated,
  PublicSetup,
  PublicSetupSummary,
  PublicSetupVersionSummary,
  UpdateSetupPayload,
} from '@sim-setup-manager/contracts';

import { toPublicFileObject, type FileObjectLike } from '../uploads/file-object.mapper';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import type { FileObject, Prisma } from '../../infrastructure/database/generated/client';
import {
  STORAGE_PROVIDER,
  type StorageProvider,
} from '../../infrastructure/storage/storage-provider';
import type { ListSetupsQueryDto } from './dto/list-setups-query.dto';

type TransactionClient = Prisma.TransactionClient;

const DEFAULT_DOWNLOAD_URL_TTL_MS = 5 * 60 * 1000;
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 30;

function downloadUrlTtlMs(): number {
  const value = Number(process.env['DOWNLOAD_URL_TTL_MS']);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_DOWNLOAD_URL_TTL_MS;
}

/** trim + minuscules + dédoublonnage — évite les quasi-doublons de tags. */
function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags) {
    return [];
  }
  const normalized = tags
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0 && tag.length <= MAX_TAG_LENGTH);
  return Array.from(new Set(normalized)).slice(0, MAX_TAGS);
}

const summaryInclude = {
  game: { select: { name: true } },
  car: { select: { name: true } },
  track: { select: { name: true } },
  tags: { include: { tag: { select: { name: true } } } },
} as const;

const detailInclude = {
  ...summaryInclude,
  owner: { select: { displayName: true } },
  referenceVersion: { include: { fileObject: true } },
} as const;

const versionInclude = {
  fileObject: true,
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
  tags: { tag: { name: string } }[];
};

type SetupWithDetailRelations = SetupWithSummaryRelations & {
  ownerId: string;
  owner: { displayName: string };
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
      this.assertFileAvailable(userId, payload.fileId),
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

    const tagNames = normalizeTags(payload.tags);

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

      await this.replaceTags(tx, setup.id, tagNames);

      return setup.id;
    });

    return this.getForOwner(userId, setupId);
  }

  async listForOwner(
    userId: string,
    query: ListSetupsQueryDto,
  ): Promise<Paginated<PublicSetupSummary>> {
    const search = query.search?.trim();

    const where = {
      ownerId: userId,
      deletedAt: null,
      ...(query.includeArchived ? {} : { isArchived: false }),
      ...(query.gameId ? { gameId: query.gameId } : {}),
      ...(query.carId ? { carId: query.carId } : {}),
      ...(query.trackId ? { trackId: query.trackId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { car: { name: { contains: search } } },
              { track: { name: { contains: search } } },
              { tags: { some: { tag: { name: { contains: search.toLowerCase() } } } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.setup.findMany({
        where,
        include: summaryInclude,
        orderBy: { [query.sortBy]: query.sortOrder },
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

    await this.prisma.$transaction(async (tx) => {
      await tx.setup.update({
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

      if (payload.tags !== undefined) {
        await this.replaceTags(tx, setupId, normalizeTags(payload.tags));
      }
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
   * Ajoute une nouvelle version (VER-01) : l'ancienne reste intacte
   * (immuable, ADR-006). Devient la version de référence par défaut —
   * comportement le plus attendu (on vient d'importer la dernière
   * révision) — mais VER-03 permet de revenir à n'importe quelle version.
   */
  async addVersion(
    userId: string,
    setupId: string,
    payload: AddSetupVersionPayload,
  ): Promise<PublicSetupVersionSummary> {
    const setup = await this.findOwnedOrThrow(userId, setupId, {
      owner: { select: { displayName: true } },
    });
    const { owner } = setup as { owner: { displayName: string } };
    const file = await this.assertFileAvailable(userId, payload.fileId);

    const versionId = await this.prisma.$transaction(async (tx) => {
      const lastVersion = await tx.setupVersion.findFirst({
        where: { setupId },
        orderBy: { versionNumber: 'desc' },
      });

      const version = await tx.setupVersion.create({
        data: {
          setupId,
          versionNumber: (lastVersion?.versionNumber ?? 0) + 1,
          fileObjectId: file.id,
          changeNotes: payload.changeNotes,
        },
      });

      await tx.setup.update({ where: { id: setupId }, data: { referenceVersionId: version.id } });

      return version.id;
    });

    const created = await this.prisma.setupVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: versionInclude,
    });

    return this.toPublicVersion(created, owner.displayName, true);
  }

  /** Historique des versions (VER-02) : date, notes, auteur, fichier, indicateur de référence. */
  async listVersions(userId: string, setupId: string): Promise<PublicSetupVersionSummary[]> {
    const setup = await this.findOwnedOrThrow(userId, setupId, {
      owner: { select: { displayName: true } },
    });
    const { referenceVersionId, owner } = setup as {
      referenceVersionId: string | null;
      owner: { displayName: string };
    };

    const versions = await this.prisma.setupVersion.findMany({
      where: { setupId },
      include: versionInclude,
      orderBy: { versionNumber: 'desc' },
    });

    return versions.map((version) =>
      this.toPublicVersion(version, owner.displayName, version.id === referenceVersionId),
    );
  }

  /** Marque une version comme référence active (VER-03) : une seule à la fois par setup. */
  async setReferenceVersion(
    userId: string,
    setupId: string,
    versionId: string,
  ): Promise<PublicSetup> {
    await this.findOwnedOrThrow(userId, setupId, {});

    const version = await this.prisma.setupVersion.findFirst({ where: { id: versionId, setupId } });
    if (!version) {
      throw new NotFoundException('Version introuvable pour ce setup.');
    }

    await this.prisma.setup.update({
      where: { id: setupId },
      data: { referenceVersionId: versionId },
    });
    return this.getForOwner(userId, setupId);
  }

  /** Vérifie que le fichier existe, appartient à l'appelant, est validé et pas déjà utilisé. */
  private async assertFileAvailable(userId: string, fileId: string): Promise<FileObject> {
    const file = await this.prisma.fileObject.findUnique({ where: { id: fileId } });
    if (!file || file.uploadedByUserId !== userId || file.status !== 'VALIDATED') {
      throw new NotFoundException('Fichier introuvable.');
    }

    const existingVersion = await this.prisma.setupVersion.findFirst({
      where: { fileObjectId: file.id },
    });
    if (existingVersion) {
      throw new NotFoundException('Ce fichier est déjà attaché à un setup.');
    }

    return file;
  }

  /** Upsert des tags par nom puis remplacement complet des liens du setup. */
  private async replaceTags(
    tx: TransactionClient,
    setupId: string,
    tagNames: string[],
  ): Promise<void> {
    await tx.tagLink.deleteMany({ where: { setupId } });

    if (tagNames.length === 0) {
      return;
    }

    const tagIds = await Promise.all(
      tagNames.map((name) => tx.tag.upsert({ where: { name }, create: { name }, update: {} })),
    );

    await tx.tagLink.createMany({
      data: tagIds.map((tag) => ({ setupId, tagId: tag.id })),
    });
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
      tags: setup.tags.map((link) => link.tag.name),
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
      tags: setup.tags.map((link) => link.tag.name),
      referenceVersion: setup.referenceVersion
        ? this.toPublicVersion(setup.referenceVersion, setup.owner.displayName, true)
        : null,
      createdAt: setup.createdAt.toISOString(),
      updatedAt: setup.updatedAt.toISOString(),
    };
  }

  private toPublicVersion(
    version: {
      id: string;
      versionNumber: number;
      changeNotes: string | null;
      createdAt: Date;
      fileObject: FileObjectLike;
    },
    authorDisplayName: string,
    isReference: boolean,
  ): PublicSetupVersionSummary {
    return {
      id: version.id,
      versionNumber: version.versionNumber,
      changeNotes: version.changeNotes,
      createdAt: version.createdAt.toISOString(),
      authorDisplayName,
      isReference,
      file: toPublicFileObject(version.fileObject),
    };
  }
}
