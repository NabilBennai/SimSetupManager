import type { PublicFileObject } from './uploads';

export type SetupSortBy = 'updatedAt' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

export interface ListSetupsQuery {
  page?: number;
  pageSize?: number;
  includeArchived?: boolean;
  search?: string;
  gameId?: string;
  carId?: string;
  trackId?: string;
  sortBy?: SetupSortBy;
  sortOrder?: SortOrder;
}

export interface PublicSetupSummary {
  id: string;
  title: string;
  gameId: string;
  gameName: string;
  carId: string;
  carName: string;
  trackId: string;
  trackName: string;
  tags: string[];
  isArchived: boolean;
  updatedAt: string;
}

export interface PublicSetupVersionSummary {
  id: string;
  versionNumber: number;
  changeNotes: string | null;
  createdAt: string;
  authorDisplayName: string;
  isReference: boolean;
  file: PublicFileObject;
}

export interface AddSetupVersionPayload {
  fileId: string;
  changeNotes?: string;
}

export interface PublicSetup {
  id: string;
  ownerId: string;
  title: string;
  descriptionPublic: string | null;
  notesPrivate: string | null;
  visibility: string;
  sessionType: string | null;
  weather: string | null;
  trackTemperatureC: number | null;
  airTemperatureC: number | null;
  gameVersion: string | null;
  isArchived: boolean;
  gameId: string;
  gameName: string;
  carId: string;
  carName: string;
  trackId: string;
  trackName: string;
  tags: string[];
  referenceVersion: PublicSetupVersionSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSetupPayload {
  title: string;
  gameId: string;
  carId: string;
  trackId: string;
  fileId: string;
  descriptionPublic?: string;
  notesPrivate?: string;
  sessionType?: string;
  weather?: string;
  trackTemperatureC?: number;
  airTemperatureC?: number;
  gameVersion?: string;
  tags?: string[];
}

export interface UpdateSetupPayload {
  title?: string;
  descriptionPublic?: string;
  notesPrivate?: string;
  sessionType?: string;
  weather?: string;
  trackTemperatureC?: number;
  airTemperatureC?: number;
  gameVersion?: string;
  tags?: string[];
}

export interface DownloadUrlResponse {
  downloadUrl: string;
  expiresAt: string;
  originalName: string;
}
