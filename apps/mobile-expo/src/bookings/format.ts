// Every business's schedule is in Costa Rica time (see Spot.Booking.Api's BusinessTimeZone), so
// dates and times are always shown in that zone, whatever zone the phone is set to.
const BUSINESS_TIME_ZONE = 'America/Costa_Rica';
// Costa Rica has had no daylight saving time since 1992: the fallbacks below rely on it.
const BUSINESS_UTC_OFFSET_HOURS = -6;

/**
 * Built on first use, not when the module loads: an engine without time zone support (Hermes on some
 * Android builds) throws here, and that must cost the formatting, not the whole screen.
 */
function lazyFormat(locale: string, options: Intl.DateTimeFormatOptions): () => Intl.DateTimeFormat | null {
  let format: Intl.DateTimeFormat | null | undefined;
  return () => {
    if (format === undefined) {
      try {
        format = new Intl.DateTimeFormat(locale, options);
      } catch {
        format = null;
      }
    }
    return format;
  };
}

const todayFormat = lazyFormat('en-US', { timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
const timeFormat = lazyFormat('es-CR', { timeZone: BUSINESS_TIME_ZONE, hour: 'numeric', minute: '2-digit' });
const dayFormat = lazyFormat('es-CR', { timeZone: BUSINESS_TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long' });
const dayWithYearFormat = lazyFormat('es-CR', {
  timeZone: BUSINESS_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const shortDateTimeFormat = lazyFormat('es-CR', {
  timeZone: BUSINESS_TIME_ZONE,
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});
// Availability dates are already the business's local dates (YYYY-MM-DD): formatted at UTC noon in
// UTC so the device's own zone can never shift them to the previous or next day.
const dayChipFormat = lazyFormat('es-CR', { timeZone: 'UTC', weekday: 'short', day: 'numeric' });
const longDateFormat = lazyFormat('es-CR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });

const pad = (n: number) => String(n).padStart(2, '0');
const dayMonth = (date: Date) => `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}`;
const fullDate = (date: Date) => `${dayMonth(date)}/${date.getUTCFullYear()}`;
const clock = (date: Date) => `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;

/** No Intl time zones: the instant shifted to Costa Rica, to be read with the UTC getters. */
function shiftedToBusinessTime(date: Date): Date {
  return new Date(date.getTime() + BUSINESS_UTC_OFFSET_HOURS * 60 * 60 * 1000);
}

function dateAtNoonUtc(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

/** Today's date in Costa Rica as YYYY-MM-DD. */
export function todayInBusinessTimeZone(): string {
  const now = new Date();
  const format = todayFormat();
  if (!format) return shiftedToBusinessTime(now).toISOString().slice(0, 10);
  const parts = Object.fromEntries(format.formatToParts(now).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** "9:00 a. m.", in Costa Rica time. */
export function formatBusinessTime(iso: string): string {
  const date = new Date(iso);
  return timeFormat()?.format(date) ?? clock(shiftedToBusinessTime(date));
}

/** "viernes, 31 de octubre", in Costa Rica time. */
export function formatBusinessDay(iso: string): string {
  const date = new Date(iso);
  return dayFormat()?.format(date) ?? fullDate(shiftedToBusinessTime(date));
}

/** "viernes, 31 de octubre de 2026 a las 9:00 a. m.", in Costa Rica time. */
export function formatBusinessDateTime(iso: string): string {
  const date = new Date(iso);
  const day = dayWithYearFormat()?.format(date) ?? fullDate(shiftedToBusinessTime(date));
  return `${day} a las ${formatBusinessTime(iso)}`;
}

/** "31 oct, 9:00 a. m.", in Costa Rica time. */
export function formatBusinessShortDateTime(iso: string): string {
  const date = new Date(iso);
  const local = shiftedToBusinessTime(date);
  return shortDateTimeFormat()?.format(date) ?? `${dayMonth(local)} ${clock(local)}`;
}

/** "vie 31", for a local date (YYYY-MM-DD) that's already the business's. */
export function formatDayChip(date: string): string {
  const noon = dateAtNoonUtc(date);
  return dayChipFormat()?.format(noon) ?? dayMonth(noon);
}

/** "viernes, 31 de octubre", for a local date (YYYY-MM-DD) that's already the business's. */
export function formatLongDate(date: string): string {
  const noon = dateAtNoonUtc(date);
  return longDateFormat()?.format(noon) ?? fullDate(noon);
}
