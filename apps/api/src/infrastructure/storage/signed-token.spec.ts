import { signToken, verifyToken } from './signed-token';

describe('signed-token', () => {
  const secret = 'test-secret';

  it('vérifie un jeton valide et retourne son payload', () => {
    const token = signToken({ storageKey: 'abc.sto', exp: Date.now() + 60_000 }, secret);

    const result = verifyToken(token, secret);

    expect(result).toEqual(expect.objectContaining({ storageKey: 'abc.sto' }));
  });

  it('rejette un jeton expiré', () => {
    const token = signToken({ storageKey: 'abc.sto', exp: Date.now() - 1000 }, secret);

    expect(verifyToken(token, secret)).toBeNull();
  });

  it('rejette un jeton signé avec un autre secret', () => {
    const token = signToken({ storageKey: 'abc.sto', exp: Date.now() + 60_000 }, 'other-secret');

    expect(verifyToken(token, secret)).toBeNull();
  });

  it('rejette un jeton altéré', () => {
    const token = signToken({ storageKey: 'abc.sto', exp: Date.now() + 60_000 }, secret);
    const tampered = token.replace(/.$/, token.endsWith('a') ? 'b' : 'a');

    expect(verifyToken(tampered, secret)).toBeNull();
  });

  it('rejette une chaîne qui ne ressemble pas à un jeton', () => {
    expect(verifyToken('not-a-token', secret)).toBeNull();
  });
});
