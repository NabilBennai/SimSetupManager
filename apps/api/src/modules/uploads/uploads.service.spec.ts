import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { UploadsService } from './uploads.service';

describe('UploadsService', () => {
  const prisma = {
    game: { findUnique: jest.fn() },
    uploadIntent: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    fileObject: { findUnique: jest.fn(), create: jest.fn() },
  };
  const storage = { createUploadTarget: jest.fn(), verifyUploadedObject: jest.fn() };

  let service: UploadsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UploadsService(prisma as never, storage as never);
  });

  describe('prepare', () => {
    it("lève 404 si le jeu n'existe pas ou est inactif", async () => {
      prisma.game.findUnique.mockResolvedValue(null);

      await expect(
        service.prepare('u1', {
          gameId: 'g1',
          originalName: 'a.sto',
          mimeType: 'application/octet-stream',
          sizeBytes: 10,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuse une extension non supportée par le jeu', async () => {
      prisma.game.findUnique.mockResolvedValue({
        id: 'g1',
        isActive: true,
        supportedExtensions: '[".sto"]',
      });

      await expect(
        service.prepare('u1', {
          gameId: 'g1',
          originalName: 'a.json',
          mimeType: 'application/json',
          sizeBytes: 10,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuse un fichier trop volumineux', async () => {
      prisma.game.findUnique.mockResolvedValue({
        id: 'g1',
        isActive: true,
        supportedExtensions: '[".sto"]',
      });

      await expect(
        service.prepare('u1', {
          gameId: 'g1',
          originalName: 'a.sto',
          mimeType: 'application/octet-stream',
          sizeBytes: 999_999_999,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("crée une intention d'upload et retourne l'URL du fournisseur de stockage", async () => {
      prisma.game.findUnique.mockResolvedValue({
        id: 'g1',
        isActive: true,
        supportedExtensions: '[".sto"]',
      });
      prisma.uploadIntent.create.mockResolvedValue({ id: 'intent-1' });
      storage.createUploadTarget.mockReturnValue({ uploadUrl: 'https://example/upload' });

      const result = await service.prepare('u1', {
        gameId: 'g1',
        originalName: 'a.sto',
        mimeType: 'application/octet-stream',
        sizeBytes: 10,
      });

      expect(result.uploadId).toBe('intent-1');
      expect(result.uploadUrl).toBe('https://example/upload');
    });
  });

  describe('complete', () => {
    it("lève 404 si l'intention n'existe pas ou n'appartient pas à l'appelant", async () => {
      prisma.uploadIntent.findUnique.mockResolvedValue({ id: 'i1', userId: 'someone-else' });

      await expect(service.complete('u1', 'i1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('est idempotent : retourne le FileObject existant si déjà COMPLETED', async () => {
      prisma.uploadIntent.findUnique.mockResolvedValue({
        id: 'i1',
        userId: 'u1',
        status: 'COMPLETED',
        storageKey: 'key.sto',
      });
      prisma.fileObject.findUnique.mockResolvedValue({
        id: 'f1',
        originalName: 'a.sto',
        mimeType: 'application/octet-stream',
        extension: '.sto',
        sizeBytes: 10,
        sha256: 'hash',
        status: 'VALIDATED',
      });

      const result = await service.complete('u1', 'i1');

      expect(result.id).toBe('f1');
      expect(prisma.fileObject.create).not.toHaveBeenCalled();
    });

    it("refuse si le fichier n'a pas encore été envoyé", async () => {
      prisma.uploadIntent.findUnique.mockResolvedValue({
        id: 'i1',
        userId: 'u1',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(service.complete('u1', 'i1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('crée le FileObject à partir de la vérification du stockage', async () => {
      prisma.uploadIntent.findUnique.mockResolvedValue({
        id: 'i1',
        userId: 'u1',
        status: 'UPLOADED',
        storageKey: 'key.sto',
        originalName: 'a.sto',
        mimeType: 'application/octet-stream',
        expectedExtension: '.sto',
        expiresAt: new Date(Date.now() + 60_000),
      });
      storage.verifyUploadedObject.mockResolvedValue({ sizeBytes: 42, sha256: 'realhash' });
      prisma.fileObject.create.mockResolvedValue({
        id: 'f1',
        originalName: 'a.sto',
        mimeType: 'application/octet-stream',
        extension: '.sto',
        sizeBytes: 42,
        sha256: 'realhash',
        status: 'VALIDATED',
      });

      const result = await service.complete('u1', 'i1');

      expect(result.sizeBytes).toBe(42);
      expect(result.sha256).toBe('realhash');
      expect(prisma.uploadIntent.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) }),
      );
    });
  });
});
