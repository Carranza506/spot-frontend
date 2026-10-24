import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ApiError, color, getBusiness } from '@spot/shared';
import { authClient } from '@/api/client';
import { BusinessHeader } from '@/components/business/BusinessHeader';
import { FavoriteButton } from '@/components/business/FavoriteButton';
import { PhotosSection } from '@/components/business/PhotosSection';
import { ReviewsSection } from '@/components/business/ReviewsSection';
import { ServicesSection } from '@/components/business/ServicesSection';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAsyncData } from '@/hooks/useAsyncData';

export default function BusinessDetailScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();
  const [state, reload] = useAsyncData(() => getBusiness(authClient, businessId), [businessId]);

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
      ) : state.status === 'error' && state.error instanceof ApiError && state.error.status === 404 ? (
        <View style={styles.centered}>
          <Text style={styles.message}>Este negocio no existe o ya no está disponible.</Text>
        </View>
      ) : state.status === 'error' ? (
        <View style={styles.centered}>
          <Text style={styles.message}>No se pudo cargar el negocio. Revisá tu conexión.</Text>
          <PrimaryButton title="Reintentar" onPress={reload} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <BusinessHeader business={state.data} />
          <FavoriteButton businessId={businessId} />
          <PhotosSection businessId={businessId} businessName={state.data.name} />
          <ServicesSection businessId={businessId} />
          <ReviewsSection businessId={businessId} />
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
    gap: 28,
  },
});
