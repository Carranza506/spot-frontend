import { StyleSheet, Text, View } from 'react-native';
import { color, listBusinessReviews } from '@spot/shared';
import { authClient } from '@/api/client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { Section } from './Section';

const dateFormat = new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'short', year: 'numeric' });

// Clamped once, so the stars and their screen-reader label always agree (never "7 de 5").
function filledStars(rating: number): number {
  return Math.max(0, Math.min(5, Math.round(rating) || 0));
}

function stars(filled: number): string {
  return '★'.repeat(filled) + '☆'.repeat(5 - filled);
}

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
              <Text style={styles.stars} accessibilityLabel={`${filledStars(review.rating)} de 5 estrellas`}>
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
    color: color.accentAmber,
  },
  date: {
    fontSize: 13,
    color: color.textSecondary,
  },
  comment: {
    fontSize: 14,
    lineHeight: 20,
    color: color.textPrimary,
  },
});
