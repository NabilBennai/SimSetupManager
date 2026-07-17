import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type { ApiSuccessResponse } from '@sim-setup-manager/contracts';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

import { API_BASE_URL } from '../http/api-base-url';
import type { AuthUser, LoginPayload, RegisterPayload, UpdateProfilePayload } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly _currentUser = signal<AuthUser | null>(null);
  private readonly _initializing = signal(true);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);
  readonly initializing = this._initializing.asReadonly();

  /** À appeler une fois au démarrage de l'app pour restaurer la session depuis le cookie. */
  async refreshMe(): Promise<void> {
    try {
      const user = await firstValueFrom(
        this.http
          .get<ApiSuccessResponse<AuthUser>>(`${API_BASE_URL}/auth/me`)
          .pipe(map((res) => res.data)),
      );
      this._currentUser.set(user);
    } catch {
      this._currentUser.set(null);
    } finally {
      this._initializing.set(false);
    }
  }

  async register(payload: RegisterPayload): Promise<AuthUser> {
    const user = await firstValueFrom(
      this.http
        .post<ApiSuccessResponse<AuthUser>>(`${API_BASE_URL}/auth/register`, payload)
        .pipe(map((res) => res.data)),
    );
    this._currentUser.set(user);
    return user;
  }

  async login(payload: LoginPayload): Promise<AuthUser> {
    const user = await firstValueFrom(
      this.http
        .post<ApiSuccessResponse<AuthUser>>(`${API_BASE_URL}/auth/login`, payload)
        .pipe(map((res) => res.data)),
    );
    this._currentUser.set(user);
    return user;
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post(`${API_BASE_URL}/auth/logout`, {}));
    this._currentUser.set(null);
  }

  async updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
    const user = await firstValueFrom(
      this.http
        .patch<ApiSuccessResponse<AuthUser>>(`${API_BASE_URL}/users/me`, payload)
        .pipe(map((res) => res.data)),
    );
    this._currentUser.set(user);
    return user;
  }
}
