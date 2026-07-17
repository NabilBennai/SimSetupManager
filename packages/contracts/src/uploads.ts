export interface PrepareUploadPayload {
  gameId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface PrepareUploadResponse {
  uploadId: string;
  uploadUrl: string;
  expiresAt: string;
}

export interface PublicFileObject {
  id: string;
  originalName: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  sha256: string;
  status: string;
}
