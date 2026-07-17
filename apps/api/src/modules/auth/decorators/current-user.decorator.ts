import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { User } from '../../../infrastructure/database/generated/client';
import { getCurrentUser } from '../current-user.util';

/** N'est valide que sur une route protégée par `SessionAuthGuard`, qui pose l'utilisateur courant. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): User => {
  const request = ctx.switchToHttp().getRequest<Request>();
  return getCurrentUser(request) as User;
});
