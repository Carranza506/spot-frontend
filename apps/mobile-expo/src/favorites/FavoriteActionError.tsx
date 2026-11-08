import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { color } from '@spot/shared';
import { ErrorMessage } from '@/components/ErrorMessage';
import { useFavorites } from './FavoritesProvider';

/** Why the heart just tapped went back: over the content, since the card may be far down the list. */
export function FavoriteActionError() {
  const { actionError, clearActionError } = useFavorites();

  // A failure on one screen doesn't follow the user to the next.
  useFocusEffect(
    useCallback(() => {
      clearActionError();
      return clearActionError;
    }, [clearActionError]),
  );

  if (!actionError) return null;
  return (
    <View style={styles.region}>
      <View style={styles.card}>
        <ErrorMessage>{actionError}</ErrorMessage>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  region: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 16,
    alignItems: 'center',
    // The message never blocks the buttons under it.
    pointerEvents: 'none',
  },
  card: {
    maxWidth: 360,
    backgroundColor: color.surface,
    borderRadius: 8,
    boxShadow: '0 8px 24px rgba(21, 42, 38, 0.12)',
  },
});
