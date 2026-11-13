import type { ApiClient } from '../api/client';
import type { components } from '../api/schema';

type PaginatedBusinesses = components['schemas']['PaginatedBusinesses'];
type PaginatedCategories = components['schemas']['PaginatedCategories'];
type AiSearchQueryRequest = components['schemas']['AiSearchQueryRequest'];
type AiSearchResult = components['schemas']['AiSearchResult'];

/** Mirror AiSearchQueryRequest.query's length limits in contracts/spot-api.yaml. */
export const AI_SEARCH_QUERY_MIN_LENGTH = 3;
export const AI_SEARCH_QUERY_MAX_LENGTH = 500;

export interface BusinessSearchFilter {
  page?: number;
  pageSize?: number;
  /** Free text matched against the business name and description. */
  q?: string;
  categoryId?: string;
  city?: string;
  province?: string;
  /** Proximity: all three go together (radiusKm 0.1–100). */
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

/** Traditional search over active businesses (public endpoint). Empty filters are left out. */
export function searchBusinesses(
  client: Pick<ApiClient, 'apiFetch'>,
  { page = 1, pageSize = 20, q, categoryId, city, province, lat, lng, radiusKm }: BusinessSearchFilter = {},
): Promise<PaginatedBusinesses> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (q?.trim()) query.set('q', q.trim());
  if (categoryId) query.set('categoryId', categoryId);
  if (city?.trim()) query.set('city', city.trim());
  if (province?.trim()) query.set('province', province.trim());
  // The backend's range check lets NaN through, so only real numbers make up the proximity trio.
  if (Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(radiusKm)) {
    query.set('lat', String(lat));
    query.set('lng', String(lng));
    query.set('radiusKm', String(radiusKm));
  }
  return client.apiFetch<PaginatedBusinesses>(`/business/businesses?${query}`);
}

/**
 * Natural language search: the AI turns `query` into structured criteria and the backend returns
 * them with the matching businesses. Any authenticated role; 422 when the query can't be interpreted.
 */
export function aiSearchQuery(
  client: Pick<ApiClient, 'apiFetch'>,
  data: AiSearchQueryRequest,
): Promise<AiSearchResult> {
  return client.apiFetch<AiSearchResult>('/ai-search/query', { method: 'POST', body: data });
}

/** A page of categories (public endpoint), optionally only the children of `parentCategoryId`. */
export function listCategories(
  client: Pick<ApiClient, 'apiFetch'>,
  { page = 1, pageSize = 100, parentCategoryId }: { page?: number; pageSize?: number; parentCategoryId?: string } = {},
): Promise<PaginatedCategories> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (parentCategoryId) query.set('parentCategoryId', parentCategoryId);
  return client.apiFetch<PaginatedCategories>(`/business/categories?${query}`);
}
