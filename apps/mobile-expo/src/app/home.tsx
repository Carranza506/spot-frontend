import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { color, getOwnProfile, logout, type components } from '@spot/shared';
import { authClient } from '@/api/client';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useFavorites } from '@/favorites/FavoritesProvider';

type User = components['schemas']['User'];

export default function HomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const favorites = useFavorites();

  useEffect(() => {
    getOwnProfile(authClient)
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout(authClient);
    } finally {
      // The next account must not see this one's favorites.
      favorites.reset();
      router.replace('/');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator color={color.accentTeal} />
        ) : (
          <Text style={styles.welcome}>
            Bienvenida/o {user?.firstName} {user?.lastName}
          </Text>
        )}
        <View style={styles.actions}>
          <PrimaryButton title="Mis favoritos" onPress={() => router.push('/favorites')} />
          <PrimaryButton title="Cerrar sesión" onPress={handleLogout} loading={loggingOut} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: color.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 24,
  },
  // Full-width buttons (PrimaryButton has no horizontal padding of its own), capped on wide screens.
  actions: {
    width: '100%',
    maxWidth: 320,
    gap: 12,
  },
  welcome: {
    fontSize: 20,
    fontWeight: '700',
    color: color.textPrimary,
    textAlign: 'center',
  },
});
