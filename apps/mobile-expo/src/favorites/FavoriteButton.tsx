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
  const { status, ensureLoaded, isFavorite, isPending, toggle } = useFavorites();
  const favorite = isFavorite(business.id);
  const pending = isPending(business.id);
  // Until the favorites are loaded the heart can't know whether this business is one, so a tap
  // would add one that is already saved: it stays disabled.
  const ready = status === 'ready';
  const disabled = pending || !ready;

  useEffect(ensureLoaded, [ensureLoaded]);

  return (
    <Pressable
      onPress={() => void toggle(business)}
      disabled={disabled}
      hitSlop={4}
      // An on/off setting: a switch whose label stays the same while its state changes, so a screen
      // reader says "Favorito: Spa, switch, on" instead of an action that flips with the state.
      accessible
      role="switch"
      aria-checked={favorite}
      aria-busy={pending}
      aria-disabled={disabled}
      aria-label={`Favorito: ${business.name}`}
      style={({ pressed }) => [styles.button, (pressed || disabled) && styles.dimmed]}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
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
  // 44 x 44 on every platform (hitSlop doesn't enlarge the element on web).
  button: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: {
    opacity: 0.5,
  },
});
