import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { AuthService } from './core/auth/auth.service';
import { apiErrorInterceptor } from './core/http/api-error.interceptor';
import { withCredentialsInterceptor } from './core/http/with-credentials.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([withCredentialsInterceptor, apiErrorInterceptor])),
    provideAppInitializer(() => inject(AuthService).refreshMe()),
  ],
};
