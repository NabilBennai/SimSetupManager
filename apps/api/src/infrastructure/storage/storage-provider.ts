export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

export interface UploadTarget {
  uploadUrl: string;
}

export interface VerifiedObject {
  sizeBytes: number;
  sha256: string;
}

export interface DownloadTarget {
  downloadUrl: string;
}

/**
 * Abstraction du stockage objet (ADR-003/004). L'implémentation active
 * aujourd'hui est le disque local (`local-disk-storage.provider.ts`) ; un
 * vrai fournisseur (Vercel Blob, S3…) sera branché derrière la même
 * interface au moment du déploiement, sans toucher aux modules
 * uploads/setups qui ne connaissent que ce contrat.
 */
export interface StorageProvider {
  createUploadTarget(input: { storageKey: string; expiresInMs: number }): UploadTarget;

  verifyUploadedObject(storageKey: string): Promise<VerifiedObject | null>;

  createDownloadUrl(input: {
    storageKey: string;
    originalName: string;
    expiresInMs: number;
  }): DownloadTarget;

  deleteObject(storageKey: string): Promise<void>;
}
