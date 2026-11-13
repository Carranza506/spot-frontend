import { REVIEW_RATING_MAX } from '@spot/shared';

// Clamped once, so the stars and their screen-reader label always agree (never "7 de 5").
export function filledStars(rating: number): number {
  return Math.max(0, Math.min(REVIEW_RATING_MAX, Math.round(rating) || 0));
}

/** A rating as text stars, e.g. 4 → "★★★★☆". Pass a value from `filledStars`. */
export function stars(filled: number): string {
  return '★'.repeat(filled) + '☆'.repeat(REVIEW_RATING_MAX - filled);
}
