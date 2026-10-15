import type { ApiClient } from '../api/client';
import type { components } from '../api/schema';

type PaginatedFavorites = components['schemas']['PaginatedFavorites'];

/** The contract's PageSizeParam maximum. */
const MAX_PAGE_SIZE = 100;

function favoritePath(businessId: string): string {
  return `/booking/favorites/${encodeURIComponent(businessId)}`;
}

/** A page of the authenticated CLIENT's favorite businesses. */
export function listFavoriteBusinesses(
  client: Pick<ApiClient, 'apiFetch'>,
  { page = 1, pageSize = 20 }: { page?: number; pageSize?: number } = {},
): Promise<PaginatedFavorites> {
  return client.apiFetch<PaginatedFavorites>(`/booking/favorites?page=${page}&pageSize=${pageSize}`);
}

/** Idempotent (204 even if it already was a favorite). CLIENT role only. */
export function addFavoriteBusiness(client: Pick<ApiClient, 'apiFetch'>, businessId: string): Promise<void> {
  return client.apiFetch<void>(favoritePath(businessId), { method: 'PUT' });
}

/** Idempotent (204 even if it wasn't a favorite). CLIENT role only. */
export function removeFavoriteBusiness(client: Pick<ApiClient, 'apiFetch'>, businessId: string): Promise<void> {
  return client.apiFetch<void>(favoritePath(businessId), { method: 'DELETE' });
}

/**
 * Whether the authenticated CLIENT has `businessId` among their favorites. The API has no
 * single-business lookup, so this pages through the list (one request for up to 100 favorites).
 */
export async function isFavoriteBusiness(client: Pick<ApiClient, 'apiFetch'>, businessId: string): Promise<boolean> {
  for (let page = 1; ; page++) {
    const { data, pagination } = await listFavoriteBusinesses(client, { page, pageSize: MAX_PAGE_SIZE });
    if (data.some((favorite) => favorite.businessId === businessId)) return true;
    // `data.length === 0` also stops a page past the end, whatever totalPages says.
    if (page >= pagination.totalPages || data.length === 0) return false;
  }
}
