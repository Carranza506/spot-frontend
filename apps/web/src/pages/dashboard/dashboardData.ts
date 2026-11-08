import type { BusinessBookingsFilter, components } from '@spot/shared';
import { bookingsApi } from '../bookings/bookingsApi';
import { localIsoDate } from '../bookings/format';

type Booking = components['schemas']['Booking'];

/** The list endpoint's maximum page size. */
const MAX_PAGE_SIZE = 100;
const UPCOMING_COUNT = 5;
const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export interface DashboardData {
  total: number;
  pending: number;
  confirmed: number;
  revenue: number;
  week: { label: string; date: string; value: number }[];
  upcoming: Booking[];
}

/** Only the total: one row is enough, the count comes from the pagination. */
async function countBookings(businessId: string, filter: BusinessBookingsFilter = {}): Promise<number> {
  const page = await bookingsApi.list(businessId, { ...filter, page: 1, pageSize: 1 });
  return page.pagination.total;
}

/** Every page of a filtered list. */
// shortcut: reads every page (100 per request); move revenue and the weekly chart to a backend
// stats endpoint once a business has thousands of bookings.
async function listAllBookings(businessId: string, filter: BusinessBookingsFilter): Promise<Booking[]> {
  const bookings: Booking[] = [];
  for (let page = 1; ; page++) {
    const result = await bookingsApi.list(businessId, { ...filter, page, pageSize: MAX_PAGE_SIZE });
    bookings.push(...result.data);
    if (page >= result.pagination.totalPages) return bookings;
  }
}

/** Monday to Sunday of the week that contains `today`, as local dates (YYYY-MM-DD). */
export function currentWeek(today: Date): string[] {
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  return WEEKDAY_LABELS.map((_, i) => localIsoDate(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)));
}

/** Bookings per local day of the week, cancelled ones left out. */
export function bookingsPerDay(week: string[], bookings: Booking[]): DashboardData['week'] {
  const counts = new Map(week.map((date) => [date, 0]));
  for (const booking of bookings) {
    if (booking.status === 'CANCELLED') continue;
    const date = localIsoDate(new Date(booking.startAt));
    if (counts.has(date)) counts.set(date, counts.get(date)! + 1);
  }
  return week.map((date, i) => ({ label: WEEKDAY_LABELS[i], date, value: counts.get(date)! }));
}

/** The next pending or confirmed bookings that haven't started yet, earliest first. */
export function nextBookings(bookings: Booking[], now: Date): Booking[] {
  return bookings
    .filter((b) => (b.status === 'PENDING' || b.status === 'CONFIRMED') && new Date(b.startAt) >= now)
    .slice(0, UPCOMING_COUNT);
}

/** Everything the dashboard shows, read from the business's bookings (there's no stats endpoint). */
export async function loadDashboard(businessId: string, now = new Date()): Promise<DashboardData> {
  const week = currentWeek(now);
  const [total, pending, confirmed, completed, weekBookings, fromToday] = await Promise.all([
    countBookings(businessId),
    countBookings(businessId, { status: 'PENDING' }),
    countBookings(businessId, { status: 'CONFIRMED' }),
    listAllBookings(businessId, { status: 'COMPLETED' }),
    listAllBookings(businessId, { from: week[0], to: week[6] }),
    // Ordered by startAt; one page is plenty to find the next few active ones.
    bookingsApi.list(businessId, { from: localIsoDate(now), page: 1, pageSize: MAX_PAGE_SIZE }),
  ]);
  return {
    total,
    pending,
    confirmed,
    revenue: completed.reduce((sum, b) => sum + b.servicePrice, 0),
    week: bookingsPerDay(week, weekBookings),
    upcoming: nextBookings(fromToday.data, now),
  };
}
