import { listBusinessReviews, type BusinessReviewsFilter, type components } from '@spot/shared';
import { authClient } from '../../api/client';
import { mockReviewsApi } from './mockReviewsApi';

type PaginatedReviews = components['schemas']['PaginatedReviews'];

/** What the Reseñas view needs from the review endpoints. */
export interface ReviewsApi {
  list(businessId: string, filter: BusinessReviewsFilter): Promise<PaginatedReviews>;
}

const remoteReviewsApi: ReviewsApi = {
  list: (businessId, filter) => listBusinessReviews(authClient, businessId, filter),
};

/** True when VITE_REVIEWS_MOCK=true — see mockReviewsApi. */
export const isReviewsMock = import.meta.env.VITE_REVIEWS_MOCK === 'true';

export const reviewsApi: ReviewsApi = isReviewsMock ? mockReviewsApi : remoteReviewsApi;
