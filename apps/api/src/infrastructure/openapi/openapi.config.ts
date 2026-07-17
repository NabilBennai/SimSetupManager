import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Sim Setup Manager API')
    .setDescription('API REST versionnée — voir docs/02-specifications-techniques.md.')
    .setVersion('1.0')
    .addServer('/api/v1')
    .build();

  return SwaggerModule.createDocument(app, config);
}

/**
 * Monté sur /docs, hors du préfixe /api/v1. Désactivé par défaut en
 * production (critère de fin FND-08 : "hors production publique ou
 * protégé"), activable explicitement via SWAGGER_ENABLED=true.
 */
export function mountSwaggerUi(app: INestApplication): void {
  const isProduction = process.env['NODE_ENV'] === 'production';
  const explicitlyEnabled = process.env['SWAGGER_ENABLED'] === 'true';

  if (isProduction && !explicitlyEnabled) {
    return;
  }

  SwaggerModule.setup('docs', app, buildOpenApiDocument(app));
}
