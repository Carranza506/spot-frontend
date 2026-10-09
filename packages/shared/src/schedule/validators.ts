/** Mirrors BusinessScheduleExceptionCreateRequest.reason's maxLength in contracts/spot-api.yaml. */
export const SCHEDULE_EXCEPTION_REASON_MAX_LENGTH = 255;

const SHORT_TIME_REGEX = /^\d{2}:\d{2}$/;

/** `<input type="time">` yields "HH:MM", but the contract's time pattern requires "HH:MM:SS". */
export function toApiTime(time: string): string {
  return SHORT_TIME_REGEX.test(time) ? `${time}:00` : time;
}

/** The API's "HH:MM:SS" (or null) as the "HH:MM" an `<input type="time">` expects. */
export function fromApiTime(time: string | null | undefined): string {
  return time ? time.slice(0, 5) : '';
}

/**
 * Mirrors the business_hours / business_schedule_exceptions CHECK: a day that isn't closed
 * needs both times, with openTime strictly before closeTime. Zero-padded "HH:MM[:SS]" strings
 * order the same way the times do, so a plain string comparison is enough.
 */
export function validateTimeRange(openTime: string, closeTime: string): string | null {
  if (!openTime || !closeTime) return 'Ingresá la hora de apertura y la de cierre.';
  if (toApiTime(openTime) >= toApiTime(closeTime)) return 'La hora de apertura debe ser anterior a la de cierre.';
  return null;
}
