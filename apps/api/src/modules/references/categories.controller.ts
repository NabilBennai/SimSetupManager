import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PublicCarCategory } from '@sim-setup-manager/contracts';

import { ListCategoriesQueryDto } from './dto/list-categories-query.dto';
import { ReferencesService } from './references.service';

@ApiTags('references')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly referencesService: ReferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Liste les catégories de voitures, filtrable par jeu.' })
  list(@Query() query: ListCategoriesQueryDto): Promise<PublicCarCategory[]> {
    return this.referencesService.listCategories(query.gameId);
  }
}
