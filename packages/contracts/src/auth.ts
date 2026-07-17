/**
 * Rôles et statuts de compte : String côté Prisma (SQLite/Turso ne supporte
 * pas les enums natifs), validés côté application via ces unions.
 */
export type UserRole = 'MEMBER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';

/** Forme exposée par l'API — ne contient jamais passwordHash. */
export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  preferences: Record<string, unknown>;
  createdAt: string;
}
