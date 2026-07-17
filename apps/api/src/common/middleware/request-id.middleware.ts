import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Reprend le `x-request-id` entrant (utile derrière un proxy/edge qui en
 * génère déjà un) ou en crée un nouveau. Stocké dans `res.locals` plutôt que
 * sur `req` pour éviter d'augmenter les types Express globalement.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  const requestId =
    typeof incoming === 'string' && incoming.length > 0 ? incoming : `req_${randomUUID()}`;

  res.locals['requestId'] = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}
