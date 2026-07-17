import { defineConfig, env } from 'prisma/config';

try {
  process.loadEnvFile();
} catch {
  // Pas de fichier .env local (ex : CI où DATABASE_URL est déjà injectée).
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
