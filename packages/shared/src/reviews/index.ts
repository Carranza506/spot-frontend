import type { ApiClient } from '../api/client';
import type { components } from '../api/schema';

type PaginatedReviews = components['schemas']['PaginatedReviews'];
type Review = components['schemas']['Review'];
type ReviewCreateRequest = components['schemas']['ReviewCreateRequest'];

export const REVIEW_RATING_MAX = 5;

/**
 * Leaves the caller's review of one of their own COMPLETED bookings (201). The API checks, in order:
 * 404 if the booking doesn't exist, 403 if it isn't the caller's, 422 REVIEW_BOOKING_NOT_COMPLETED,
 * and 409 REVIEW_ALREADY_EXISTS if it already has one.
 */
export function createBookingReview(
  client: Pick<ApiClient, 'apiFetch'>,
  bookingId: string,
  data: ReviewCreateRequest,
): Promise<Review> {
  return client.apiFetch<Review>(`/booking/bookings/${encodeURIComponent(bookingId)}/review`, {
    method: 'POST',
    body: data,
  });
}

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
