import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type { PublicSetup } from '@sim-setup-manager/contracts';

import { ErrorNotificationService } from '../../../core/error-handling/error-notification.service';
import { SetupsService } from '../../../core/setups/setups.service';

@Component({
  selector: 'app-setup-detail',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './setup-detail.html',
  styleUrl: './setup-detail.scss',
})
export class SetupDetail {
  private readonly fb = inject(FormBuilder);
  private readonly setupsService = inject(SetupsService);
  private readonly errorNotification = inject(ErrorNotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly setupId = this.route.snapshot.paramMap.get('id') as string;

  protected readonly setup = signal<PublicSetup | null>(null);
  protected readonly loading = signal(true);
  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = this.errorNotification.lastError;

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    sessionType: [''],
    weather: [''],
    gameVersion: [''],
    descriptionPublic: [''],
    notesPrivate: [''],
    tags: [''],
  });

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.errorNotification.clear();
    this.loading.set(true);
    try {
      const setup = await this.setupsService.getSetup(this.setupId);
      this.setup.set(setup);
      this.form.patchValue({
        title: setup.title,
        sessionType: setup.sessionType ?? '',
        weather: setup.weather ?? '',
        gameVersion: setup.gameVersion ?? '',
        descriptionPublic: setup.descriptionPublic ?? '',
        notesPrivate: setup.notesPrivate ?? '',
        tags: setup.tags.join(', '),
      });
    } catch {
      // le message est déjà exposé via ErrorNotificationService (apiErrorInterceptor)
    } finally {
      this.loading.set(false);
    }
  }

  startEditing(): void {
    this.editing.set(true);
  }

  cancelEditing(): void {
    this.editing.set(false);
    const setup = this.setup();
    if (setup) {
      this.form.patchValue({
        title: setup.title,
        sessionType: setup.sessionType ?? '',
        weather: setup.weather ?? '',
        gameVersion: setup.gameVersion ?? '',
        descriptionPublic: setup.descriptionPublic ?? '',
        notesPrivate: setup.notesPrivate ?? '',
        tags: setup.tags.join(', '),
      });
    }
  }

  async saveEditing(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorNotification.clear();
    this.saving.set(true);
    try {
      const values = this.form.getRawValue();
      const updated = await this.setupsService.updateSetup(this.setupId, {
        title: values.title,
        sessionType: values.sessionType || undefined,
        weather: values.weather || undefined,
        gameVersion: values.gameVersion || undefined,
        descriptionPublic: values.descriptionPublic || undefined,
        notesPrivate: values.notesPrivate || undefined,
        tags: values.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
      });
      this.setup.set(updated);
      this.editing.set(false);
    } catch {
      // le message est déjà exposé via ErrorNotificationService (apiErrorInterceptor)
    } finally {
      this.saving.set(false);
    }
  }

  async download(): Promise<void> {
    this.busy.set(true);
    try {
      const { downloadUrl } = await this.setupsService.getDownloadUrl(this.setupId);
      window.location.href = downloadUrl;
    } catch {
      // le message est déjà exposé via ErrorNotificationService (apiErrorInterceptor)
    } finally {
      this.busy.set(false);
    }
  }

  async toggleArchived(): Promise<void> {
    const setup = this.setup();
    if (!setup) {
      return;
    }
    this.busy.set(true);
    try {
      const updated = setup.isArchived
        ? await this.setupsService.restoreSetup(this.setupId)
        : await this.setupsService.archiveSetup(this.setupId);
      this.setup.set(updated);
    } catch {
      // le message est déjà exposé via ErrorNotificationService (apiErrorInterceptor)
    } finally {
      this.busy.set(false);
    }
  }

  async remove(): Promise<void> {
    if (!window.confirm('Supprimer définitivement ce setup ?')) {
      return;
    }
    this.busy.set(true);
    try {
      await this.setupsService.deleteSetup(this.setupId);
      await this.router.navigate(['/setups']);
    } catch {
      // le message est déjà exposé via ErrorNotificationService (apiErrorInterceptor)
      this.busy.set(false);
    }
  }
}
