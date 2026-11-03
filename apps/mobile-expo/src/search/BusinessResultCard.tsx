import { StyleSheet, View } from 'react-native';
import { color, type components } from '@spot/shared';
import { BusinessLinkArea } from '@/components/business/BusinessLinkArea';
import { FavoriteButton } from '@/favorites/FavoriteButton';

type Business = components['schemas']['Business'];

/** One search result. The heart shares FavoritesProvider's state with every other screen (#28). */
export function BusinessResultCard({ business }: { business: Business }) {
  return (
    <View style={styles.card}>
      <BusinessLinkArea business={business} />
      <FavoriteButton business={business} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
});
