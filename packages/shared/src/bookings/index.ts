import type { ApiClient } from '../api/client';
import type { components, operations } from '../api/schema';

type Booking = components['schemas']['Booking'];
type BookingStatus = components['schemas']['BookingStatus'];
type PaginatedBookings = components['schemas']['PaginatedBookings'];
type BookingCancelRequest = NonNullable<operations['cancelBooking']['requestBody']>['content']['application/json'];

export { BOOKING_CANCEL_REASON_MAX_LENGTH, allowedBookingActions, type BookingAction } from './transitions';

export interface BusinessBookingsFilter {
  page?: number;
  pageSize?: number;
  status?: BookingStatus;
  /** YYYY-MM-DD, inclusive. */
  from?: string;
  /** YYYY-MM-DD, inclusive. */
  to?: string;
}

function bookingPath(bookingId: string): string {
  return `/booking/bookings/${encodeURIComponent(bookingId)}`;
}

/** A page of the bookings of a business the authenticated BUSINESS account owns, optionally filtered. */
export function listBusinessBookings(
  client: Pick<ApiClient, 'apiFetch'>,
  businessId: string,
  { page = 1, pageSize = 20, status, from, to }: BusinessBookingsFilter = {},
): Promise<PaginatedBookings> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) query.set('status', status);
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  return client.apiFetch<PaginatedBookings>(
    `/booking/businesses/${encodeURIComponent(businessId)}/bookings?${query}`,
  );
}

/** PENDING/CONFIRMED → CANCELLED (422 from any other status). */
export function cancelBooking(
  client: Pick<ApiClient, 'apiFetch'>,
  bookingId: string,
  data: BookingCancelRequest = {},
): Promise<Booking> {
  return client.apiFetch<Booking>(`${bookingPath(bookingId)}/cancel`, { method: 'POST', body: data });
}

/** CONFIRMED → COMPLETED (422 from any other status). Business owner only. */
export function completeBooking(client: Pick<ApiClient, 'apiFetch'>, bookingId: string): Promise<Booking> {
  return client.apiFetch<Booking>(`${bookingPath(bookingId)}/complete`, { method: 'POST' });
}

/** CONFIRMED → NO_SHOW (422 from any other status). Business owner only. */
export function markBookingNoShow(client: Pick<ApiClient, 'apiFetch'>, bookingId: string): Promise<Booking> {
  return client.apiFetch<Booking>(`${bookingPath(bookingId)}/no-show`, { method: 'POST' });
}
