import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  Paginated,
  PublicCar,
  PublicCarCategory,
  PublicGame,
  PublicTrack,
} from '@sim-setup-manager/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import type {
  Car,
  CarCategory,
  Game,
  Prisma,
  Track,
} from '../../infrastructure/database/generated/client';
import type { ListCarsQueryDto } from './dto/list-cars-query.dto';
import type { ListTracksQueryDto } from './dto/list-tracks-query.dto';

type CarWithCategory = Car & { category: CarCategory | null };

@Injectable()
export class ReferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async listActiveGames(): Promise<PublicGame[]> {
    const games = await this.prisma.game.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return games.map((game) => this.toPublicGame(game));
  }

  async listCategories(gameId?: string): Promise<PublicCarCategory[]> {
    const categories = await this.prisma.carCategory.findMany({
      where: gameId ? { gameId } : undefined,
      orderBy: { name: 'asc' },
    });

    return categories.map((category) => this.toPublicCategory(category));
  }

  async listCarsForGame(gameId: string, query: ListCarsQueryDto): Promise<Paginated<PublicCar>> {
    const game = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException('Jeu introuvable.');
    }

    const where: Prisma.CarWhereInput = {
      gameId,
      isActive: true,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.car.findMany({
        where,
        include: { category: true },
        orderBy: [{ manufacturer: 'asc' }, { name: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.car.count({ where }),
    ]);

    return {
      items: items.map((car) => this.toPublicCar(car)),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async searchTracks(query: ListTracksQueryDto): Promise<Paginated<PublicTrack>> {
    const where: Prisma.TrackWhereInput = {
      isActive: true,
      ...(query.search
        ? {
            OR: [{ name: { contains: query.search } }, { layout: { contains: query.search } }],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.track.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.track.count({ where }),
    ]);

    return {
      items: items.map((track) => this.toPublicTrack(track)),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  private toPublicGame(game: Game): PublicGame {
    return {
      id: game.id,
      slug: game.slug,
      name: game.name,
      supportedExtensions: this.parseExtensions(game.supportedExtensions),
    };
  }

  private toPublicCategory(category: CarCategory): PublicCarCategory {
    return { id: category.id, gameId: category.gameId, name: category.name };
  }

  private toPublicCar(car: CarWithCategory): PublicCar {
    return {
      id: car.id,
      gameId: car.gameId,
      categoryId: car.categoryId,
      categoryName: car.category?.name ?? null,
      slug: car.slug,
      manufacturer: car.manufacturer,
      name: car.name,
    };
  }

  private toPublicTrack(track: Track): PublicTrack {
    return {
      id: track.id,
      slug: track.slug,
      name: track.name,
      layout: track.layout,
      countryCode: track.countryCode,
    };
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
