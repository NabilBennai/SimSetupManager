import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';

import { SESSION_COOKIE_NAME } from '../cookie.util';
import { getCurrentUser } from '../current-user.util';
import { SessionAuthGuard } from './session-auth.guard';

function createContext(cookies: Record<string, string>): {
  context: ExecutionContext;
  request: object;
} {
  const request = { cookies };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  return { context, request };
}

describe('SessionAuthGuard', () => {
  const authService = { getUserForToken: jest.fn() };
  let guard: SessionAuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new SessionAuthGuard(authService as never);
  });

  it("rejette en 401 quand aucun cookie de session n'est présent", async () => {
    const { context } = createContext({});

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authService.getUserForToken).not.toHaveBeenCalled();
  });

  it('rejette en 401 quand le token ne correspond à aucune session valide', async () => {
    authService.getUserForToken.mockResolvedValue(null);
    const { context } = createContext({ [SESSION_COOKIE_NAME]: 'bad-token' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejette en 403 quand le compte est suspendu', async () => {
    authService.getUserForToken.mockResolvedValue({ id: 'u1', status: 'SUSPENDED' });
    const { context } = createContext({ [SESSION_COOKIE_NAME]: 'good-token' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("autorise et attache l'utilisateur quand la session est valide et le compte actif", async () => {
    const user = { id: 'u1', status: 'ACTIVE' };
    authService.getUserForToken.mockResolvedValue(user);
    const { context, request } = createContext({ [SESSION_COOKIE_NAME]: 'good-token' });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(getCurrentUser(request as never)).toBe(user);
  });
});
