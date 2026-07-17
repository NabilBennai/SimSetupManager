import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import express from 'express';

import { createApp } from '../src/create-app';
import { findRepoRoot } from '../src/infrastructure/config/repo-root';
import { buildOpenApiDocument } from '../src/infrastructure/openapi/openapi.config';

const rootEnvPath = join(findRepoRoot(__dirname), '.env');
if (existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

async function main(): Promise<void> {
  const app = await createApp(express());
  const document = buildOpenApiDocument(app);
  const outputPath = join(__dirname, '../openapi.json');

  writeFileSync(outputPath, JSON.stringify(document, null, 2) + '\n');
  await app.close();

  console.log(`OpenAPI document généré : ${outputPath}`);
}

void main();
