import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { AuthService } from '../auth.service';
import { SESSION_COOKIE_NAME } from '../cookie.util';
import { setCurrentUser } from '../current-user.util';

/** Attache l'utilisateur courant à la requête via `setCurrentUser` (voir current-user.util.ts). */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token: unknown = request.cookies?.[SESSION_COOKIE_NAME];

    if (typeof token !== 'string' || token.length === 0) {
      throw new UnauthorizedException('Authentification requise.');
    }

    const user = await this.authService.getUserForToken(token);
    if (!user) {
      throw new UnauthorizedException('Session invalide ou expirée.');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Ce compte est suspendu.');
    }

    setCurrentUser(request, user);
    return true;
  }
}
