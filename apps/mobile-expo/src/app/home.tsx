import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { color, getOwnProfile, logout, type components } from '@spot/shared';
import { authClient } from '@/api/client';
import { PrimaryButton } from '@/components/PrimaryButton';

type User = components['schemas']['User'];

export default function HomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

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
        <PrimaryButton title="Cerrar sesión" onPress={handleLogout} loading={loggingOut} />
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
  welcome: {
    fontSize: 20,
    fontWeight: '700',
    color: color.textPrimary,
    textAlign: 'center',
  },
});
