import type { components } from '@spot/shared';
import type { ReviewsApi } from './reviewsApi';

type Review = components['schemas']['Review'];

// In-browser stand-in for listBusinessReviews, which spot-backend doesn't serve yet (#70).
// Enabled with VITE_REVIEWS_MOCK=true. Reviews are read-only from the business side, so the
// sample set is generated once per business in memory (no localStorage needed). It has more
// than one page so pagination can be exercised. Delete once that endpoint is live.

const LATENCY_MS = 300;

// [days ago, rating, comment]: newest first, mixing ratings and reviews left without a comment.
const SAMPLE_REVIEWS: [number, number, string | null][] = [
  [1, 5, 'Excelente atención, muy puntuales y el resultado quedó increíble.'],
  [2, 4, 'Muy buen servicio, solo tuve que esperar unos minutos.'],
  [3, 5, null],
  [4, 3, 'El corte quedó bien, pero el local estaba muy lleno.'],
  [6, 5, 'Siempre salgo feliz. Recomendadísimo.'],
  [7, 2, 'Me cambiaron la hora sin avisar con tiempo.'],
  [9, 4, null],
  [10, 5, 'Atención súper amable y el lugar muy limpio.'],
  [12, 1, 'No respetaron mi reservación y tuve que volver otro día.'],
  [14, 4, 'Buen precio por la calidad del trabajo.'],
  [15, 5, 'La manicure me duró impecable más de dos semanas.'],
  [18, 3, null],
  [20, 5, 'Llegué con una idea y la entendieron perfecto.'],
  [23, 4, 'Todo bien, volveré.'],
  [25, 5, 'El mejor tinte que me han hecho.'],
  [28, 4, null],
  [31, 5, 'Puntuales y muy profesionales.'],
  [35, 3, 'Correcto, aunque esperaba un poco más por el precio.'],
  [40, 5, 'Gran experiencia de principio a fin.'],
  [44, 4, 'Muy recomendado para cortes de niño, tienen mucha paciencia.'],
  [50, 5, null],
  [57, 2, 'El resultado no fue lo que pedí.'],
  [63, 5, 'Excelente, como siempre.'],
];

const cache = new Map<string, Review[]>();

function seed(businessId: string): Review[] {
  const now = Date.now();
  return SAMPLE_REVIEWS.map(([daysAgo, rating, comment]) => {
    const createdAt = new Date(now - daysAgo * 86_400_000).toISOString();
    return {
      id: crypto.randomUUID(),
      bookingId: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      businessId,
      rating,
      comment,
      createdAt,
      updatedAt: createdAt,
    };
  });
}

function load(businessId: string): Review[] {
  let reviews = cache.get(businessId);
  if (!reviews) {
    reviews = seed(businessId);
    cache.set(businessId, reviews);
  }
  return reviews;
}

export const mockReviewsApi: ReviewsApi = {
  list: (businessId, { page = 1, pageSize = 20 }) =>
    new Promise((resolve) => {
      setTimeout(() => {
        const reviews = load(businessId);
        resolve({
          data: reviews.slice((page - 1) * pageSize, page * pageSize),
          pagination: { page, pageSize, total: reviews.length, totalPages: Math.ceil(reviews.length / pageSize) },
        });
      }, LATENCY_MS);
    }),
};
