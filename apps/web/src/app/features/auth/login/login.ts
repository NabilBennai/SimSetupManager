import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { ErrorNotificationService } from '../../../core/error-handling/error-notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly errorNotification = inject(ErrorNotificationService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly error = this.errorNotification.lastError;

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorNotification.clear();
    this.submitting.set(true);
    try {
      await this.authService.login(this.form.getRawValue());
      await this.router.navigate(['/profile']);
    } catch {
      // le message est déjà exposé via ErrorNotificationService (apiErrorInterceptor)
    } finally {
      this.submitting.set(false);
    }
  }
}
