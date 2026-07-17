import type { Request } from 'express';

import type { User } from '../../infrastructure/database/generated/client';

type RequestWithUser = Request & { user?: User };

/** Évite d'augmenter globalement les types Express (même logique que res.locals ailleurs). */
export function setCurrentUser(req: Request, user: User): void {
  (req as RequestWithUser).user = user;
}

export function getCurrentUser(req: Request): User | undefined {
  return (req as RequestWithUser).user;
}
