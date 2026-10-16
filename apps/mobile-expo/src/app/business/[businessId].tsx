import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ApiError, color, getBusiness, type components } from '@spot/shared';
import { authClient } from '@/api/client';
import { BusinessHeader } from '@/components/business/BusinessHeader';
import { PrimaryButton } from '@/components/PrimaryButton';

type Business = components['schemas']['Business'];

type LoadState =
  | { status: 'loading' }
  | { status: 'loaded'; business: Business }
  | { status: 'notFound' }
  | { status: 'error' };

export default function BusinessDetailScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Ignores a response that arrives after leaving the screen or switching business.
    let ignore = false;
    setState({ status: 'loading' });
    getBusiness(authClient, businessId)
      .then((business) => !ignore && setState({ status: 'loaded', business }))
      .catch((error: unknown) => {
        if (ignore) return;
        setState({ status: error instanceof ApiError && error.status === 404 ? 'notFound' : 'error' });
      });
    return () => {
      ignore = true;
    };
  }, [businessId, attempt]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Opened from a deep link there's no history to go back to. */}
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
        accessibilityRole="button"
        style={styles.back}
      >
        <Text style={styles.backText}>‹ Volver</Text>
      </Pressable>

      {state.status === 'loading' ? (
        <ActivityIndicator style={styles.centered} color={color.accentTeal} />
      ) : state.status === 'notFound' ? (
        <View style={styles.centered}>
          <Text style={styles.message}>Este negocio no existe o ya no está disponible.</Text>
        </View>
      ) : state.status === 'error' ? (
        <View style={styles.centered}>
          <Text style={styles.message}>No se pudo cargar el negocio. Revisá tu conexión.</Text>
          <PrimaryButton title="Reintentar" onPress={() => setAttempt((n) => n + 1)} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <BusinessHeader business={state.business} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: color.background,
  },
  back: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: color.accentTeal,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  message: {
    fontSize: 16,
    color: color.textSecondary,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 24,
  },
});
