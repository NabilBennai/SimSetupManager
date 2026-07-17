import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiErrorResponse } from '@sim-setup-manager/contracts';
import type { Request, Response } from 'express';

import { getRequestId } from '../http/get-request-id';

interface NormalizedError {
  code: string;
  message: string;
  details: unknown[];
}

/**
 * Traduit toute exception (Nest ou inattendue) vers l'enveloppe d'erreur
 * définie dans docs/02-specifications-techniques.md §2.4.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const { code, message, details } = this.normalize(exception, status);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ApiErrorResponse = {
      error: { code, message, details },
      meta: { requestId: getRequestId(response) },
    };

    response.status(status).json(body);
  }

  private normalize(exception: unknown, status: number): NormalizedError {
    if (exception instanceof HttpException) {
      const payload: unknown = exception.getResponse();

      if (typeof payload === 'string') {
        return { code: this.codeFromStatus(status), message: payload, details: [] };
      }

      if (typeof payload === 'object' && payload !== null) {
        const record = payload as Record<string, unknown>;
        const rawMessage = record['message'];
        const message = typeof rawMessage === 'string' ? rawMessage : exception.message;
        const details = Array.isArray(rawMessage) ? rawMessage : [];
        const code =
          typeof record['code'] === 'string' ? record['code'] : this.codeFromStatus(status);
        return { code, message, details };
      }
    }

    return {
      code: this.codeFromStatus(status),
      message: 'Une erreur inattendue est survenue.',
      details: [],
    };
  }

  private codeFromStatus(status: number): string {
    const name: unknown = HttpStatus[status];
    return typeof name === 'string' ? name : 'INTERNAL_SERVER_ERROR';
  }
}
