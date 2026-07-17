import { Injectable } from '@nestjs/common';
import type { PublicUser, UserRole, UserStatus } from '@sim-setup-manager/contracts';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import type { User } from '../../infrastructure/database/generated/client';

const BCRYPT_SALT_ROUNDS = 12;

export interface CreateUserInput {
  email: string;
  password: string;
  displayName: string;
}

export interface UpdateProfileInput {
  displayName?: string;
  preferences?: Record<string, unknown>;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(input: CreateUserInput): Promise<User> {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);

    return this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        displayName: input.displayName,
      },
    });
  }

  updateProfile(id: string, input: UpdateProfileInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.preferences !== undefined
          ? { preferences: JSON.stringify(input.preferences) }
          : {}),
      },
    });
  }

  toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role as UserRole,
      status: user.status as UserStatus,
      preferences: this.parsePreferences(user.preferences),
      createdAt: user.createdAt.toISOString(),
    };
  }

  private parsePreferences(raw: string): Record<string, unknown> {
    try {
      const parsed: unknown = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
}
