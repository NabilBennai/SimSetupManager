import { createHash } from 'node:crypto';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { findRepoRoot } from '../config/repo-root';
import { LocalDiskStorageProvider } from './local-disk-storage.provider';

describe('LocalDiskStorageProvider', () => {
  const storageRoot = join(findRepoRoot(__dirname), 'storage');
  let provider: LocalDiskStorageProvider;
  const testKey = 'jest-test-file.sto';

  beforeEach(() => {
    provider = new LocalDiskStorageProvider();
  });

  afterEach(() => {
    const path = join(storageRoot, testKey);
    if (existsSync(path)) {
      unlinkSync(path);
    }
  });

  it("crée une URL d'upload contenant un jeton valable pour cette clé", () => {
    const { uploadUrl } = provider.createUploadTarget({ storageKey: testKey, expiresInMs: 60_000 });

    const token = new URL(uploadUrl).searchParams.get('token');
    expect(token).toBeTruthy();
    expect(provider.verifyTokenForKey(token as string, testKey)).toBe(true);
    expect(provider.verifyTokenForKey(token as string, 'other-key.sto')).toBe(false);
  });

  it('verifyUploadedObject retourne null si le fichier est absent', async () => {
    const result = await provider.verifyUploadedObject(testKey);
    expect(result).toBeNull();
  });

  it('verifyUploadedObject retourne la taille et le sha256 réels', async () => {
    const content = Buffer.from('contenu de test');
    writeFileSync(join(storageRoot, testKey), content);

    const result = await provider.verifyUploadedObject(testKey);

    expect(result).toEqual({
      sizeBytes: content.length,
      sha256: createHash('sha256').update(content).digest('hex'),
    });
  });

  it('deleteObject supprime le fichier sans erreur si absent', async () => {
    writeFileSync(join(storageRoot, testKey), 'x');
    await provider.deleteObject(testKey);
    expect(existsSync(join(storageRoot, testKey))).toBe(false);

    await expect(provider.deleteObject(testKey)).resolves.toBeUndefined();
  });

  it('resolvePath rejette une clé contenant des caractères non autorisés', () => {
    expect(() => provider.resolvePath('../escape')).toThrow();
  });
});
