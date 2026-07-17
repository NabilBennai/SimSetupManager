import { randomBytes, createHash } from 'node:crypto';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import type { User } from '../../infrastructure/database/generated/client';
import { UsersService, type CreateUserInput } from '../users/users.service';
import { sessionExpiresAt } from './cookie.util';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async register(input: CreateUserInput): Promise<User> {
    const existing = await this.usersService.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }

    return this.usersService.create(input);
  }

  async validateCredentials(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);
    const genericError = new UnauthorizedException('Email ou mot de passe incorrect.');

    if (!user) {
      // Toujours comparer un hash pour ne pas laisser fuiter, par le
      // timing de la réponse, l'existence ou non du compte.
      await bcrypt.compare(password, '$2b$12$invalidsaltinvalidsaltinvalidsal');
      throw genericError;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw genericError;
    }

    return user;
  }

  /** Retourne le token en clair (à poser en cookie) ; seul son hash est stocké. */
  async createSession(userId: string, userAgent?: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');

    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt: sessionExpiresAt(),
        userAgent,
      },
    });

    return token;
  }

  async destroySession(token: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  /** Session absente/expirée -> null (au guard de décider 401 vs 403). */
  async getUserForToken(token: string): Promise<User | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });

    if (!session || session.expiresAt.getTime() <= Date.now()) {
      return null;
    }

    return session.user;
  }

  hashToken(token: string): string {
    return hashToken(token);
  }
}
