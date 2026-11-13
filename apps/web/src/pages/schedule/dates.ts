function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Today as the contract's `format: date` ("YYYY-MM-DD") in the browser's time zone. Not
 * toISOString(), which is UTC and is already tomorrow on a Costa Rica evening.
 */
export function todayIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const LONG_DATE = new Intl.DateTimeFormat('es-CR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * "YYYY-MM-DD" as e.g. "Viernes, 25 de diciembre de 2026". Built as a local calendar date:
 * `new Date('2026-12-25')` is UTC midnight, which renders as the 24th west of UTC.
 */
export function formatIsoDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const formatted = LONG_DATE.format(new Date(year, month - 1, day));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
