import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PublicUser } from '@sim-setup-manager/contracts';
import type { Request, Response } from 'express';

import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { clearSessionCookie, SESSION_COOKIE_NAME, setSessionCookie } from './cookie.util';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SessionAuthGuard } from './guards/session-auth.guard';
import type { User } from '../../infrastructure/database/generated/client';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Crée un compte et ouvre une session.' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicUser> {
    const user = await this.authService.register(dto);
    const token = await this.authService.createSession(user.id, req.get('user-agent'));
    setSessionCookie(res, token);
    return this.usersService.toPublicUser(user);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Ouvre une session à partir des identifiants.' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicUser> {
    const user = await this.authService.validateCredentials(dto.email, dto.password);
    const token = await this.authService.createSession(user.id, req.get('user-agent'));
    setSessionCookie(res, token);
    return this.usersService.toPublicUser(user);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Ferme la session courante.' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ loggedOut: true }> {
    const token: unknown = req.cookies?.[SESSION_COOKIE_NAME];
    if (typeof token === 'string' && token.length > 0) {
      await this.authService.destroySession(token);
    }
    clearSessionCookie(res);
    return { loggedOut: true };
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: "Retourne l'utilisateur de la session courante." })
  me(@CurrentUser() user: User): PublicUser {
    return this.usersService.toPublicUser(user);
  }
}
