import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = {
    session: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const usersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(prisma as never, usersService as never);
  });

  describe('register', () => {
    it('refuse un email déjà utilisé', async () => {
      usersService.findByEmail.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({ email: 'a@b.com', password: 'password123', displayName: 'A' }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(usersService.create).not.toHaveBeenCalled();
    });

    it("crée le compte si l'email est libre", async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue({ id: 'new-user' });

      const input = { email: 'a@b.com', password: 'password123', displayName: 'A' };
      const result = await service.register(input);

      expect(usersService.create).toHaveBeenCalledWith(input);
      expect(result).toEqual({ id: 'new-user' });
    });
  });

  describe('validateCredentials', () => {
    it('rejette un email inconnu avec un message générique', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.validateCredentials('a@b.com', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejette un mot de passe incorrect', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 4);
      usersService.findByEmail.mockResolvedValue({ id: 'u1', passwordHash });

      await expect(service.validateCredentials('a@b.com', 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("retourne l'utilisateur si le mot de passe est correct", async () => {
      const passwordHash = await bcrypt.hash('correct-password', 4);
      const user = { id: 'u1', passwordHash };
      usersService.findByEmail.mockResolvedValue(user);

      const result = await service.validateCredentials('a@b.com', 'correct-password');

      expect(result).toBe(user);
    });
  });

  describe('createSession / getUserForToken', () => {
    it('crée une session dont seul le hash du token est stocké', async () => {
      prisma.session.create.mockResolvedValue({});

      const token = await service.createSession('u1', 'jest-agent');

      expect(prisma.session.create).toHaveBeenCalledTimes(1);
      const args = prisma.session.create.mock.calls[0][0];
      expect(args.data.userId).toBe('u1');
      expect(args.data.userAgent).toBe('jest-agent');
      expect(args.data.tokenHash).toBe(service.hashToken(token));
      expect(args.data.tokenHash).not.toBe(token);
    });

    it('retourne null si la session est introuvable', async () => {
      prisma.session.findUnique.mockResolvedValue(null);

      const result = await service.getUserForToken('unknown-token');

      expect(result).toBeNull();
    });

    it('retourne null si la session est expirée', async () => {
      prisma.session.findUnique.mockResolvedValue({
        expiresAt: new Date(Date.now() - 1000),
        user: { id: 'u1' },
      });

      const result = await service.getUserForToken('expired-token');

      expect(result).toBeNull();
    });

    it("retourne l'utilisateur si la session est valide", async () => {
      const user = { id: 'u1' };
      prisma.session.findUnique.mockResolvedValue({
        expiresAt: new Date(Date.now() + 1000 * 60),
        user,
      });

      const result = await service.getUserForToken('valid-token');

      expect(result).toBe(user);
    });
  });

  describe('destroySession', () => {
    it('supprime la session par son hash', async () => {
      await service.destroySession('some-token');

      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { tokenHash: service.hashToken('some-token') },
      });
    });
  });
});
