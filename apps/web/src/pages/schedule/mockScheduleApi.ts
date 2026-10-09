import { ApiError, type components } from '@spot/shared';
import type { ScheduleApi } from './scheduleApi';

type BusinessScheduleException = components['schemas']['BusinessScheduleException'];

// In-browser stand-in for the schedule-exceptions endpoints, which spot-backend doesn't serve yet
// (#61); weekly hours (#60) always use the real API. Enabled with VITE_SCHEDULE_MOCK=true. Persists
// per business in localStorage and reproduces the contract's validation errors (400/404/409/422),
// so every path of the exceptions card can be exercised. Delete once those endpoints are live.

const STORAGE_PREFIX = 'spot.scheduleMock.';
const LATENCY_MS = 300;

interface MockStore {
  exceptions: BusinessScheduleException[];
}

function load(businessId: string): MockStore {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + businessId);
    if (raw) return JSON.parse(raw) as MockStore;
  } catch {
    // Unreadable storage: start from an empty schedule.
  }
  return { exceptions: [] };
}

function save(businessId: string, store: MockStore): void {
  localStorage.setItem(STORAGE_PREFIX + businessId, JSON.stringify(store));
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

function apiError(status: number, code: string, message: string, field?: string): ApiError {
  return new ApiError(status, {
    code,
    message,
    details: field ? { field } : undefined,
    timestamp: new Date().toISOString(),
  });
}

/** Same rule as the business_hours / business_schedule_exceptions CHECK. */
function assertTimeRange(isClosed: boolean, openTime?: string | null, closeTime?: string | null): void {
  if (isClosed) return;
  if (!openTime || !closeTime) {
    throw apiError(400, 'BAD_REQUEST', 'openTime y closeTime son requeridos cuando isClosed es false.', 'openTime');
  }
  if (openTime >= closeTime) {
    throw apiError(422, 'UNPROCESSABLE_ENTITY', 'openTime debe ser anterior a closeTime.', 'openTime');
  }
}

export const mockScheduleApi: Pick<ScheduleApi, 'listExceptions' | 'createException' | 'deleteException'> = {
  listExceptions: (businessId, from) =>
    withLatency(() =>
      load(businessId)
        .exceptions.filter((e) => e.exceptionDate >= from)
        .sort((a, b) => a.exceptionDate.localeCompare(b.exceptionDate)),
    ),

  createException: (businessId, data) =>
    withLatency(() => {
      const store = load(businessId);
      if (store.exceptions.some((e) => e.exceptionDate === data.exceptionDate)) {
        throw apiError(409, 'CONFLICT', 'Ya existe una excepción para esa fecha.', 'exceptionDate');
      }
      assertTimeRange(data.isClosed, data.openTime, data.closeTime);

      const now = new Date().toISOString();
      const exception: BusinessScheduleException = {
        id: crypto.randomUUID(),
        businessId,
        exceptionDate: data.exceptionDate,
        isClosed: data.isClosed,
        openTime: data.isClosed ? null : (data.openTime ?? null),
        closeTime: data.isClosed ? null : (data.closeTime ?? null),
        reason: data.reason ?? null,
        createdAt: now,
        updatedAt: now,
      };
      store.exceptions = [...store.exceptions, exception];
      save(businessId, store);
      return exception;
    }),

  deleteException: (businessId, exceptionId) =>
    withLatency(() => {
      const store = load(businessId);
      if (!store.exceptions.some((e) => e.id === exceptionId)) {
        throw apiError(404, 'NOT_FOUND', 'La excepción no existe.');
      }
      store.exceptions = store.exceptions.filter((e) => e.id !== exceptionId);
      save(businessId, store);
    }),
};
