import type { Response } from 'express';

export const SESSION_COOKIE_NAME = 'ssm_session';

function sessionTtlMs(): number {
  const days = Number(process.env['SESSION_TTL_DAYS'] ?? '30');
  return (Number.isFinite(days) && days > 0 ? days : 30) * 24 * 60 * 60 * 1000;
}

export function sessionExpiresAt(): Date {
  return new Date(Date.now() + sessionTtlMs());
}

/**
 * En production, app et api sont sur des domaines différents (docs/04 §4.9),
 * ce qui exige SameSite=None (+ Secure). En local, les deux tournent sur
 * localhost (ports différents mais même "site"), Lax suffit et évite
 * d'exiger HTTPS en développement.
 */
export function setSessionCookie(res: Response, token: string): void {
  const isProduction = process.env['NODE_ENV'] === 'production';

  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: sessionTtlMs(),
  });
}

export function clearSessionCookie(res: Response): void {
  const isProduction = process.env['NODE_ENV'] === 'production';

  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  });
}
