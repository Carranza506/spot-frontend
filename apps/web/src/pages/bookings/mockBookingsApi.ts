import { ApiError, allowedBookingActions, type BookingAction, type components } from '@spot/shared';
import type { BookingsApi } from './bookingsApi';
import { localIsoDate } from './format';

type Booking = components['schemas']['Booking'];
type BookingStatus = components['schemas']['BookingStatus'];

// In-browser stand-in for listBusinessBookings and the cancel/complete/no-show transitions,
// which spot-backend doesn't serve yet (#68, #69). Enabled with VITE_BOOKINGS_MOCK=true.
// Seeds a sample week of bookings per business in localStorage and reproduces the contract's
// 404 and 422 (invalid transition) responses. Open the page in two tabs and act on the same
// booking in both to see the 422 path. Delete once those endpoints are live.

const STORAGE_PREFIX = 'spot.bookingsMock.';
const LATENCY_MS = 300;

const SAMPLE_SERVICES = [
  { serviceName: 'Corte de cabello', servicePrice: 6000, serviceDurationMinutes: 30 },
  { serviceName: 'Corte y peinado', servicePrice: 9500, serviceDurationMinutes: 60 },
  { serviceName: 'Manicure', servicePrice: 7000, serviceDurationMinutes: 45 },
  { serviceName: 'Tinte completo', servicePrice: 25000, serviceDurationMinutes: 120 },
];

// [day offset from today, hour, status]: past days end in a final status, upcoming ones are active.
const SAMPLE_SCHEDULE: [number, number, BookingStatus][] = [
  [-3, 9, 'COMPLETED'],
  [-3, 14, 'NO_SHOW'],
  [-2, 10, 'COMPLETED'],
  [-1, 11, 'CANCELLED'],
  [-1, 15, 'CONFIRMED'],
  [0, 9, 'CONFIRMED'],
  [0, 11, 'PENDING'],
  [0, 16, 'CONFIRMED'],
  [1, 10, 'PENDING'],
  [1, 13, 'CONFIRMED'],
  [2, 9, 'CONFIRMED'],
  [3, 15, 'PENDING'],
  [5, 10, 'CANCELLED'],
  [6, 12, 'CONFIRMED'],
];

const TARGET_STATUS: Record<BookingAction, BookingStatus> = {
  cancel: 'CANCELLED',
  complete: 'COMPLETED',
  noShow: 'NO_SHOW',
};

function seed(businessId: string): Booking[] {
  const now = new Date();
  return SAMPLE_SCHEDULE.map(([dayOffset, hour, status], index) => {
    const service = SAMPLE_SERVICES[index % SAMPLE_SERVICES.length];
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour);
    const end = new Date(start.getTime() + service.serviceDurationMinutes * 60_000);
    return {
      id: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      businessId,
      serviceId: crypto.randomUUID(),
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      status,
      ...service,
      notes: index % 4 === 0 ? 'Primera visita' : null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  });
}

function load(businessId: string): Booking[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + businessId);
    if (raw) return JSON.parse(raw) as Booking[];
  } catch {
    // Unreadable storage: fall through and reseed.
  }
  const bookings = seed(businessId);
  save(businessId, bookings);
  return bookings;
}

function save(businessId: string, bookings: Booking[]): void {
  localStorage.setItem(STORAGE_PREFIX + businessId, JSON.stringify(bookings));
}

/** The business that owns `bookingId`, searching every seeded business in this browser. */
function findOwner(bookingId: string): string | null {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(STORAGE_PREFIX)) continue;
    const businessId = key.slice(STORAGE_PREFIX.length);
    if (load(businessId).some((b) => b.id === bookingId)) return businessId;
  }
  return null;
}

/** Runs `operation` after a short delay, so loading/saving states are visible like against a real API. */
function withLatency<T>(operation: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(operation());
      } catch (error) {
        reject(error);
      }
    }, LATENCY_MS);
  });
}

function apiError(status: number, code: string, message: string): ApiError {
  return new ApiError(status, { code, message, timestamp: new Date().toISOString() });
}

function transition(bookingId: string, action: BookingAction): Booking {
  const businessId = findOwner(bookingId);
  if (!businessId) throw apiError(404, 'NOT_FOUND', 'La reservación no existe.');

  const bookings = load(businessId);
  const booking = bookings.find((b) => b.id === bookingId)!;
  if (!allowedBookingActions(booking.status).includes(action)) {
    throw apiError(422, 'INVALID_BOOKING_TRANSITION', `La reservación está en estado ${booking.status}.`);
  }

  const updated: Booking = { ...booking, status: TARGET_STATUS[action], updatedAt: new Date().toISOString() };
  save(
    businessId,
    bookings.map((b) => (b.id === bookingId ? updated : b)),
  );
  return updated;
}

export const mockBookingsApi: BookingsApi = {
  list: (businessId, { page = 1, pageSize = 20, status, from, to }) =>
    withLatency(() => {
      const matching = load(businessId)
        .filter((b) => !status || b.status === status)
        .filter((b) => {
          const day = localIsoDate(new Date(b.startAt));
          return (!from || day >= from) && (!to || day <= to);
        })
        .sort((a, b) => a.startAt.localeCompare(b.startAt));

      return {
        data: matching.slice((page - 1) * pageSize, page * pageSize),
        pagination: { page, pageSize, total: matching.length, totalPages: Math.ceil(matching.length / pageSize) },
      };
    }),
  cancel: (bookingId) => withLatency(() => transition(bookingId, 'cancel')),
  complete: (bookingId) => withLatency(() => transition(bookingId, 'complete')),
  markNoShow: (bookingId) => withLatency(() => transition(bookingId, 'noShow')),
};
