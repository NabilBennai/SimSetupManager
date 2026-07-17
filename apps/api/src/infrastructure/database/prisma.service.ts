import { isAbsolute, resolve } from 'node:path';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaLibSql } from '@prisma/adapter-libsql';

import { findRepoRoot } from '../config/repo-root';
import { PrismaClient } from './generated/client';

/**
 * `DATABASE_URL=file:./prisma/local.db` est relatif à la racine du repo, pas
 * au cwd du processus (qui varie entre `pnpm --filter api` et `turbo`).
 * Les URLs Turso (`libsql://...`) sont retournées telles quelles.
 */
function resolveDatabaseUrl(rawUrl: string): string {
  if (!rawUrl.startsWith('file:')) {
    return rawUrl;
  }

  const relativePath = rawUrl.slice('file:'.length);
  if (isAbsolute(relativePath)) {
    return rawUrl;
  }

  const repoRoot = findRepoRoot(__dirname);
  return `file:${resolve(repoRoot, relativePath)}`;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const rawUrl = process.env['DATABASE_URL'];
    if (!rawUrl) {
      throw new Error('DATABASE_URL est requis pour se connecter à la base de données.');
    }

    super({
      adapter: new PrismaLibSql({
        url: resolveDatabaseUrl(rawUrl),
        authToken: process.env['TURSO_AUTH_TOKEN'],
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connexion à la base de données établie.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
