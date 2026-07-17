import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import express from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { createApp } from './../src/create-app';

process.env['DATABASE_URL'] ??= 'file:./prisma/local.db';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await createApp(express());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('parcours complet : register -> me -> logout -> me (401)', async () => {
    const agent = request.agent(app.getHttpServer());
    const email = `e2e-${randomUUID()}@example.com`;

    const registerRes = await agent
      .post('/api/v1/auth/register')
      .send({ email, password: 'password123', displayName: 'E2E User' })
      .expect(201);
    expect(registerRes.body.data.email).toBe(email);
    expect(registerRes.body.data.passwordHash).toBeUndefined();

    const meRes = await agent.get('/api/v1/auth/me').expect(200);
    expect(meRes.body.data.email).toBe(email);

    await agent.post('/api/v1/auth/logout').expect(200);

    await agent.get('/api/v1/auth/me').expect(401);
  });

  it('login refuse un mot de passe incorrect (401) puis réussit avec le bon', async () => {
    const agent = request.agent(app.getHttpServer());
    const email = `e2e-${randomUUID()}@example.com`;

    await agent
      .post('/api/v1/auth/register')
      .send({ email, password: 'password123', displayName: 'E2E User' })
      .expect(201);
    await agent.post('/api/v1/auth/logout').expect(200);

    await agent.post('/api/v1/auth/login').send({ email, password: 'wrong-password' }).expect(401);

    await agent.post('/api/v1/auth/login').send({ email, password: 'password123' }).expect(200);

    await agent.get('/api/v1/auth/me').expect(200);
  });

  it('un email déjà utilisé est refusé (409)', async () => {
    const agent = request.agent(app.getHttpServer());
    const email = `e2e-${randomUUID()}@example.com`;

    await agent
      .post('/api/v1/auth/register')
      .send({ email, password: 'password123', displayName: 'E2E User' })
      .expect(201);

    await agent
      .post('/api/v1/auth/register')
      .send({ email, password: 'password123', displayName: 'Autre' })
      .expect(409);
  });

  it('une requête privée sans session renvoie 401', () => {
    return request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('PATCH /users/me modifie le pseudonyme et les préférences', async () => {
    const agent = request.agent(app.getHttpServer());
    const email = `e2e-${randomUUID()}@example.com`;

    await agent
      .post('/api/v1/auth/register')
      .send({ email, password: 'password123', displayName: 'Avant' })
      .expect(201);

    const updateRes = await agent
      .patch('/api/v1/users/me')
      .send({ displayName: 'Après', preferences: { theme: 'dark' } })
      .expect(200);

    expect(updateRes.body.data.displayName).toBe('Après');
    expect(updateRes.body.data.preferences).toEqual({ theme: 'dark' });
  });
});
