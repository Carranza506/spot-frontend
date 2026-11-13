import { StyleSheet, Text, View } from 'react-native';
import { REVIEW_RATING_MAX, color, listBusinessReviews } from '@spot/shared';
import { authClient } from '@/api/client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { filledStars, stars } from '@/reviews/stars';
import { Section } from './Section';
import { font } from '@/theme/fonts';

const dateFormat = new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'short', year: 'numeric' });

export function ReviewsSection({ businessId }: { businessId: string }) {
  // shortcut: shows the latest 10 reviews only; add "ver más" paging once the reviews endpoint exists.
  const [state] = useAsyncData(() => listBusinessReviews(authClient, businessId, { pageSize: 10 }), [businessId]);

  return (
    <Section
      title="Reseñas"
      state={state}
      // The backend doesn't serve reviews yet: until it does, every load lands here without breaking the screen.
      errorMessage="Las reseñas no están disponibles por ahora."
      emptyMessage="Todavía no hay reseñas."
      isEmpty={(page) => page.data.length === 0}
    >
      {(page) =>
        page.data.map((review) => (
          <View key={review.id} style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.stars} accessibilityLabel={`${filledStars(review.rating)} de ${REVIEW_RATING_MAX} estrellas`}>
                {stars(filledStars(review.rating))}
              </Text>
              <Text style={styles.date}>{dateFormat.format(new Date(review.createdAt))}</Text>
            </View>
            {/* Same as web's ReviewRow. */}
            <Text style={styles.comment}>{review.comment?.trim() || 'Sin comentario.'}</Text>
          </View>
        ))
      }
    </Section>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 6,
    padding: 16,
    borderRadius: 14,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stars: {
    fontSize: 16,
    fontFamily: font.regular,
    color: color.accentAmber,
  },
  date: {
    fontSize: 13,
    fontFamily: font.regular,
    color: color.textSecondary,
  },
  comment: {
    fontSize: 14,
    fontFamily: font.regular,
    lineHeight: 20,
    color: color.textPrimary,
  },
});
