/**
 * Convention de réponse API définie dans docs/02-specifications-techniques.md §2.4.
 * Partagée sans dépendance framework entre apps/api (production) et apps/web
 * (consommation), pour garder les deux côtés synchronisés.
 */

export interface ResponseMeta {
  requestId: string;
}

export interface PaginationMeta extends ResponseMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta: ResponseMeta;
}

export interface ApiPaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details: unknown[];
}

export interface ApiErrorResponse {
  error: ApiErrorBody;
  meta: ResponseMeta;
}
