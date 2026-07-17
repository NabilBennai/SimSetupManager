import { HttpInterceptorFn } from '@angular/common/http';

/** Nécessaire pour que le cookie de session (httpOnly) soit envoyé/reçu en cross-origin dev. */
export const withCredentialsInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req.clone({ withCredentials: true }));
};
