import { REVIEW_RATING_MAX, type components } from '@spot/shared';
import styles from './Reviews.module.css';

type Review = components['schemas']['Review'];

const dateFormat = new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'short', year: 'numeric' });

/** Filled and empty stars for a 1–5 rating, read by screen readers as "N de 5 estrellas". */
export function RatingStars({ rating }: { rating: number }) {
  return (
    <span className={styles.stars} role="img" aria-label={`${rating} de ${REVIEW_RATING_MAX} estrellas`}>
      {Array.from({ length: REVIEW_RATING_MAX }, (_, i) => (
        <span key={i} className={i < rating ? styles.starFilled : styles.starEmpty} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  );
}

export function ReviewRow({ review }: { review: Review }) {
  return (
    <li className={styles.row}>
      <div className={styles.header}>
        <RatingStars rating={review.rating} />
        <time className={styles.date} dateTime={review.createdAt}>
          {dateFormat.format(new Date(review.createdAt))}
        </time>
      </div>
      {review.comment?.trim() ? (
        <p className={styles.comment}>{review.comment}</p>
      ) : (
        <p className={styles.noComment}>Sin comentario.</p>
      )}
    </li>
  );
}
