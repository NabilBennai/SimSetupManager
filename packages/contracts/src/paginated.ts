/**
 * Forme qu'un cas d'utilisation NestJS retourne pour une collection paginée ;
 * le `ResponseInterceptor` la reconnaît et construit le `meta` de pagination
 * (voir apps/api/src/common/interceptors/response.interceptor.ts).
 */
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export function isPaginated(value: unknown): value is Paginated<unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate['items']) &&
    typeof candidate['page'] === 'number' &&
    typeof candidate['pageSize'] === 'number' &&
    typeof candidate['total'] === 'number'
  );
}
