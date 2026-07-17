import type { PublicUser } from '@sim-setup-manager/contracts';

export type AuthUser = PublicUser;

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  displayName?: string;
  preferences?: Record<string, unknown>;
}
