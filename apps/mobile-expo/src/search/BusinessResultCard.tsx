import { StyleSheet, Text, View } from 'react-native';
import { color, type components } from '@spot/shared';
import { FavoriteButton } from '@/favorites/FavoriteButton';

type Business = components['schemas']['Business'];

/** One search result. The heart shares FavoritesProvider's state with every other screen (#28). */
export function BusinessResultCard({ business }: { business: Business }) {
  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{business.name.trim().charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {business.name}
        </Text>
        {business.description && (
          <Text style={styles.description} numberOfLines={2}>
            {business.description}
          </Text>
        )}
      </View>
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: color.panelDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: color.onPanelDark,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: color.textPrimary,
  },
  description: {
    fontSize: 14,
    color: color.textSecondary,
  },
});
