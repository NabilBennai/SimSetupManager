import { Module } from '@nestjs/common';
import type { Response } from 'express';
import { LoggerModule } from 'nestjs-pino';
import type { Options } from 'pino-http';

/** `res.locals` est une extension Express absente du type `ServerResponse` de base. */
function readRequestId(res: object): string {
  const requestId: unknown = (res as Response).locals['requestId'];
  return typeof requestId === 'string' ? requestId : 'req_unknown';
}

/**
 * Logs JSON structurés (route, durée, statut, requestId) via nestjs-pino.
 * `genReqId` réutilise le `requestId` déjà posé par
 * `common/middleware/request-id.middleware.ts` sur `res.locals`, pour que le
 * même identifiant apparaisse dans les logs et dans `meta.requestId` de la
 * réponse (traçabilité de bout en bout, critère de fin FND-07).
 */
const pinoHttpOptions: Options = {
  level: process.env['LOG_LEVEL'] ?? 'info',
  genReqId: (_req, res) => readRequestId(res),
  customProps: (req) => ({ requestId: req.id }),
  redact: ['req.headers.authorization', 'req.headers.cookie'],
  serializers: {
    req: (req) => ({ method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) {
      return 'error';
    }
    if (res.statusCode >= 400) {
      return 'warn';
    }
    return 'info';
  },
};

@Module({
  imports: [LoggerModule.forRoot({ pinoHttp: pinoHttpOptions })],
  exports: [LoggerModule],
})
export class ObservabilityModule {}
