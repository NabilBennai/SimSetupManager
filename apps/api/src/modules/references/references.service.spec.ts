import { NotFoundException } from '@nestjs/common';

import { ReferencesService } from './references.service';

describe('ReferencesService', () => {
  const prisma = {
    game: { findMany: jest.fn(), findUnique: jest.fn() },
    carCategory: { findMany: jest.fn() },
    car: { findMany: jest.fn(), count: jest.fn() },
    track: { findMany: jest.fn(), count: jest.fn() },
  };

  let service: ReferencesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReferencesService(prisma as never);
  });

  describe('listActiveGames', () => {
    it('mappe les jeux et désérialise supportedExtensions', async () => {
      prisma.game.findMany.mockResolvedValue([
        { id: 'g1', slug: 'acc', name: 'ACC', supportedExtensions: '[".json"]' },
      ]);

      const result = await service.listActiveGames();

      expect(prisma.game.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual([
        { id: 'g1', slug: 'acc', name: 'ACC', supportedExtensions: ['.json'] },
      ]);
    });

    it('retourne un tableau vide si supportedExtensions est un JSON invalide', async () => {
      prisma.game.findMany.mockResolvedValue([
        { id: 'g1', slug: 'acc', name: 'ACC', supportedExtensions: 'not-json' },
      ]);

      const result = await service.listActiveGames();

      expect(result[0]?.supportedExtensions).toEqual([]);
    });
  });

  describe('listCarsForGame', () => {
    it("lève 404 si le jeu n'existe pas", async () => {
      prisma.game.findUnique.mockResolvedValue(null);

      await expect(
        service.listCarsForGame('missing', { page: 1, pageSize: 20 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('pagine et inclut le nom de catégorie', async () => {
      prisma.game.findUnique.mockResolvedValue({ id: 'g1' });
      prisma.car.findMany.mockResolvedValue([
        {
          id: 'c1',
          gameId: 'g1',
          categoryId: 'cat1',
          category: { id: 'cat1', gameId: 'g1', name: 'GT3' },
          slug: 'car-1',
          manufacturer: 'Ferrari',
          name: '296 GT3',
        },
      ]);
      prisma.car.count.mockResolvedValue(1);

      const result = await service.listCarsForGame('g1', { page: 2, pageSize: 5 });

      expect(prisma.car.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { gameId: 'g1', isActive: true }, skip: 5, take: 5 }),
      );
      expect(result).toEqual({
        items: [
          {
            id: 'c1',
            gameId: 'g1',
            categoryId: 'cat1',
            categoryName: 'GT3',
            slug: 'car-1',
            manufacturer: 'Ferrari',
            name: '296 GT3',
          },
        ],
        page: 2,
        pageSize: 5,
        total: 1,
      });
    });
  });

  describe('searchTracks', () => {
    it('filtre par nom ou variante quand une recherche est fournie', async () => {
      prisma.track.findMany.mockResolvedValue([]);
      prisma.track.count.mockResolvedValue(0);

      await service.searchTracks({ page: 1, pageSize: 20, search: 'nord' });

      expect(prisma.track.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isActive: true,
            OR: [{ name: { contains: 'nord' } }, { layout: { contains: 'nord' } }],
          },
        }),
      );
    });
  });
});
