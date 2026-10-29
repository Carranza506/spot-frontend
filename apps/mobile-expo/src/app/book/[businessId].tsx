import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ApiError, color, createBooking, getBusinessAvailability, type components } from '@spot/shared';
import { authClient } from '@/api/client';
import { PrimaryButton } from '@/components/PrimaryButton';

type AvailabilityDay = components['schemas']['AvailabilityDay'];
type AvailabilitySlot = components['schemas']['AvailabilitySlot'];
type Booking = components['schemas']['Booking'];

type LoadState = { status: 'loading' } | { status: 'loaded'; days: AvailabilityDay[] } | { status: 'error'; error: unknown };

// Every business's schedule is in Costa Rica time (see Spot.Booking.Api's BusinessTimeZone), so
// "today" and the slot times are always shown in that zone, whatever zone the phone is set to.
const BUSINESS_TIME_ZONE = 'America/Costa_Rica';
const DAYS_SHOWN = 7;

const todayFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const timeFormat = new Intl.DateTimeFormat('es-CR', { timeZone: BUSINESS_TIME_ZONE, hour: 'numeric', minute: '2-digit' });
const bookingDateFormat = new Intl.DateTimeFormat('es-CR', {
  timeZone: BUSINESS_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
// Availability dates are already the business's local dates (YYYY-MM-DD): formatted at UTC noon in
// UTC so the device's own zone can never shift them to the previous or next day.
const dayChipFormat = new Intl.DateTimeFormat('es-CR', { timeZone: 'UTC', weekday: 'short', day: 'numeric' });
const longDateFormat = new Intl.DateTimeFormat('es-CR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });

/** Today's date in Costa Rica as YYYY-MM-DD. */
function todayInBusinessTimeZone(): string {
  const parts = Object.fromEntries(todayFormat.formatToParts(new Date()).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Adds whole days to a YYYY-MM-DD date, without involving any time zone. */
function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function dateAtNoonUtc(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

/** The message for a failed booking, by the API's error code where it tells the user what to do. */
function bookingErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor. Intentá de nuevo.';
  if (error.code === 'BOOKING_SLOT_OVERLAP') return 'Ese horario se acaba de ocupar. Elegí otro.';
  if (error.code === 'BOOKING_START_IN_PAST') return 'Ese horario ya pasó. Elegí otro.';
  if (error.code === 'BOOKING_OUTSIDE_BUSINESS_HOURS') return 'El negocio no atiende en ese horario. Elegí otro.';
  if (error.status === 404) return 'Este negocio o servicio ya no está disponible.';
  return 'No se pudo crear la reserva. Intentá de nuevo.';
}

export default function BookingScreen() {
  const { businessId, serviceId } = useLocalSearchParams<{ businessId: string; serviceId?: string }>();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!serviceId) return;
    let ignore = false;
    setState({ status: 'loading' });
    // One call for the whole week: switching days below never goes back to the server.
    const from = todayInBusinessTimeZone();
    getBusinessAvailability(authClient, businessId, { from, to: addDays(from, DAYS_SHOWN - 1), serviceId })
      .then((availability) => !ignore && setState({ status: 'loaded', days: availability.days }))
      .catch((error: unknown) => !ignore && setState({ status: 'error', error }));
    return () => {
      ignore = true;
    };
  }, [businessId, serviceId, attempt]);

  function goBack() {
    // Opened from a deep link there's no history to go back to.
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  }

  function reload() {
    setSelectedSlot(null);
    setAttempt((n) => n + 1);
  }

  async function handleConfirm() {
    if (!selectedSlot || !serviceId) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      // The slot's own startAt, exactly as availability returned it: never rebuilt from the time shown.
      setBooking(await createBooking(authClient, { businessId, serviceId, startAt: selectedSlot.startAt }));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.replace('/');
        return;
      }
      setSubmitError(bookingErrorMessage(error));
      // The slot list is stale: the slot was taken, or it's no longer within opening hours.
      if (error instanceof ApiError && (error.status === 409 || error.status === 422)) reload();
    } finally {
      setSubmitting(false);
    }
  }

  const selectedDay =
    state.status === 'loaded' ? (state.days.find((day) => day.date === selectedDate) ?? state.days[0]) : undefined;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Pressable onPress={goBack} accessibilityRole="button" style={styles.back}>
        <Text style={styles.backText}>‹ Volver</Text>
      </Pressable>

      {!serviceId ? (
        <View style={styles.centered}>
          <Text style={styles.message}>Elegí un servicio para ver los horarios disponibles.</Text>
        </View>
      ) : booking ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title} accessibilityRole="header">
            ¡Reserva creada!
          </Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{booking.serviceName}</Text>
            <Text style={styles.cardText}>
              {bookingDateFormat.format(new Date(booking.startAt))} a las {timeFormat.format(new Date(booking.startAt))}
            </Text>
            <Text style={styles.cardMeta}>{booking.serviceDurationMinutes} min</Text>
          </View>
          <PrimaryButton title="Listo" onPress={goBack} />
        </ScrollView>
      ) : state.status === 'loading' ? (
        <ActivityIndicator style={styles.centered} color={color.accentTeal} />
      ) : state.status === 'error' && state.error instanceof ApiError && state.error.status === 404 ? (
        <View style={styles.centered}>
          <Text style={styles.message}>Este negocio o servicio ya no está disponible.</Text>
        </View>
      ) : state.status === 'error' ? (
        <View style={styles.centered}>
          <Text style={styles.message}>No se pudieron cargar los horarios. Revisá tu conexión.</Text>
          <PrimaryButton title="Reintentar" onPress={reload} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title} accessibilityRole="header">
            Reservá tu cita
          </Text>
          {submitError ? <Text style={styles.error}>{submitError}</Text> : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              Día
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {state.days.map((day) => {
                const isSelected = day.date === selectedDay?.date;
                return (
                  <Pressable
                    key={day.date}
                    onPress={() => {
                      setSelectedDate(day.date);
                      setSelectedSlot(null);
                      setSubmitError(null);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    style={[styles.chip, isSelected && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {dayChipFormat.format(dateAtNoonUtc(day.date))}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              Horarios
            </Text>
            {!selectedDay || selectedDay.isClosed ? (
              <Text style={styles.message}>El negocio no abre este día.</Text>
            ) : selectedDay.slots.length === 0 ? (
              <Text style={styles.message}>No quedan horarios libres este día.</Text>
            ) : (
              <View style={styles.slotGrid}>
                {selectedDay.slots.map((slot) => {
                  const isSelected = slot.startAt === selectedSlot?.startAt;
                  return (
                    <Pressable
                      key={slot.startAt}
                      onPress={() => {
                        setSelectedSlot(slot);
                        setSubmitError(null);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      style={[styles.chip, isSelected && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {timeFormat.format(new Date(slot.startAt))}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {selectedSlot && selectedDay ? (
            <View style={styles.card}>
              <Text style={styles.cardText}>
                ¿Confirmar tu reserva el {longDateFormat.format(dateAtNoonUtc(selectedDay.date))} a las{' '}
                {timeFormat.format(new Date(selectedSlot.startAt))}?
              </Text>
              <PrimaryButton title="Confirmar reserva" onPress={handleConfirm} loading={submitting} />
            </View>
          ) : null}
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: color.textPrimary,
  },
  error: {
    fontSize: 14,
    color: color.danger,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: color.textPrimary,
  },
  chipRow: {
    gap: 8,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: color.accentTeal,
  },
  chipActive: {
    backgroundColor: color.accentTeal,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: color.accentTeal,
  },
  chipTextActive: {
    color: color.onPanelDark,
  },
  card: {
    gap: 4,
    padding: 16,
    borderRadius: 14,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: color.textPrimary,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
    color: color.textPrimary,
  },
  cardMeta: {
    fontSize: 14,
    fontWeight: '600',
    color: color.accentTeal,
  },
});
