import { HttpClient, HttpEventType } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  AddSetupVersionPayload,
  ApiPaginatedResponse,
  ApiSuccessResponse,
  CreateSetupPayload,
  DownloadUrlResponse,
  ListSetupsQuery,
  PrepareUploadPayload,
  PrepareUploadResponse,
  PublicFileObject,
  PublicSetup,
  PublicSetupSummary,
  PublicSetupVersionSummary,
  UpdateSetupPayload,
} from '@sim-setup-manager/contracts';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../http/api-base-url';

@Injectable({ providedIn: 'root' })
export class SetupsService {
  private readonly http = inject(HttpClient);

  listSetups(query: ListSetupsQuery): Promise<ApiPaginatedResponse<PublicSetupSummary>> {
    const params: Record<string, string | number | boolean> = {};
    if (query.page !== undefined) params['page'] = query.page;
    if (query.pageSize !== undefined) params['pageSize'] = query.pageSize;
    if (query.includeArchived !== undefined) params['includeArchived'] = query.includeArchived;
    if (query.search) params['search'] = query.search;
    if (query.gameId) params['gameId'] = query.gameId;
    if (query.carId) params['carId'] = query.carId;
    if (query.trackId) params['trackId'] = query.trackId;
    if (query.sortBy) params['sortBy'] = query.sortBy;
    if (query.sortOrder) params['sortOrder'] = query.sortOrder;

    return firstValueFrom(
      this.http.get<ApiPaginatedResponse<PublicSetupSummary>>(`${API_BASE_URL}/setups`, { params }),
    );
  }

  async getSetup(id: string): Promise<PublicSetup> {
    const res = await firstValueFrom(
      this.http.get<ApiSuccessResponse<PublicSetup>>(`${API_BASE_URL}/setups/${id}`),
    );
    return res.data;
  }

  async createSetup(payload: CreateSetupPayload): Promise<PublicSetup> {
    const res = await firstValueFrom(
      this.http.post<ApiSuccessResponse<PublicSetup>>(`${API_BASE_URL}/setups`, payload),
    );
    return res.data;
  }

  async updateSetup(id: string, payload: UpdateSetupPayload): Promise<PublicSetup> {
    const res = await firstValueFrom(
      this.http.patch<ApiSuccessResponse<PublicSetup>>(`${API_BASE_URL}/setups/${id}`, payload),
    );
    return res.data;
  }

  async archiveSetup(id: string): Promise<PublicSetup> {
    const res = await firstValueFrom(
      this.http.post<ApiSuccessResponse<PublicSetup>>(`${API_BASE_URL}/setups/${id}/archive`, {}),
    );
    return res.data;
  }

  async restoreSetup(id: string): Promise<PublicSetup> {
    const res = await firstValueFrom(
      this.http.post<ApiSuccessResponse<PublicSetup>>(`${API_BASE_URL}/setups/${id}/restore`, {}),
    );
    return res.data;
  }

  async deleteSetup(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${API_BASE_URL}/setups/${id}`));
  }

  async getDownloadUrl(id: string): Promise<DownloadUrlResponse> {
    const res = await firstValueFrom(
      this.http.post<ApiSuccessResponse<DownloadUrlResponse>>(
        `${API_BASE_URL}/setups/${id}/download-url`,
        {},
      ),
    );
    return res.data;
  }

  async prepareUpload(payload: PrepareUploadPayload): Promise<PrepareUploadResponse> {
    const res = await firstValueFrom(
      this.http.post<ApiSuccessResponse<PrepareUploadResponse>>(
        `${API_BASE_URL}/uploads/prepare`,
        payload,
      ),
    );
    return res.data;
  }

  async completeUpload(uploadId: string): Promise<PublicFileObject> {
    const res = await firstValueFrom(
      this.http.post<ApiSuccessResponse<PublicFileObject>>(
        `${API_BASE_URL}/uploads/${uploadId}/complete`,
        {},
      ),
    );
    return res.data;
  }

  async listVersions(setupId: string): Promise<PublicSetupVersionSummary[]> {
    const res = await firstValueFrom(
      this.http.get<ApiSuccessResponse<PublicSetupVersionSummary[]>>(
        `${API_BASE_URL}/setups/${setupId}/versions`,
      ),
    );
    return res.data;
  }

  async addVersion(
    setupId: string,
    payload: AddSetupVersionPayload,
  ): Promise<PublicSetupVersionSummary> {
    const res = await firstValueFrom(
      this.http.post<ApiSuccessResponse<PublicSetupVersionSummary>>(
        `${API_BASE_URL}/setups/${setupId}/versions`,
        payload,
      ),
    );
    return res.data;
  }

  async setReferenceVersion(setupId: string, versionId: string): Promise<PublicSetup> {
    const res = await firstValueFrom(
      this.http.post<ApiSuccessResponse<PublicSetup>>(
        `${API_BASE_URL}/setups/${setupId}/versions/${versionId}/reference`,
        {},
      ),
    );
    return res.data;
  }

  /** PUT direct vers l'URL signée renvoyée par prepareUpload, avec suivi de progression. */
  uploadFile(uploadUrl: string, file: File, onProgress?: (percent: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http
        .put(uploadUrl, file, {
          reportProgress: true,
          observe: 'events',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
        })
        .subscribe({
          next: (event) => {
            if (event.type === HttpEventType.UploadProgress && event.total) {
              onProgress?.(Math.round((event.loaded / event.total) * 100));
            } else if (event.type === HttpEventType.Response) {
              resolve();
            }
          },
          error: reject,
        });
    });
  }
}
