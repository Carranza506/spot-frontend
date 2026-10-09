import type { components } from '../api/schema';

type BookingStatus = components['schemas']['BookingStatus'];

export type BookingAction = 'cancel' | 'complete' | 'noShow';

/** Mirrors the cancel request's `reason` maxLength in contracts/spot-api.yaml. */
export const BOOKING_CANCEL_REASON_MAX_LENGTH = 255;

// The contract's valid source states per transition: cancel from PENDING or CONFIRMED,
// complete and no-show only from CONFIRMED. Any other combination is a 422.
const ACTIONS_BY_STATUS: Record<BookingStatus, BookingAction[]> = {
  PENDING: ['cancel'],
  CONFIRMED: ['cancel', 'complete', 'noShow'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

/** The transitions a business owner may trigger on a booking in `status`. */
export function allowedBookingActions(status: BookingStatus): BookingAction[] {
  return ACTIONS_BY_STATUS[status];
}
