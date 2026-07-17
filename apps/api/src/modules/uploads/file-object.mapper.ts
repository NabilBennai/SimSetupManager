import type { PublicFileObject } from '@sim-setup-manager/contracts';

export interface FileObjectLike {
  id: string;
  originalName: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  sha256: string;
  status: string;
}

export function toPublicFileObject(file: FileObjectLike): PublicFileObject {
  return {
    id: file.id,
    originalName: file.originalName,
    mimeType: file.mimeType,
    extension: file.extension,
    sizeBytes: file.sizeBytes,
    sha256: file.sha256,
    status: file.status,
  };
}
