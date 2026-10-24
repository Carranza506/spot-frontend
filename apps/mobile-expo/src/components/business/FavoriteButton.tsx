import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { addFavoriteBusiness, color, isFavoriteBusiness, removeFavoriteBusiness } from '@spot/shared';
import { authClient } from '@/api/client';
import { useAsyncData } from '@/hooks/useAsyncData';

/**
 * Favorites are CLIENT-only: for any other role (or when the initial state can't be read) the
 * lookup fails and the button stays hidden instead of offering a toggle that can't work.
 */
export function FavoriteButton({ businessId }: { businessId: string }) {
  const [initial] = useAsyncData(() => isFavoriteBusiness(authClient, businessId), [businessId]);
  // null until the user toggles; from then on it overrides the initial lookup.
  const [override, setOverride] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  if (initial.status !== 'loaded') return null;
  const isFavorite = override ?? initial.data;

  async function toggle() {
    const next = !isFavorite;
    setOverride(next); // optimistic
    setFailed(false);
    setSaving(true);
    try {
      await (next ? addFavoriteBusiness : removeFavoriteBusiness)(authClient, businessId);
    } catch {
      setOverride(!next);
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPress={toggle}
        // One request at a time, so a quick double tap can't leave the server and the UI disagreeing.
        disabled={saving}
        accessibilityRole="button"
        accessibilityState={{ selected: isFavorite, busy: saving }}
        style={[styles.button, isFavorite && styles.buttonActive]}
      >
        <Text style={[styles.text, isFavorite && styles.textActive]}>
          {isFavorite ? '♥ En favoritos' : '♡ Agregar a favoritos'}
        </Text>
      </Pressable>
      {failed ? <Text style={styles.error}>No se pudo actualizar tus favoritos. Intentá de nuevo.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    alignItems: 'flex-start',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: color.accentTeal,
  },
  buttonActive: {
    backgroundColor: color.accentTeal,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    color: color.accentTeal,
  },
  textActive: {
    color: color.onPanelDark,
  },
  error: {
    fontSize: 13,
    color: color.danger,
  },
});
