import { existsSync } from 'node:fs';
import { join } from 'node:path';
import express from 'express';
import { createApp } from './create-app';
import { findRepoRoot } from './infrastructure/config/repo-root';

const rootEnvPath = join(findRepoRoot(__dirname), '.env');
if (existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

async function bootstrap() {
  const app = await createApp(express());
  await app.listen(process.env['PORT'] ?? 3000);
}
void bootstrap();
