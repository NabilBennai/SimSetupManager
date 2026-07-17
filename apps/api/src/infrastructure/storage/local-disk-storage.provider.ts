import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';

import { findRepoRoot } from '../config/repo-root';
import { signToken, verifyToken } from './signed-token';
import type {
  DownloadTarget,
  StorageProvider,
  UploadTarget,
  VerifiedObject,
} from './storage-provider';

const DEV_FALLBACK_SECRET = 'dev-only-storage-secret-do-not-use-in-production';

/**
 * Stockage disque local : gratuit, aucun compte tiers, respecte le contrat
 * fonctionnel complet (upload direct signé, vérification, téléchargement
 * signé à courte durée). À remplacer par un vrai fournisseur objet
 * (Vercel Blob, S3…) derrière la même interface `StorageProvider` au
 * moment du déploiement (voir .agents/todo-user.md).
 *
 * `writeStream`/`readStream` sont spécifiques à cette implémentation : un
 * vrai fournisseur cloud n'a pas besoin que notre API relaie les octets,
 * le navigateur envoie/reçoit directement depuis le stockage.
 */
@Injectable()
export class LocalDiskStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalDiskStorageProvider.name);
  private readonly root: string;
  private readonly secret: string;
  private readonly apiOrigin: string;

  constructor() {
    this.root = join(findRepoRoot(__dirname), 'storage');
    mkdirSync(this.root, { recursive: true });

    this.apiOrigin = process.env['API_ORIGIN'] ?? 'http://localhost:3000';

    const configuredSecret = process.env['STORAGE_SECRET'];
    if (configuredSecret) {
      this.secret = configuredSecret;
    } else {
      this.secret = DEV_FALLBACK_SECRET;
      this.logger.warn(
        'STORAGE_SECRET absent : utilisation du secret de développement. À définir explicitement avant tout déploiement.',
      );
    }
  }

  createUploadTarget(input: { storageKey: string; expiresInMs: number }): UploadTarget {
    const token = signToken(
      { storageKey: input.storageKey, exp: Date.now() + input.expiresInMs },
      this.secret,
    );
    return {
      uploadUrl: `${this.apiOrigin}/api/v1/uploads/blob/${input.storageKey}?token=${token}`,
    };
  }

  async verifyUploadedObject(storageKey: string): Promise<VerifiedObject | null> {
    const path = this.resolvePath(storageKey);
    if (!existsSync(path)) {
      return null;
    }

    const sizeBytes = statSync(path).size;
    const sha256 = await this.hashFile(path);
    return { sizeBytes, sha256 };
  }

  createDownloadUrl(input: {
    storageKey: string;
    originalName: string;
    expiresInMs: number;
  }): DownloadTarget {
    const token = signToken(
      { storageKey: input.storageKey, exp: Date.now() + input.expiresInMs },
      this.secret,
    );
    const filename = encodeURIComponent(input.originalName);
    return {
      downloadUrl: `${this.apiOrigin}/api/v1/uploads/download/${input.storageKey}?token=${token}&filename=${filename}`,
    };
  }

  async deleteObject(storageKey: string): Promise<void> {
    try {
      await unlink(this.resolvePath(storageKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  verifyTokenForKey(token: string, storageKey: string): boolean {
    const payload = verifyToken(token, this.secret);
    return payload !== null && payload['storageKey'] === storageKey;
  }

  writeStream(storageKey: string) {
    return createWriteStream(this.resolvePath(storageKey));
  }

  readStream(storageKey: string) {
    return createReadStream(this.resolvePath(storageKey));
  }

  resolvePath(storageKey: string): string {
    if (!/^[a-zA-Z0-9._-]+$/.test(storageKey)) {
      throw new Error('storageKey invalide.');
    }
    return join(this.root, storageKey);
  }

  private hashFile(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = createReadStream(path);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
}
