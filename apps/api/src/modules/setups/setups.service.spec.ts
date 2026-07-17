import { NotFoundException } from '@nestjs/common';

import { SetupsService } from './setups.service';

describe('SetupsService', () => {
  const tx = {
    setup: { create: jest.fn(), update: jest.fn() },
    setupVersion: { create: jest.fn() },
  };
  const prisma = {
    game: { findUnique: jest.fn() },
    car: { findUnique: jest.fn() },
    track: { findUnique: jest.fn() },
    fileObject: { findUnique: jest.fn() },
    setupVersion: { findFirst: jest.fn() },
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
  });

  describe('ownership', () => {
    it('getForOwner lève 404 (jamais 403) si le setup ne lui appartient pas', async () => {
      prisma.setup.findFirst.mockResolvedValue(null);

      await expect(service.getForOwner('u1', 'not-mine')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
