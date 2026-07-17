import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import express from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { createApp } from './../src/create-app';

process.env['DATABASE_URL'] ??= 'file:./prisma/local.db';

describe('Setups (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await createApp(express());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('parcours complet : upload -> setup -> liste -> détail -> édition -> téléchargement -> archivage -> restauration -> suppression', async () => {
    const agent = request.agent(app.getHttpServer());
    const email = `e2e-setups-${randomUUID()}@example.com`;

    await agent
      .post('/api/v1/auth/register')
      .send({ email, password: 'password123', displayName: 'Setups E2E' })
      .expect(201);

    const gamesRes = await agent.get('/api/v1/games').expect(200);
    const game = gamesRes.body.data.find((g: { slug: string }) => g.slug === 'iracing');
    expect(game).toBeTruthy();

    const carsRes = await agent.get(`/api/v1/games/${game.id}/cars?pageSize=1`).expect(200);
    const car = carsRes.body.data[0];
    expect(car).toBeTruthy();

    const tracksRes = await agent.get('/api/v1/tracks?pageSize=1').expect(200);
    const track = tracksRes.body.data[0];
    expect(track).toBeTruthy();

    const fileContent = Buffer.from(`setup e2e ${randomUUID()}`);
    const prepareRes = await agent
      .post('/api/v1/uploads/prepare')
      .send({
        gameId: game.id,
        originalName: 'e2e-setup.sto',
        mimeType: 'application/octet-stream',
        sizeBytes: fileContent.length,
      })
      .expect(201);
    const { uploadId, uploadUrl } = prepareRes.body.data;

    const uploadPath = new URL(uploadUrl).pathname + new URL(uploadUrl).search;
    await agent
      .put(uploadPath)
      .set('Content-Type', 'application/octet-stream')
      .send(fileContent)
      .expect(204);

    const completeRes = await agent.post(`/api/v1/uploads/${uploadId}/complete`).expect(201);
    const file = completeRes.body.data;
    expect(file.sizeBytes).toBe(fileContent.length);

    // Idempotence : un second appel renvoie le même FileObject sans erreur.
    const completeAgainRes = await agent.post(`/api/v1/uploads/${uploadId}/complete`).expect(201);
    expect(completeAgainRes.body.data.id).toBe(file.id);

    const createRes = await agent
      .post('/api/v1/setups')
      .send({
        title: 'E2E Setup',
        gameId: game.id,
        carId: car.id,
        trackId: track.id,
        fileId: file.id,
      })
      .expect(201);
    const setupId = createRes.body.data.id;
    expect(createRes.body.data.referenceVersion.file.id).toBe(file.id);

    const listRes = await agent.get('/api/v1/setups').expect(200);
    expect(listRes.body.data.some((s: { id: string }) => s.id === setupId)).toBe(true);

    await agent.get(`/api/v1/setups/${setupId}`).expect(200);

    const updateRes = await agent
      .patch(`/api/v1/setups/${setupId}`)
      .send({ title: 'E2E Setup (updated)' })
      .expect(200);
    expect(updateRes.body.data.title).toBe('E2E Setup (updated)');

    const downloadRes = await agent.post(`/api/v1/setups/${setupId}/download-url`).expect(200);
    const downloadPath =
      new URL(downloadRes.body.data.downloadUrl).pathname +
      new URL(downloadRes.body.data.downloadUrl).search;
    const downloadedRes = await agent.get(downloadPath).expect(200);
    expect(Buffer.compare(downloadedRes.body as Buffer, fileContent)).toBe(0);

    await agent.post(`/api/v1/setups/${setupId}/archive`).expect(200);
    const listAfterArchiveRes = await agent.get('/api/v1/setups').expect(200);
    expect(listAfterArchiveRes.body.data.some((s: { id: string }) => s.id === setupId)).toBe(false);

    const listIncludingArchivedRes = await agent
      .get('/api/v1/setups?includeArchived=true')
      .expect(200);
    expect(listIncludingArchivedRes.body.data.some((s: { id: string }) => s.id === setupId)).toBe(
      true,
    );

    await agent.post(`/api/v1/setups/${setupId}/restore`).expect(200);

    await agent.delete(`/api/v1/setups/${setupId}`).expect(200);
    await agent.get(`/api/v1/setups/${setupId}`).expect(404);
  });

  it("une intention d'upload avec une extension non supportée est refusée (400)", async () => {
    const agent = request.agent(app.getHttpServer());
    const email = `e2e-setups-${randomUUID()}@example.com`;

    await agent
      .post('/api/v1/auth/register')
      .send({ email, password: 'password123', displayName: 'Setups E2E' })
      .expect(201);

    const gamesRes = await agent.get('/api/v1/games').expect(200);
    const game = gamesRes.body.data.find((g: { slug: string }) => g.slug === 'iracing');

    await agent
      .post('/api/v1/uploads/prepare')
      .send({
        gameId: game.id,
        originalName: 'bad.json',
        mimeType: 'application/json',
        sizeBytes: 10,
      })
      .expect(400);
  });

  it("un setup d'un autre utilisateur renvoie 404, jamais 403", async () => {
    const ownerAgent = request.agent(app.getHttpServer());
    const ownerEmail = `e2e-owner-${randomUUID()}@example.com`;
    await ownerAgent
      .post('/api/v1/auth/register')
      .send({ email: ownerEmail, password: 'password123', displayName: 'Owner' })
      .expect(201);

    const gamesRes = await ownerAgent.get('/api/v1/games').expect(200);
    const game = gamesRes.body.data.find((g: { slug: string }) => g.slug === 'iracing');
    const carsRes = await ownerAgent.get(`/api/v1/games/${game.id}/cars?pageSize=1`).expect(200);
    const car = carsRes.body.data[0];
    const tracksRes = await ownerAgent.get('/api/v1/tracks?pageSize=1').expect(200);
    const track = tracksRes.body.data[0];

    const fileContent = Buffer.from(`setup e2e ${randomUUID()}`);
    const prepareRes = await ownerAgent
      .post('/api/v1/uploads/prepare')
      .send({
        gameId: game.id,
        originalName: 'owner-setup.sto',
        mimeType: 'application/octet-stream',
        sizeBytes: fileContent.length,
      })
      .expect(201);
    const { uploadId, uploadUrl } = prepareRes.body.data;
    const uploadPath = new URL(uploadUrl).pathname + new URL(uploadUrl).search;
    await ownerAgent
      .put(uploadPath)
      .set('Content-Type', 'application/octet-stream')
      .send(fileContent)
      .expect(204);
    const completeRes = await ownerAgent.post(`/api/v1/uploads/${uploadId}/complete`).expect(201);

    const createRes = await ownerAgent
      .post('/api/v1/setups')
      .send({
        title: 'Owner Setup',
        gameId: game.id,
        carId: car.id,
        trackId: track.id,
        fileId: completeRes.body.data.id,
      })
      .expect(201);
    const setupId = createRes.body.data.id;

    const intruderAgent = request.agent(app.getHttpServer());
    const intruderEmail = `e2e-intruder-${randomUUID()}@example.com`;
    await intruderAgent
      .post('/api/v1/auth/register')
      .send({ email: intruderEmail, password: 'password123', displayName: 'Intruder' })
      .expect(201);

    await intruderAgent.get(`/api/v1/setups/${setupId}`).expect(404);
  });
});
