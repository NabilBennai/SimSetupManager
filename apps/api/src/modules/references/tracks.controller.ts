import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Paginated, PublicTrack } from '@sim-setup-manager/contracts';

import { ListTracksQueryDto } from './dto/list-tracks-query.dto';
import { ReferencesService } from './references.service';

@ApiTags('references')
@Controller('tracks')
export class TracksController {
  constructor(private readonly referencesService: ReferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Recherche les circuits actifs par nom ou variante.' })
  list(@Query() query: ListTracksQueryDto): Promise<Paginated<PublicTrack>> {
    return this.referencesService.searchTracks(query);
  }
}
