import { Injectable, signal } from '@angular/core';

export interface UserFacingError {
  code: string;
  message: string;
  requestId?: string;
}

/**
 * Point d'accès unique aux erreurs API pour l'interface : l'intercepteur HTTP
 * (`core/http/api-error.interceptor.ts`) y pousse les erreurs, les
 * composants lisent `lastError` (Signal) pour les afficher.
 */
@Injectable({ providedIn: 'root' })
export class ErrorNotificationService {
  private readonly _lastError = signal<UserFacingError | null>(null);
  readonly lastError = this._lastError.asReadonly();

  notify(error: UserFacingError): void {
    this._lastError.set(error);
  }

  clear(): void {
    this._lastError.set(null);
  }
}
