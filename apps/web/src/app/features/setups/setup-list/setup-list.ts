import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type {
  PublicCar,
  PublicGame,
  PublicSetupSummary,
  PublicTrack,
  SetupSortBy,
  SortOrder,
} from '@sim-setup-manager/contracts';

import { ErrorNotificationService } from '../../../core/error-handling/error-notification.service';
import { ReferencesService } from '../../../core/references/references.service';
import { SetupsService } from '../../../core/setups/setups.service';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-setup-list',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule],
  templateUrl: './setup-list.html',
  styleUrl: './setup-list.scss',
})
export class SetupList {
  private readonly setupsService = inject(SetupsService);
  private readonly referencesService = inject(ReferencesService);
  private readonly errorNotification = inject(ErrorNotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  // L'URL est la source de vérité des filtres (SRC-05) : partage de lien et
  // retour navigateur fonctionnent sans état caché côté composant.
  protected readonly search = computed(() => this.queryParams().get('search') ?? '');
  protected readonly gameId = computed(() => this.queryParams().get('gameId') ?? '');
  protected readonly carId = computed(() => this.queryParams().get('carId') ?? '');
  protected readonly trackId = computed(() => this.queryParams().get('trackId') ?? '');
  protected readonly sortBy = computed(
    () => (this.queryParams().get('sortBy') as SetupSortBy) || 'updatedAt',
  );
  protected readonly sortOrder = computed(
    () => (this.queryParams().get('sortOrder') as SortOrder) || 'desc',
  );
  protected readonly page = computed(() => Number(this.queryParams().get('page') ?? '1'));
  protected readonly includeArchived = computed(
    () => this.queryParams().get('includeArchived') === 'true',
  );

  protected readonly searchInput = signal('');

  protected readonly games = signal<PublicGame[]>([]);
  protected readonly cars = signal<PublicCar[]>([]);
  protected readonly trackQuery = signal('');
  protected readonly trackResults = signal<PublicTrack[]>([]);

  protected readonly setups = signal<PublicSetupSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly error = this.errorNotification.lastError;

  constructor() {
    void this.referencesService.listGames().then((games) => this.games.set(games));

    effect(() => {
      this.searchInput.set(this.search());
    });

    effect(() => {
      const gameId = this.gameId();
      if (gameId) {
        void this.referencesService.listCars(gameId).then((cars) => this.cars.set(cars));
      } else {
        this.cars.set([]);
      }
    });

    effect(() => {
      void this.load();
    });
  }

  private async load(): Promise<void> {
    this.errorNotification.clear();
    this.loading.set(true);
    try {
      const res = await this.setupsService.listSetups({
        page: this.page(),
        pageSize: PAGE_SIZE,
        includeArchived: this.includeArchived(),
        search: this.search() || undefined,
        gameId: this.gameId() || undefined,
        carId: this.carId() || undefined,
        trackId: this.trackId() || undefined,
        sortBy: this.sortBy(),
        sortOrder: this.sortOrder(),
      });
      this.setups.set(res.data);
      this.total.set(res.meta.total);
      this.totalPages.set(res.meta.totalPages);
    } catch {
      // le message est déjà exposé via ErrorNotificationService (apiErrorInterceptor)
    } finally {
      this.loading.set(false);
    }
  }

  private updateQueryParams(patch: Record<string, string | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: patch,
      queryParamsHandling: 'merge',
    });
  }

  onSearchSubmit(): void {
    this.updateQueryParams({ search: this.searchInput() || null, page: null });
  }

  onGameFilterChange(value: string): void {
    this.updateQueryParams({ gameId: value || null, carId: null, page: null });
  }

  onCarFilterChange(value: string): void {
    this.updateQueryParams({ carId: value || null, page: null });
  }

  async onTrackQueryChange(value: string): Promise<void> {
    this.trackQuery.set(value);
    if (value.trim().length < 2) {
      this.trackResults.set([]);
      return;
    }
    this.trackResults.set(await this.referencesService.searchTracks(value));
  }

  selectTrackFilter(track: PublicTrack): void {
    this.trackQuery.set(track.layout ? `${track.name} — ${track.layout}` : track.name);
    this.trackResults.set([]);
    this.updateQueryParams({ trackId: track.id, page: null });
  }

  clearTrackFilter(): void {
    this.trackQuery.set('');
    this.updateQueryParams({ trackId: null, page: null });
  }

  onSortChange(value: string): void {
    const [sortBy, sortOrder] = value.split(':');
    this.updateQueryParams({ sortBy: sortBy ?? null, sortOrder: sortOrder ?? null, page: null });
  }

  toggleIncludeArchived(): void {
    this.updateQueryParams({ includeArchived: this.includeArchived() ? null : 'true', page: null });
  }

  goToPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.totalPages()) {
      return;
    }
    this.updateQueryParams({ page: String(nextPage) });
  }

  clearFilters(): void {
    this.searchInput.set('');
    this.trackQuery.set('');
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }
}
