import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import type {
  PublicCar,
  PublicFileObject,
  PublicGame,
  PublicTrack,
} from '@sim-setup-manager/contracts';

import { ErrorNotificationService } from '../../../core/error-handling/error-notification.service';
import { ReferencesService } from '../../../core/references/references.service';
import { SetupsService } from '../../../core/setups/setups.service';

let trackSearchToken = 0;

@Component({
  selector: 'app-setup-upload',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './setup-upload.html',
  styleUrl: './setup-upload.scss',
})
export class SetupUpload {
  private readonly fb = inject(FormBuilder);
  private readonly referencesService = inject(ReferencesService);
  private readonly setupsService = inject(SetupsService);
  private readonly errorNotification = inject(ErrorNotificationService);
  private readonly router = inject(Router);

  protected readonly error = this.errorNotification.lastError;

  protected readonly games = signal<PublicGame[]>([]);
  protected readonly cars = signal<PublicCar[]>([]);
  protected readonly trackQuery = signal('');
  protected readonly trackResults = signal<PublicTrack[]>([]);
  protected readonly selectedTrack = signal<PublicTrack | null>(null);

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly uploadProgress = signal<number | null>(null);
  protected readonly uploadedFile = signal<PublicFileObject | null>(null);
  protected readonly uploadError = signal<string | null>(null);

  protected readonly submitting = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    gameId: ['', Validators.required],
    carId: ['', Validators.required],
    title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    sessionType: [''],
    weather: [''],
    gameVersion: [''],
    descriptionPublic: [''],
    notesPrivate: [''],
    tags: [''],
  });

  constructor() {
    void this.referencesService.listGames().then((games) => this.games.set(games));
  }

  async onGameChange(): Promise<void> {
    const gameId = this.form.controls.gameId.value;
    this.form.controls.carId.setValue('');
    this.cars.set([]);
    this.selectedFile.set(null);
    this.uploadedFile.set(null);
    if (gameId) {
      this.cars.set(await this.referencesService.listCars(gameId));
    }
  }

  async onTrackQueryChange(value: string): Promise<void> {
    this.trackQuery.set(value);
    this.selectedTrack.set(null);
    const token = ++trackSearchToken;
    if (value.trim().length < 2) {
      this.trackResults.set([]);
      return;
    }
    const results = await this.referencesService.searchTracks(value);
    if (token === trackSearchToken) {
      this.trackResults.set(results);
    }
  }

  selectTrack(track: PublicTrack): void {
    this.selectedTrack.set(track);
    this.trackResults.set([]);
    this.trackQuery.set(track.layout ? `${track.name} — ${track.layout}` : track.name);
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.selectedFile.set(file);
    this.uploadedFile.set(null);
    await this.startUpload();
  }

  async retryUpload(): Promise<void> {
    await this.startUpload();
  }

  private async startUpload(): Promise<void> {
    const file = this.selectedFile();
    const gameId = this.form.controls.gameId.value;
    if (!file || !gameId) {
      return;
    }

    this.uploadError.set(null);
    this.uploadProgress.set(0);
    try {
      const prepared = await this.setupsService.prepareUpload({
        gameId,
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });
      await this.setupsService.uploadFile(prepared.uploadUrl, file, (percent) =>
        this.uploadProgress.set(percent),
      );
      const fileObject = await this.setupsService.completeUpload(prepared.uploadId);
      this.uploadedFile.set(fileObject);
    } catch {
      this.uploadError.set("Échec de l'envoi du fichier. Vérifiez le fichier puis réessayez.");
    } finally {
      this.uploadProgress.set(null);
    }
  }

  private parseTags(raw: string): string[] {
    return raw
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }

  get canSubmit(): boolean {
    return this.form.valid && this.selectedTrack() !== null && this.uploadedFile() !== null;
  }

  async onSubmit(): Promise<void> {
    if (!this.canSubmit) {
      this.form.markAllAsTouched();
      return;
    }

    const track = this.selectedTrack();
    const file = this.uploadedFile();
    if (!track || !file) {
      return;
    }

    this.errorNotification.clear();
    this.submitting.set(true);
    try {
      const {
        gameId,
        carId,
        title,
        sessionType,
        weather,
        gameVersion,
        descriptionPublic,
        notesPrivate,
        tags,
      } = this.form.getRawValue();
      const setup = await this.setupsService.createSetup({
        gameId,
        carId,
        trackId: track.id,
        title,
        fileId: file.id,
        sessionType: sessionType || undefined,
        weather: weather || undefined,
        gameVersion: gameVersion || undefined,
        descriptionPublic: descriptionPublic || undefined,
        notesPrivate: notesPrivate || undefined,
        tags: this.parseTags(tags),
      });
      await this.router.navigate(['/setups', setup.id]);
    } catch {
      // le message est déjà exposé via ErrorNotificationService (apiErrorInterceptor)
    } finally {
      this.submitting.set(false);
    }
  }
}
