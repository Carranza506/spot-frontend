import type { components } from '@spot/shared';

type Booking = components['schemas']['Booking'];

/** The soonest PENDING or CONFIRMED booking that hasn't started, or null. */
export function soonestUpcoming(bookings: readonly Booking[], now: number): Booking | null {
  return bookings
    .filter((b) => (b.status === 'PENDING' || b.status === 'CONFIRMED') && Date.parse(b.startAt) > now)
    .reduce<Booking | null>((soonest, b) => (!soonest || Date.parse(b.startAt) < Date.parse(soonest.startAt) ? b : soonest), null);
}
