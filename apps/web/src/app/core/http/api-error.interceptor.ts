import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import type { ApiErrorResponse } from '@sim-setup-manager/contracts';
import { catchError, throwError } from 'rxjs';

import { ErrorNotificationService } from '../error-handling/error-notification.service';

/**
 * Lit l'enveloppe d'erreur API (docs/02-specifications-techniques.md §2.4) et
 * la transforme en message affichable, sans jamais avaler l'erreur : elle est
 * toujours retransmise pour que l'appelant garde le contrôle (retry, etc.).
 */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorNotification = inject(ErrorNotificationService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const body = error.error as Partial<ApiErrorResponse> | null;

        if (body?.error) {
          errorNotification.notify({
            code: body.error.code,
            message: body.error.message,
            requestId: body.meta?.requestId,
          });
        } else {
          errorNotification.notify({
            code: 'NETWORK_ERROR',
            message: 'Une erreur réseau est survenue.',
          });
        }
      }

      return throwError(() => error);
    }),
  );
};
