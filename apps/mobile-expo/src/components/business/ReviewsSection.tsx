import { StyleSheet, Text, View } from 'react-native';
import { color, listBusinessReviews } from '@spot/shared';
import { authClient } from '@/api/client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { Section } from './Section';

const dateFormat = new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'short', year: 'numeric' });

function stars(rating: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
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
              <Text style={styles.stars} accessibilityLabel={`${review.rating} de 5 estrellas`}>
                {stars(review.rating)}
              </Text>
              <Text style={styles.date}>{dateFormat.format(new Date(review.createdAt))}</Text>
            </View>
            {review.comment?.trim() ? <Text style={styles.comment}>{review.comment}</Text> : null}
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
