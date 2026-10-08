import type { ApiClient } from '../api/client';
import type { components, operations } from '../api/schema';

type BusinessHourInput = components['schemas']['BusinessHourInput'];
type PaginatedBusinessHours = components['schemas']['PaginatedBusinessHours'];
type ReplaceBusinessHoursResponse = operations['replaceBusinessHours']['responses'][200]['content']['application/json'];
type BusinessScheduleException = components['schemas']['BusinessScheduleException'];
type BusinessScheduleExceptionCreateRequest = components['schemas']['BusinessScheduleExceptionCreateRequest'];
type PaginatedScheduleExceptions = components['schemas']['PaginatedScheduleExceptions'];

export {
  SCHEDULE_EXCEPTION_REASON_MAX_LENGTH,
  fromApiTime,
  toApiTime,
  validateTimeRange,
} from './validators';

// A week has at most one business_hours row per day_of_week, so one page always holds all of them.
const WEEK_DAYS = 7;

function businessPath(businessId: string): string {
  return `/business/businesses/${encodeURIComponent(businessId)}`;
}

/** A business's weekly schedule (public endpoint): up to 7 rows, one per dayOfWeek (0=Sunday..6=Saturday). */
export function listBusinessHours(
  client: Pick<ApiClient, 'apiFetch'>,
  businessId: string,
): Promise<PaginatedBusinessHours> {
  return client.apiFetch<PaginatedBusinessHours>(`${businessPath(businessId)}/hours?page=1&pageSize=${WEEK_DAYS}`);
}

/**
 * Replaces the weekly schedule of a business the authenticated BUSINESS account owns, upserting
 * by dayOfWeek. Open days need openTime < closeTime (400/422 otherwise).
 */
export function replaceBusinessHours(
  client: Pick<ApiClient, 'apiFetch'>,
  businessId: string,
  hours: BusinessHourInput[],
): Promise<ReplaceBusinessHoursResponse> {
  return client.apiFetch<ReplaceBusinessHoursResponse>(`${businessPath(businessId)}/hours`, {
    method: 'PUT',
    body: { hours },
  });
}

/** A page of a business's schedule exceptions (public endpoint), optionally limited to a `from`..`to` date range. */
export function listBusinessScheduleExceptions(
  client: Pick<ApiClient, 'apiFetch'>,
  businessId: string,
  {
    page = 1,
    pageSize = 20,
    from,
    to,
  }: { page?: number; pageSize?: number; from?: string; to?: string } = {},
): Promise<PaginatedScheduleExceptions> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  return client.apiFetch<PaginatedScheduleExceptions>(`${businessPath(businessId)}/schedule-exceptions?${query}`);
}

/** Adds a schedule exception to a business the authenticated BUSINESS account owns (409 if that date already has one). */
export function createBusinessScheduleException(
  client: Pick<ApiClient, 'apiFetch'>,
  businessId: string,
  data: BusinessScheduleExceptionCreateRequest,
): Promise<BusinessScheduleException> {
  return client.apiFetch<BusinessScheduleException>(`${businessPath(businessId)}/schedule-exceptions`, {
    method: 'POST',
    body: data,
  });
}

/** Removes a schedule exception from a business the authenticated BUSINESS account owns (204). */
export function deleteBusinessScheduleException(
  client: Pick<ApiClient, 'apiFetch'>,
  businessId: string,
  exceptionId: string,
): Promise<void> {
  return client.apiFetch<void>(
    `${businessPath(businessId)}/schedule-exceptions/${encodeURIComponent(exceptionId)}`,
    { method: 'DELETE' },
  );
}
