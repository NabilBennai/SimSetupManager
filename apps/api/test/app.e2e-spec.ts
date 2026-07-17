import { INestApplication } from '@nestjs/common';
import express from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { createApp } from './../src/create-app';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await createApp(express());
    await app.init();
  });

  it('/api/v1 (GET) enveloppe la réponse avec data et meta.requestId', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect((res: { body: unknown }) => {
        const body = res.body as { data: string; meta: { requestId: string } };
        expect(body.data).toBe('Hello World!');
        expect(typeof body.meta.requestId).toBe('string');
        expect(body.meta.requestId.length).toBeGreaterThan(0);
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
