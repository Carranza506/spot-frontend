import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { color, type components } from '@spot/shared';
import { useFavorites } from './FavoritesProvider';

type Business = components['schemas']['Business'];

const HEART_PATH =
  'M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.4.7-1.2 2.2-2.4 4.3-2.4 3.7 0 5.8 3.8 4.3 7.2C19.5 16.4 12 21 12 21z';

interface FavoriteButtonProps {
  business: Business;
  size?: number;
}

/**
 * Heart toggle for a business, backed by FavoritesProvider so it shows the same state wherever it
 * appears (favorites list, search results, business detail).
 */
export function FavoriteButton({ business, size = 26 }: FavoriteButtonProps) {
  const { ensureLoaded, isFavorite, isPending, toggle } = useFavorites();
  const favorite = isFavorite(business.id);
  const pending = isPending(business.id);

  useEffect(ensureLoaded, [ensureLoaded]);

  return (
    <Pressable
      onPress={() => void toggle(business)}
      disabled={pending}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ selected: favorite, busy: pending }}
      accessibilityLabel={favorite ? `Quitar ${business.name} de favoritos` : `Agregar ${business.name} a favoritos`}
      style={({ pressed }) => [styles.button, (pressed || pending) && styles.dimmed]}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d={HEART_PATH}
          fill={favorite ? color.danger : 'none'}
          stroke={favorite ? color.danger : color.textSecondary}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 4,
  },
  dimmed: {
    opacity: 0.5,
  },
});
