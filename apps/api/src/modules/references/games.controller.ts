import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Paginated, PublicCar, PublicGame } from '@sim-setup-manager/contracts';

import { ListCarsQueryDto } from './dto/list-cars-query.dto';
import { ReferencesService } from './references.service';

@ApiTags('references')
@Controller()
export class GamesController {
  constructor(private readonly referencesService: ReferencesService) {}

  @Get('games')
  @ApiOperation({ summary: 'Liste les jeux actifs.' })
  listGames(): Promise<PublicGame[]> {
    return this.referencesService.listActiveGames();
  }

  @Get('games/:gameId/cars')
  @ApiOperation({ summary: 'Liste les voitures actives disponibles pour un jeu.' })
  listCars(
    @Param('gameId') gameId: string,
    @Query() query: ListCarsQueryDto,
  ): Promise<Paginated<PublicCar>> {
    return this.referencesService.listCarsForGame(gameId, query);
  }
}
