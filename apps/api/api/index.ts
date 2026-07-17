import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import express from 'express';
import { createApp } from '../src/create-app';
import { findRepoRoot } from '../src/infrastructure/config/repo-root';

const rootEnvPath = join(findRepoRoot(__dirname), '.env');
if (existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

const expressInstance = express();
let readyPromise: Promise<void> | undefined;

async function ensureReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = createApp(expressInstance).then(async (app) => {
      await app.init();
    });
  }
  await readyPromise;
}

/**
 * Handler serverless Vercel Functions : conserve l'instance Nest/Express
 * entre invocations d'une même fonction chaude, sans serveur HTTP permanent
 * (conforme à ADR-009, compatibilité serverless).
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await ensureReady();
  expressInstance(req, res);
}
