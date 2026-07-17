import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ErrorNotificationService } from '../error-handling/error-notification.service';
import { apiErrorInterceptor } from './api-error.interceptor';

describe('apiErrorInterceptor', () => {
  let httpClient: HttpClient;
  let httpTesting: HttpTestingController;
  let errorNotification: ErrorNotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    errorNotification = TestBed.inject(ErrorNotificationService);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it("pousse le message de l'enveloppe d'erreur API dans ErrorNotificationService", async () => {
    const request$ = httpClient.get('/api/v1/setups/1');
    const resultPromise = new Promise((resolve, reject) => {
      request$.subscribe({ next: resolve, error: reject });
    });

    httpTesting.expectOne('/api/v1/setups/1').flush(
      {
        error: {
          code: 'SETUP_NOT_FOUND',
          message: 'Le setup demandé est introuvable.',
          details: [],
        },
        meta: { requestId: 'req_abc' },
      },
      { status: 404, statusText: 'Not Found' },
    );

    await expect(resultPromise).rejects.toBeTruthy();
    expect(errorNotification.lastError()).toEqual({
      code: 'SETUP_NOT_FOUND',
      message: 'Le setup demandé est introuvable.',
      requestId: 'req_abc',
    });
  });
});
