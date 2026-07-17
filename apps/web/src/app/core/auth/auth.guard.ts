import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/**
 * UX uniquement (redirection vers /login) — la sécurité réelle est appliquée
 * côté API par SessionAuthGuard (docs/03-architecture-logicielle.md §3.4).
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
