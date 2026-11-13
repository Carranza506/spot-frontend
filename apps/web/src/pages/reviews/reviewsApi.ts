import { listBusinessReviews, type BusinessReviewsFilter, type components } from '@spot/shared';
import { authClient } from '../../api/client';

type PaginatedReviews = components['schemas']['PaginatedReviews'];

/** What the Reseñas view needs from the review endpoints. */
export interface ReviewsApi {
  list(businessId: string, filter: BusinessReviewsFilter): Promise<PaginatedReviews>;
}

export const reviewsApi: ReviewsApi = {
  list: (businessId, filter) => listBusinessReviews(authClient, businessId, filter),
};
