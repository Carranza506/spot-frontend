import type { ApiClient } from '../api/client';
import type { components } from '../api/schema';

type PaginatedReviews = components['schemas']['PaginatedReviews'];

export const REVIEW_RATING_MAX = 5;

export interface BusinessReviewsFilter {
  page?: number;
  pageSize?: number;
}

/** A page of a business's reviews. Public endpoint: no JWT is attached (see isPublicApiPath). */
export function listBusinessReviews(
  client: Pick<ApiClient, 'apiFetch'>,
  businessId: string,
  { page = 1, pageSize = 20 }: BusinessReviewsFilter = {},
): Promise<PaginatedReviews> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return client.apiFetch<PaginatedReviews>(`/booking/businesses/${encodeURIComponent(businessId)}/reviews?${query}`);
}
