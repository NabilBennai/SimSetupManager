import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type { PublicSetup, PublicSetupVersionSummary } from '@sim-setup-manager/contracts';

import { ErrorNotificationService } from '../../../core/error-handling/error-notification.service';
import { SetupsService } from '../../../core/setups/setups.service';

@Component({
  selector: 'app-setup-detail',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, DatePipe],
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

  protected readonly versions = signal<PublicSetupVersionSummary[]>([]);
  protected readonly versionsLoading = signal(true);
  protected readonly newVersionNotes = signal('');
  protected readonly newVersionProgress = signal<number | null>(null);
  protected readonly newVersionError = signal<string | null>(null);

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
    void this.loadVersions();
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

  async loadVersions(): Promise<void> {
    this.versionsLoading.set(true);
    try {
      this.versions.set(await this.setupsService.listVersions(this.setupId));
    } catch {
      // le message est déjà exposé via ErrorNotificationService (apiErrorInterceptor)
    } finally {
      this.versionsLoading.set(false);
    }
  }

  async onNewVersionFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const setup = this.setup();
    if (!file || !setup) {
      return;
    }

    this.newVersionError.set(null);
    this.newVersionProgress.set(0);
    try {
      const prepared = await this.setupsService.prepareUpload({
        gameId: setup.gameId,
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });
      await this.setupsService.uploadFile(prepared.uploadUrl, file, (percent) =>
        this.newVersionProgress.set(percent),
      );
      const fileObject = await this.setupsService.completeUpload(prepared.uploadId);
      await this.setupsService.addVersion(this.setupId, {
        fileId: fileObject.id,
        changeNotes: this.newVersionNotes() || undefined,
      });
      this.newVersionNotes.set('');
      input.value = '';
      await Promise.all([this.load(), this.loadVersions()]);
    } catch {
      this.newVersionError.set(
        "Échec de l'envoi de la nouvelle version. Vérifiez le fichier puis réessayez.",
      );
    } finally {
      this.newVersionProgress.set(null);
    }
  }

  async setReference(versionId: string): Promise<void> {
    this.busy.set(true);
    try {
      const updated = await this.setupsService.setReferenceVersion(this.setupId, versionId);
      this.setup.set(updated);
      await this.loadVersions();
    } catch {
      // le message est déjà exposé via ErrorNotificationService (apiErrorInterceptor)
    } finally {
      this.busy.set(false);
    }
  }
}
