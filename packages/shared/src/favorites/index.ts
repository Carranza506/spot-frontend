import type { ApiClient } from '../api/client';
import type { components } from '../api/schema';

type PaginatedFavorites = components['schemas']['PaginatedFavorites'];

export interface FavoriteBusinessesFilter {
  page?: number;
  pageSize?: number;
}

function favoritePath(businessId: string): string {
  return `/booking/favorites/${encodeURIComponent(businessId)}`;
}

/**
 * A page of the authenticated CLIENT's favorite businesses, newest first. Favorites of an inactive
 * business are left out (and not counted). Other roles get 403.
 */
export function listFavoriteBusinesses(
  client: Pick<ApiClient, 'apiFetch'>,
  { page = 1, pageSize = 20 }: FavoriteBusinessesFilter = {},
): Promise<PaginatedFavorites> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return client.apiFetch<PaginatedFavorites>(`/booking/favorites?${query}`);
}

/** Idempotent (204 even if it already was one); 404 if the business doesn't exist or is inactive. */
export function addFavoriteBusiness(client: Pick<ApiClient, 'apiFetch'>, businessId: string): Promise<void> {
  return client.apiFetch<void>(favoritePath(businessId), { method: 'PUT' });
}

/** Idempotent: always 204, whether or not it was a favorite. */
export function removeFavoriteBusiness(client: Pick<ApiClient, 'apiFetch'>, businessId: string): Promise<void> {
  return client.apiFetch<void>(favoritePath(businessId), { method: 'DELETE' });
}
