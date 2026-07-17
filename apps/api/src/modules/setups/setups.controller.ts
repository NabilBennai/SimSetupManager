import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  DownloadUrlResponse,
  Paginated,
  PublicSetup,
  PublicSetupSummary,
} from '@sim-setup-manager/contracts';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import type { User } from '../../infrastructure/database/generated/client';
import { CreateSetupDto } from './dto/create-setup.dto';
import { ListSetupsQueryDto } from './dto/list-setups-query.dto';
import { UpdateSetupDto } from './dto/update-setup.dto';
import { SetupsService } from './setups.service';

@ApiTags('setups')
@ApiCookieAuth()
@UseGuards(SessionAuthGuard)
@Controller('setups')
export class SetupsController {
  constructor(private readonly setupsService: SetupsService) {}

  @Post()
  @ApiOperation({ summary: "Crée une fiche de setup à partir d'un fichier validé." })
  create(@CurrentUser() user: User, @Body() dto: CreateSetupDto): Promise<PublicSetup> {
    return this.setupsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Liste les setups du propriétaire courant.' })
  list(
    @CurrentUser() user: User,
    @Query() query: ListSetupsQueryDto,
  ): Promise<Paginated<PublicSetupSummary>> {
    return this.setupsService.listForOwner(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'un setup (propriétaire uniquement)." })
  get(@CurrentUser() user: User, @Param('id') id: string): Promise<PublicSetup> {
    return this.setupsService.getForOwner(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Modifie les métadonnées d'un setup." })
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateSetupDto,
  ): Promise<PublicSetup> {
    return this.setupsService.update(user.id, id, dto);
  }

  @Post(':id/archive')
  @HttpCode(200)
  @ApiOperation({ summary: 'Archive un setup (exclu de la liste par défaut).' })
  archive(@CurrentUser() user: User, @Param('id') id: string): Promise<PublicSetup> {
    return this.setupsService.setArchived(user.id, id, true);
  }

  @Post(':id/restore')
  @HttpCode(200)
  @ApiOperation({ summary: 'Restaure un setup archivé.' })
  restore(@CurrentUser() user: User, @Param('id') id: string): Promise<PublicSetup> {
    return this.setupsService.setArchived(user.id, id, false);
  }

  @Post(':id/download-url')
  @HttpCode(200)
  @ApiOperation({ summary: 'Génère une URL de téléchargement privée à courte durée.' })
  downloadUrl(@CurrentUser() user: User, @Param('id') id: string): Promise<DownloadUrlResponse> {
    return this.setupsService.createDownloadUrl(user.id, id);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Supprime (logiquement) un setup.' })
  async remove(@CurrentUser() user: User, @Param('id') id: string): Promise<{ deleted: true }> {
    await this.setupsService.softDelete(user.id, id);
    return { deleted: true };
  }
}
