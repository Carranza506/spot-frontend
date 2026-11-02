import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { color, formatPrice, listBusinessServices } from '@spot/shared';
import { authClient } from '@/api/client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { Section } from './Section';

export function ServicesSection({ businessId }: { businessId: string }) {
  // shortcut: shows the first 50 active services only; add paging if a business ever has more.
  const [state] = useAsyncData(
    () => listBusinessServices(authClient, businessId, { pageSize: 50, isActive: true }),
    [businessId],
  );

  return (
    <Section
      title="Servicios"
      state={state}
      errorMessage="No se pudieron cargar los servicios."
      emptyMessage="Este negocio todavía no tiene servicios."
      isEmpty={(page) => page.data.length === 0}
    >
      {(page) =>
        page.data.map((service) => (
          <View key={service.id} style={styles.card}>
            <Text style={styles.name}>{service.name}</Text>
            {service.description ? <Text style={styles.description}>{service.description}</Text> : null}
            <Text style={styles.meta}>
              {service.durationMinutes} min · {formatPrice(service.price)}
            </Text>
            <Pressable
              onPress={() => router.push({ pathname: '/book/[businessId]', params: { businessId, serviceId: service.id } })}
              accessibilityRole="button"
              accessibilityLabel={`Reservar ${service.name}`}
              style={styles.book}
            >
              <Text style={styles.bookText}>Reservar</Text>
            </Pressable>
          </View>
        ))
      }
    </Section>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 4,
    padding: 16,
    borderRadius: 14,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
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
  meta: {
    fontSize: 14,
    fontWeight: '600',
    color: color.accentTeal,
  },
  // A 44 px touch target, aligned with the card's text.
  book: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  bookText: {
    fontSize: 15,
    fontWeight: '700',
    color: color.accentTeal,
  },
});
