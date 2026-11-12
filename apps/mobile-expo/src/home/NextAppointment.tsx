import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { color, getBusiness, listOwnBookings, type components } from '@spot/shared';
import { authClient } from '@/api/client';
import { formatBusinessShortDateTime } from '@/bookings/format';
import { soonestUpcoming } from '@/bookings/upcoming';

type Booking = components['schemas']['Booking'];

// shortcut: one page of each active status (newest start first); a client with more than this many
// upcoming bookings would miss the soonest. Upgrade with a from/sort filter on listOwnBookings.
const PAGE_SIZE = 50;

/**
 * "Tu próxima cita" (#101): the client's next booking as the sunflower ticket, first thing on the
 * home. Refreshed on focus, so it shows a booking made a moment ago. Nothing when there's none.
 */
export function NextAppointment() {
  const [next, setNext] = useState<{ booking: Booking; businessName?: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        listOwnBookings(authClient, { pageSize: PAGE_SIZE, status: 'CONFIRMED' }),
        listOwnBookings(authClient, { pageSize: PAGE_SIZE, status: 'PENDING' }),
      ])
        .then(async ([confirmed, pending]) => {
          const booking = soonestUpcoming([...confirmed.data, ...pending.data], Date.now());
          if (!booking) return active && setNext(null);
          if (active) setNext({ booking });
          // The name is a nicety: without it the ticket still shows the service and the time.
          const business = await getBusiness(authClient, booking.businessId).catch(() => null);
          if (active && business) setNext({ booking, businessName: business.name });
        })
        // Only a shortcut on the home: Mis reservas has the full list and its own errors.
        .catch(() => active && setNext(null));
      return () => {
        active = false;
      };
    }, []),
  );

  if (!next) return null;
  const { booking, businessName } = next;
  const confirmed = booking.status === 'CONFIRMED';
  const what = businessName ? `${booking.serviceName} · ${businessName}` : booking.serviceName;
  const when = formatBusinessShortDateTime(booking.startAt);

  return (
    <View style={styles.section}>
      <Text style={styles.heading} role="heading" aria-level={2}>
        Tu próxima cita
      </Text>
      <Pressable
        onPress={() => router.push('/bookings')}
        accessibilityRole="button"
        accessibilityLabel={`Tu próxima cita: ${when}, ${what}, ${confirmed ? 'confirmada' : 'pendiente de confirmación'}. Ver mis reservas.`}
        style={({ pressed }) => [styles.ticket, pressed && styles.pressed]}
      >
        {/* The notches that make the slot a ticket: the brand's mark for a time slot. */}
        <View style={[styles.notch, styles.notchLeft]} />
        <View style={[styles.notch, styles.notchRight]} />
        <View style={styles.row}>
          <Text style={styles.when} numberOfLines={1}>
            {when}
          </Text>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{confirmed ? 'Confirmada' : 'Pendiente'}</Text>
          </View>
        </View>
        <Text style={styles.what} numberOfLines={1}>
          {what}
        </Text>
      </Pressable>
    </View>
  );
}

const NOTCH = 16;

const styles = StyleSheet.create({
  section: {
    gap: 10,
    marginBottom: 20,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: color.textPrimary,
  },
  ticket: {
    backgroundColor: color.accentAmber,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 6,
  },
  pressed: {
    opacity: 0.85,
  },
  notch: {
    position: 'absolute',
    top: '50%',
    marginTop: -NOTCH / 2,
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    backgroundColor: color.background,
  },
  notchLeft: {
    left: -NOTCH / 2,
  },
  notchRight: {
    right: -NOTCH / 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  when: {
    flexShrink: 1,
    fontSize: 20,
    fontWeight: '800',
    color: color.panelDark,
  },
  chip: {
    backgroundColor: color.panelDark,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: color.accentAmber,
  },
  what: {
    fontSize: 14,
    fontWeight: '600',
    color: color.panelDark,
  },
});
