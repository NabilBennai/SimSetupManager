import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { ApiPaginatedResponse, ApiSuccessResponse } from '@sim-setup-manager/contracts';
import { isPaginated } from '@sim-setup-manager/contracts';
import type { Response } from 'express';
import { Observable, map } from 'rxjs';

import { getRequestId } from '../http/get-request-id';

type WrappedResponse<T> = ApiSuccessResponse<T> | ApiPaginatedResponse<unknown>;

/**
 * Enveloppe toute réponse de succès dans `{ data, meta }` (voir
 * docs/02-specifications-techniques.md §2.4). Un cas d'utilisation qui
 * retourne un `Paginated<T>` (packages/contracts) obtient automatiquement le
 * `meta` de pagination.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, WrappedResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<WrappedResponse<T>> {
    const response = context.switchToHttp().getResponse<Response>();
    const requestId = getRequestId(response);

    return next.handle().pipe(
      map((payload) => {
        if (isPaginated(payload)) {
          const { items, page, pageSize, total } = payload;
          return {
            data: items,
            meta: { requestId, page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
          };
        }

        return { data: payload, meta: { requestId } };
      }),
    );
  }
}
