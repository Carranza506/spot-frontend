import {
  cancelBooking,
  completeBooking,
  listBusinessBookings,
  markBookingNoShow,
  type BusinessBookingsFilter,
  type components,
} from '@spot/shared';
import { authClient } from '../../api/client';

type Booking = components['schemas']['Booking'];
type PaginatedBookings = components['schemas']['PaginatedBookings'];

/** What the Reservaciones view needs from the booking endpoints. */
export interface BookingsApi {
  list(businessId: string, filter: BusinessBookingsFilter): Promise<PaginatedBookings>;
  cancel(bookingId: string, reason?: string): Promise<Booking>;
  complete(bookingId: string): Promise<Booking>;
  markNoShow(bookingId: string): Promise<Booking>;
}

export const bookingsApi: BookingsApi = {
  list: (businessId, filter) => listBusinessBookings(authClient, businessId, filter),
  cancel: (bookingId, reason) => cancelBooking(authClient, bookingId, reason ? { reason } : {}),
  complete: (bookingId) => completeBooking(authClient, bookingId),
  markNoShow: (bookingId) => markBookingNoShow(authClient, bookingId),
};
