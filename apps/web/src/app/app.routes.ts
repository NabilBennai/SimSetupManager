import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'setups' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
    canActivate: [authGuard],
  },
  {
    path: 'setups',
    loadComponent: () => import('./features/setups/setup-list/setup-list').then((m) => m.SetupList),
    canActivate: [authGuard],
  },
  {
    path: 'setups/new',
    loadComponent: () =>
      import('./features/setups/setup-upload/setup-upload').then((m) => m.SetupUpload),
    canActivate: [authGuard],
  },
  {
    path: 'setups/:id',
    loadComponent: () =>
      import('./features/setups/setup-detail/setup-detail').then((m) => m.SetupDetail),
    canActivate: [authGuard],
  },
];
