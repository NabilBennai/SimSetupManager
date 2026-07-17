import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PublicUser } from '@sim-setup-manager/contracts';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import type { User } from '../../infrastructure/database/generated/client';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Modifie le pseudonyme et/ou les préférences du profil courant.' })
  async updateMe(@CurrentUser() user: User, @Body() dto: UpdateProfileDto): Promise<PublicUser> {
    const updated = await this.usersService.updateProfile(user.id, dto);
    return this.usersService.toPublicUser(updated);
  }
}
