import { NotFoundException } from '@nestjs/common';

import { SetupsService } from './setups.service';

describe('SetupsService', () => {
  const tx = {
    setup: { create: jest.fn(), update: jest.fn() },
    setupVersion: { create: jest.fn(), findFirst: jest.fn() },
    tag: { upsert: jest.fn() },
    tagLink: { deleteMany: jest.fn(), createMany: jest.fn() },
  };
  const prisma = {
    game: { findUnique: jest.fn() },
    car: { findUnique: jest.fn() },
    track: { findUnique: jest.fn() },
    fileObject: { findUnique: jest.fn() },
    setupVersion: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    setup: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(tx)),
  };
  const storage = { createDownloadUrl: jest.fn() };

  let service: SetupsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SetupsService(prisma as never, storage as never);
  });

  describe('create', () => {
    const game = { id: 'g1', isActive: true };
    const car = { id: 'c1', gameId: 'g1', isActive: true };
    const track = { id: 't1', isActive: true };
    const file = { id: 'f1', uploadedByUserId: 'u1', status: 'VALIDATED' };

    it('lève 404 si la voiture ne correspond pas au jeu', async () => {
      prisma.game.findUnique.mockResolvedValue(game);
      prisma.car.findUnique.mockResolvedValue({ ...car, gameId: 'other-game' });
      prisma.track.findUnique.mockResolvedValue(track);
      prisma.fileObject.findUnique.mockResolvedValue(file);

      await expect(
        service.create('u1', {
          title: 'Test',
          gameId: 'g1',
          carId: 'c1',
          trackId: 't1',
          fileId: 'f1',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("lève 404 si le fichier n'appartient pas à l'appelant", async () => {
      prisma.game.findUnique.mockResolvedValue(game);
      prisma.car.findUnique.mockResolvedValue(car);
      prisma.track.findUnique.mockResolvedValue(track);
      prisma.fileObject.findUnique.mockResolvedValue({ ...file, uploadedByUserId: 'someone-else' });

      await expect(
        service.create('u1', {
          title: 'Test',
          gameId: 'g1',
          carId: 'c1',
          trackId: 't1',
          fileId: 'f1',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lève 404 si le fichier est déjà attaché à une version', async () => {
      prisma.game.findUnique.mockResolvedValue(game);
      prisma.car.findUnique.mockResolvedValue(car);
      prisma.track.findUnique.mockResolvedValue(track);
      prisma.fileObject.findUnique.mockResolvedValue(file);
      prisma.setupVersion.findFirst.mockResolvedValue({ id: 'existing-version' });

      await expect(
        service.create('u1', {
          title: 'Test',
          gameId: 'g1',
          carId: 'c1',
          trackId: 't1',
          fileId: 'f1',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('crée le setup, la version 1 et met à jour referenceVersionId dans une transaction', async () => {
      prisma.game.findUnique.mockResolvedValue(game);
      prisma.car.findUnique.mockResolvedValue(car);
      prisma.track.findUnique.mockResolvedValue(track);
      prisma.fileObject.findUnique.mockResolvedValue(file);
      prisma.setupVersion.findFirst.mockResolvedValue(null);
      tx.setup.create.mockResolvedValue({ id: 'setup-1' });
      tx.setupVersion.create.mockResolvedValue({ id: 'version-1' });
      prisma.setup.findFirst.mockResolvedValue({
        id: 'setup-1',
        ownerId: 'u1',
        title: 'Test',
        descriptionPublic: null,
        notesPrivate: null,
        visibility: 'PRIVATE',
        sessionType: null,
        weather: null,
        trackTemperatureC: null,
        airTemperatureC: null,
        gameVersion: null,
        isArchived: false,
        gameId: 'g1',
        carId: 'c1',
        trackId: 't1',
        game: { name: 'Game' },
        car: { name: 'Car' },
        track: { name: 'Track' },
        tags: [],
        referenceVersion: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.create('u1', {
        title: 'Test',
        gameId: 'g1',
        carId: 'c1',
        trackId: 't1',
        fileId: 'f1',
      });

      expect(tx.setup.create).toHaveBeenCalledTimes(1);
      expect(tx.setupVersion.create).toHaveBeenCalledWith({
        data: { setupId: 'setup-1', versionNumber: 1, fileObjectId: 'f1' },
      });
      expect(tx.setup.update).toHaveBeenCalledWith({
        where: { id: 'setup-1' },
        data: { referenceVersionId: 'version-1' },
      });
    });

    it('normalise les tags (trim, minuscules, dédoublonnage) avant de les attacher', async () => {
      prisma.game.findUnique.mockResolvedValue(game);
      prisma.car.findUnique.mockResolvedValue(car);
      prisma.track.findUnique.mockResolvedValue(track);
      prisma.fileObject.findUnique.mockResolvedValue(file);
      prisma.setupVersion.findFirst.mockResolvedValue(null);
      tx.setup.create.mockResolvedValue({ id: 'setup-1' });
      tx.setupVersion.create.mockResolvedValue({ id: 'version-1' });
      tx.tag.upsert.mockImplementation(({ where }: { where: { name: string } }) =>
        Promise.resolve({ id: `tag-${where.name}` }),
      );
      prisma.setup.findFirst.mockResolvedValue({
        id: 'setup-1',
        ownerId: 'u1',
        title: 'Test',
        descriptionPublic: null,
        notesPrivate: null,
        visibility: 'PRIVATE',
        sessionType: null,
        weather: null,
        trackTemperatureC: null,
        airTemperatureC: null,
        gameVersion: null,
        isArchived: false,
        gameId: 'g1',
        carId: 'c1',
        trackId: 't1',
        game: { name: 'Game' },
        car: { name: 'Car' },
        track: { name: 'Track' },
        tags: [],
        referenceVersion: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.create('u1', {
        title: 'Test',
        gameId: 'g1',
        carId: 'c1',
        trackId: 't1',
        fileId: 'f1',
        tags: [' Endurance ', 'endurance', 'Qualif'],
      });

      expect(tx.tagLink.deleteMany).toHaveBeenCalledWith({ where: { setupId: 'setup-1' } });
      expect(tx.tag.upsert).toHaveBeenCalledTimes(2);
      expect(tx.tag.upsert).toHaveBeenCalledWith({
        where: { name: 'endurance' },
        create: { name: 'endurance' },
        update: {},
      });
      expect(tx.tag.upsert).toHaveBeenCalledWith({
        where: { name: 'qualif' },
        create: { name: 'qualif' },
        update: {},
      });
      expect(tx.tagLink.createMany).toHaveBeenCalledWith({
        data: [
          { setupId: 'setup-1', tagId: 'tag-endurance' },
          { setupId: 'setup-1', tagId: 'tag-qualif' },
        ],
      });
    });
  });

  describe('listForOwner', () => {
    it('combine recherche texte, filtres et tri dans la requête Prisma', async () => {
      prisma.setup.findMany.mockResolvedValue([]);
      prisma.setup.count.mockResolvedValue(0);

      await service.listForOwner('u1', {
        page: 2,
        pageSize: 10,
        includeArchived: false,
        search: 'Monza',
        gameId: 'g1',
        carId: 'c1',
        trackId: 't1',
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });

      expect(prisma.setup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            ownerId: 'u1',
            deletedAt: null,
            isArchived: false,
            gameId: 'g1',
            carId: 'c1',
            trackId: 't1',
            OR: [
              { title: { contains: 'Monza' } },
              { car: { name: { contains: 'Monza' } } },
              { track: { name: { contains: 'Monza' } } },
              { tags: { some: { tag: { name: { contains: 'monza' } } } } },
            ],
          },
          orderBy: { createdAt: 'asc' },
          skip: 10,
          take: 10,
        }),
      );
    });
  });

  describe('ownership', () => {
    it('getForOwner lève 404 (jamais 403) si le setup ne lui appartient pas', async () => {
      prisma.setup.findFirst.mockResolvedValue(null);

      await expect(service.getForOwner('u1', 'not-mine')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('addVersion', () => {
    it("lève 404 si le setup n'appartient pas à l'appelant", async () => {
      prisma.setup.findFirst.mockResolvedValue(null);

      await expect(service.addVersion('u1', 'not-mine', { fileId: 'f1' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("lève 404 si le fichier n'est pas disponible (déjà utilisé, pas VALIDATED...)", async () => {
      prisma.setup.findFirst.mockResolvedValue({ id: 'setup-1', owner: { displayName: 'Owner' } });
      prisma.fileObject.findUnique.mockResolvedValue(null);

      await expect(
        service.addVersion('u1', 'setup-1', { fileId: 'missing' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('incrémente versionNumber à partir de la dernière version et devient la référence', async () => {
      prisma.setup.findFirst.mockResolvedValue({ id: 'setup-1', owner: { displayName: 'Owner' } });
      prisma.fileObject.findUnique.mockResolvedValue({
        id: 'f2',
        uploadedByUserId: 'u1',
        status: 'VALIDATED',
      });
      prisma.setupVersion.findFirst.mockResolvedValue(null); // pas déjà attaché
      tx.setupVersion.findFirst.mockResolvedValue({ versionNumber: 3 });
      tx.setupVersion.create.mockResolvedValue({ id: 'version-4' });
      prisma.setupVersion.findUniqueOrThrow.mockResolvedValue({
        id: 'version-4',
        versionNumber: 4,
        changeNotes: 'Ajustement pluie',
        createdAt: new Date(),
        fileObject: {
          id: 'f2',
          originalName: 'wet.sto',
          mimeType: 'application/octet-stream',
          extension: '.sto',
          sizeBytes: 12,
          sha256: 'hash',
          status: 'VALIDATED',
        },
      });

      const result = await service.addVersion('u1', 'setup-1', {
        fileId: 'f2',
        changeNotes: 'Ajustement pluie',
      });

      expect(tx.setupVersion.create).toHaveBeenCalledWith({
        data: {
          setupId: 'setup-1',
          versionNumber: 4,
          fileObjectId: 'f2',
          changeNotes: 'Ajustement pluie',
        },
      });
      expect(tx.setup.update).toHaveBeenCalledWith({
        where: { id: 'setup-1' },
        data: { referenceVersionId: 'version-4' },
      });
      expect(result).toEqual(
        expect.objectContaining({
          versionNumber: 4,
          isReference: true,
          authorDisplayName: 'Owner',
        }),
      );
    });
  });

  describe('listVersions', () => {
    it('marque isReference sur la version correspondant à referenceVersionId', async () => {
      prisma.setup.findFirst.mockResolvedValue({
        referenceVersionId: 'version-2',
        owner: { displayName: 'Owner' },
      });
      prisma.setupVersion.findMany.mockResolvedValue([
        {
          id: 'version-2',
          versionNumber: 2,
          changeNotes: null,
          createdAt: new Date(),
          fileObject: {
            id: 'f2',
            originalName: 'v2.sto',
            mimeType: 'application/octet-stream',
            extension: '.sto',
            sizeBytes: 10,
            sha256: 'h2',
            status: 'VALIDATED',
          },
        },
        {
          id: 'version-1',
          versionNumber: 1,
          changeNotes: null,
          createdAt: new Date(),
          fileObject: {
            id: 'f1',
            originalName: 'v1.sto',
            mimeType: 'application/octet-stream',
            extension: '.sto',
            sizeBytes: 9,
            sha256: 'h1',
            status: 'VALIDATED',
          },
        },
      ]);

      const result = await service.listVersions('u1', 'setup-1');

      expect(result.find((v) => v.id === 'version-2')?.isReference).toBe(true);
      expect(result.find((v) => v.id === 'version-1')?.isReference).toBe(false);
      expect(result.every((v) => v.authorDisplayName === 'Owner')).toBe(true);
    });
  });

  describe('setReferenceVersion', () => {
    it("lève 404 si la version n'appartient pas au setup", async () => {
      prisma.setup.findFirst.mockResolvedValueOnce({ id: 'setup-1' });
      prisma.setupVersion.findFirst.mockResolvedValue(null);

      await expect(
        service.setReferenceVersion('u1', 'setup-1', 'not-a-version-of-this-setup'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
