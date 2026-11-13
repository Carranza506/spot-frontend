import { Pressable, StyleSheet, Text } from 'react-native';
import { REVIEW_RATING_MAX, color } from '@spot/shared';
import { ReviewForm } from './ReviewForm';
import { filledStars, stars } from './stars';
import { font } from '@/theme/fonts';

export interface BookingReviewProps {
  bookingId: string;
  /** COMPLETED and not known to be reviewed: "Dejar reseña" is offered. */
  reviewable: boolean;
  reviewed: boolean;
  /** The rating left on this device, or null when only the API's 409 told us it was reviewed. */
  rating: number | null;
  reviewing: boolean;
  submitting: boolean;
  error: string | null;
  onOpen: () => void;
  onCancel: () => void;
  onSubmit: (rating: number, comment: string | undefined) => void;
}

/** A booking card's review part (#29): the rating left, the "Dejar reseña" button, or its form. */
export function BookingReview({
  bookingId,
  reviewable,
  reviewed,
  rating,
  reviewing,
  submitting,
  error,
  onOpen,
  onCancel,
  onSubmit,
}: BookingReviewProps) {
  if (reviewed) {
    const filled = rating ? filledStars(rating) : 0;
    return (
      <Text
        style={styles.reviewedText}
        role="status"
        // Screen readers say the star characters one by one (or skip them): give the number instead.
        accessibilityLabel={rating ? `Tu reseña: ${filled} de ${REVIEW_RATING_MAX} estrellas` : undefined}
      >
        {rating ? `Tu reseña: ${stars(filled)}` : 'Ya dejaste una reseña.'}
      </Text>
    );
  }
  if (!reviewable) return null;
  if (!reviewing) {
    return (
      <Pressable onPress={onOpen} style={styles.reviewButton} role="button">
        <Text style={styles.reviewText}>Dejar reseña</Text>
      </Pressable>
    );
  }
  return <ReviewForm bookingId={bookingId} submitting={submitting} error={error} onSubmit={onSubmit} onCancel={onCancel} />;
}

const styles = StyleSheet.create({
  reviewButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  reviewText: {
    fontSize: 15,
    fontFamily: font.bold,
    color: color.accentTeal,
  },
  reviewedText: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: font.semibold,
    color: color.textSecondary,
  },
});
