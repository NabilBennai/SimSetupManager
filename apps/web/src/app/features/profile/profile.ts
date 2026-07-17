import { Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { ErrorNotificationService } from '../../core/error-handling/error-notification.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './profile.html',
})
export class Profile {
  private readonly fb = inject(FormBuilder);
  protected readonly authService = inject(AuthService);
  private readonly errorNotification = inject(ErrorNotificationService);
  private readonly router = inject(Router);

  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly error = this.errorNotification.lastError;

  protected readonly form = this.fb.nonNullable.group({
    displayName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
  });

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.form.patchValue({ displayName: user.displayName }, { emitEvent: false });
      }
    });
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorNotification.clear();
    this.saved.set(false);
    this.saving.set(true);
    try {
      await this.authService.updateProfile(this.form.getRawValue());
      this.saved.set(true);
    } catch {
      // le message est déjà exposé via ErrorNotificationService (apiErrorInterceptor)
    } finally {
      this.saving.set(false);
    }
  }

  async onLogout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigate(['/login']);
  }
}
