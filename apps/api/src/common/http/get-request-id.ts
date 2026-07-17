import type { Response } from 'express';

export function getRequestId(res: Response): string {
  const value: unknown = res.locals['requestId'];
  return typeof value === 'string' ? value : 'req_unknown';
}
