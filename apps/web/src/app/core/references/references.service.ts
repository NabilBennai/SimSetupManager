import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  ApiPaginatedResponse,
  ApiSuccessResponse,
  PublicCar,
  PublicGame,
  PublicTrack,
} from '@sim-setup-manager/contracts';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

import { API_BASE_URL } from '../http/api-base-url';

@Injectable({ providedIn: 'root' })
export class ReferencesService {
  private readonly http = inject(HttpClient);

  listGames(): Promise<PublicGame[]> {
    return firstValueFrom(
      this.http
        .get<ApiSuccessResponse<PublicGame[]>>(`${API_BASE_URL}/games`)
        .pipe(map((res) => res.data)),
    );
  }

  listCars(gameId: string, pageSize = 100): Promise<PublicCar[]> {
    return firstValueFrom(
      this.http
        .get<ApiPaginatedResponse<PublicCar>>(`${API_BASE_URL}/games/${gameId}/cars`, {
          params: { pageSize },
        })
        .pipe(map((res) => res.data)),
    );
  }

  searchTracks(search: string, pageSize = 20): Promise<PublicTrack[]> {
    return firstValueFrom(
      this.http
        .get<ApiPaginatedResponse<PublicTrack>>(`${API_BASE_URL}/tracks`, {
          params: search ? { search, pageSize } : { pageSize },
        })
        .pipe(map((res) => res.data)),
    );
  }
}
