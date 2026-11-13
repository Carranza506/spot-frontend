import type { BusinessBookingsFilter, components } from '@spot/shared';
import { bookingsApi } from '../bookings/bookingsApi';
import { localIsoDate } from '../bookings/format';

type Booking = components['schemas']['Booking'];

/** The list endpoint's maximum page size. */
const MAX_PAGE_SIZE = 100;
const TO_CONFIRM_COUNT = 5;
/** The agenda always shows at least this span, so a quiet day still reads as a day. */
const DEFAULT_FIRST_HOUR = 8;
const DEFAULT_LAST_HOUR = 17;

export interface AgendaHour {
  hour: number;
  bookings: Booking[];
}

export interface DashboardData {
  /** Today's bookings, by the local hour they start in; cancelled ones left out. */
  agenda: AgendaHour[];
  todayCount: number;
  /** This week's bookings that weren't cancelled, and what they add up to (no-shows left out). */
  weekCount: number;
  weekIncome: number;
  /** The next pending bookings that haven't started, earliest first. */
  toConfirm: Booking[];
  toConfirmTotal: number;
}

/** Every page of a filtered list. */
// shortcut: reads every page (100 per request); move the week's figures to a backend stats endpoint
// once a business has thousands of bookings a week.
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
  return Array.from({ length: 7 }, (_, i) => localIsoDate(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)));
}

/**
 * One row per local hour from 8:00 to 17:00, stretched to the day's first and last booking, each
 * with the bookings that start in it, in time order. Cancelled bookings aren't on the agenda.
 */
export function agendaByHour(bookings: Booking[]): AgendaHour[] {
  const active = bookings
    .filter((b) => b.status !== 'CANCELLED')
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  const hourOf = (b: Booking) => new Date(b.startAt).getHours();
  const first = Math.min(DEFAULT_FIRST_HOUR, ...active.map(hourOf));
  const last = Math.max(DEFAULT_LAST_HOUR, ...active.map(hourOf));
  return Array.from({ length: last - first + 1 }, (_, i) => ({
    hour: first + i,
    bookings: active.filter((b) => hourOf(b) === first + i),
  }));
}

/** The week's bookings that count: not cancelled; the income leaves no-shows out too. */
export function weekSummary(bookings: Booking[]): { count: number; income: number } {
  const counted = bookings.filter((b) => b.status !== 'CANCELLED');
  const income = counted.filter((b) => b.status !== 'NO_SHOW').reduce((sum, b) => sum + b.servicePrice, 0);
  return { count: counted.length, income };
}

/** Everything the Hoy view shows, read from the business's bookings (there's no stats endpoint). */
export async function loadDashboard(businessId: string, now = new Date()): Promise<DashboardData> {
  const today = localIsoDate(now);
  const week = currentWeek(now);
  const [todayBookings, weekBookings, pending] = await Promise.all([
    listAllBookings(businessId, { from: today, to: today }),
    listAllBookings(businessId, { from: week[0], to: week[6] }),
    // Ordered by startAt; the next few pending ones are on the first page.
    bookingsApi.list(businessId, { status: 'PENDING', from: today, page: 1, pageSize: MAX_PAGE_SIZE }),
  ]);
  const upcomingPending = pending.data.filter((b) => Date.parse(b.startAt) >= now.getTime());
  const summary = weekSummary(weekBookings);
  return {
    agenda: agendaByHour(todayBookings),
    todayCount: todayBookings.filter((b) => b.status !== 'CANCELLED').length,
    weekCount: summary.count,
    weekIncome: summary.income,
    toConfirm: upcomingPending.slice(0, TO_CONFIRM_COUNT),
    toConfirmTotal: upcomingPending.length,
  };
}
