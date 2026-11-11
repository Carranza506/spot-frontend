// Pure helpers behind the business detail's contact and hours sections (no React / React Native or
// @spot/shared imports), so they can be unit tested with `node --test` (see tests/businessInfo.test.mjs).

/** The fields of a BusinessHour these helpers read. */
interface HourRow {
  dayOfWeek: number;
  openTime?: string | null;
  closeTime?: string | null;
  isClosed: boolean;
}

export interface DaySchedule {
  dayOfWeek: number;
  /** "HH:MM:SS" as the API sends them; both null when the business is closed that day. */
  openTime: string | null;
  closeTime: string | null;
}

/**
 * One row per day in `weekOrder`. A day without a row, marked closed or missing a time is closed:
 * the backend computes availability the same way, so the screen never shows hours it won't book.
 */
export function weekSchedule(hours: readonly HourRow[], weekOrder: readonly number[]): DaySchedule[] {
  return weekOrder.map((dayOfWeek) => {
    const row = hours.find((hour) => hour.dayOfWeek === dayOfWeek);
    return row && !row.isClosed && row.openTime && row.closeTime
      ? { dayOfWeek, openTime: row.openTime, closeTime: row.closeTime }
      : { dayOfWeek, openTime: null, closeTime: null };
  });
}

/** Only the main number ("+506 8888 1234 ext. 5" → "tel:+50688881234"); null if it has no digits. */
export function phoneUrl(phone: string): string | null {
  const main = phone.split(/ext|x/i)[0].trim();
  const digits = main.replace(/\D/g, '');
  return digits ? `tel:${main.startsWith('+') ? '+' : ''}${digits}` : null;
}

/**
 * A wa.me chat link. wa.me needs the country code, so a local 8-digit Costa Rican number gets 506;
 * null if it has no digits.
 */
export function whatsappUrl(phone: string): string | null {
  const digits = phone.split(/ext|x/i)[0].replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits.length === 8 ? `506${digits}` : digits}`;
}
