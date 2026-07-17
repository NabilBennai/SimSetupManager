import { createHmac, timingSafeEqual } from 'node:crypto';

export type SignedTokenPayload = Record<string, string | number> & { exp: number };

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('hex');
}

/** Jeton opaque `base64url(JSON).hex(HMAC-SHA256)` — pas de dépendance JWT pour un besoin aussi simple. */
export function signToken(payload: SignedTokenPayload, secret: string): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifyToken(token: string, secret: string): SignedTokenPayload | null {
  const separatorIndex = token.lastIndexOf('.');
  if (separatorIndex <= 0) {
    return null;
  }

  const encoded = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  const expectedSignature = sign(encoded, secret);

  const signatureBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as SignedTokenPayload;
    if (typeof payload.exp !== 'number' || payload.exp <= Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
