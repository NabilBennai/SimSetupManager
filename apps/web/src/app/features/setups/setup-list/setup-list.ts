import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { PublicSetupSummary } from '@sim-setup-manager/contracts';

import { ErrorNotificationService } from '../../../core/error-handling/error-notification.service';
import { SetupsService } from '../../../core/setups/setups.service';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-setup-list',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './setup-list.html',
  styleUrl: './setup-list.scss',
})
export class SetupList {
  private readonly setupsService = inject(SetupsService);
  private readonly errorNotification = inject(ErrorNotificationService);

  protected readonly setups = signal<PublicSetupSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = this.errorNotification.lastError;
  protected readonly page = signal(1);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly includeArchived = signal(false);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.errorNotification.clear();
    this.loading.set(true);
    try {
      const res = await this.setupsService.listSetups(
        this.page(),
        PAGE_SIZE,
        this.includeArchived(),
      );
      this.setups.set(res.data);
      this.total.set(res.meta.total);
      this.totalPages.set(res.meta.totalPages);
    } catch {
      // le message est déjà exposé via ErrorNotificationService (apiErrorInterceptor)
    } finally {
      this.loading.set(false);
    }
  }

  async toggleIncludeArchived(): Promise<void> {
    this.includeArchived.set(!this.includeArchived());
    this.page.set(1);
    await this.load();
  }

  async goToPage(nextPage: number): Promise<void> {
    if (nextPage < 1 || nextPage > this.totalPages()) {
      return;
    }
    this.page.set(nextPage);
    await this.load();
  }
}
