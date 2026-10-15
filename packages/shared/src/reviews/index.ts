import type { ApiClient } from '../api/client';
import type { components } from '../api/schema';

type PaginatedReviews = components['schemas']['PaginatedReviews'];

/** A page of a business's reviews (public endpoint). */
export function listBusinessReviews(
  client: Pick<ApiClient, 'apiFetch'>,
  businessId: string,
  { page = 1, pageSize = 20 }: { page?: number; pageSize?: number } = {},
): Promise<PaginatedReviews> {
  return client.apiFetch<PaginatedReviews>(
    `/booking/businesses/${encodeURIComponent(businessId)}/reviews?page=${page}&pageSize=${pageSize}`,
  );
}
