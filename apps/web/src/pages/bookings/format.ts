import type { BookingAction, components } from '@spot/shared';

type BookingStatus = components['schemas']['BookingStatus'];

export const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
};

export const ACTION_LABELS: Record<BookingAction, string> = {
  cancel: 'Cancelar',
  complete: 'Completar',
  noShow: 'No asistió',
};

/** Infinitive used in messages: "No se pudo {verb} la reservación". */
export const ACTION_VERBS: Record<BookingAction, string> = {
  cancel: 'cancelar',
  complete: 'completar',
  noShow: 'marcar como no asistida',
};

/** The local calendar date as YYYY-MM-DD (toISOString() would give the UTC date, a day ahead in the evening). */
export function localIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const dayFormat = new Intl.DateTimeFormat('es-CR', { weekday: 'short', day: 'numeric', month: 'short' });
const timeFormat = new Intl.DateTimeFormat('es-CR', { hour: 'numeric', minute: '2-digit' });
const priceFormat = new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 });

export function formatDay(iso: string): string {
  return dayFormat.format(new Date(iso));
}

export function formatTimeRange(startIso: string, endIso: string): string {
  return `${timeFormat.format(new Date(startIso))} – ${timeFormat.format(new Date(endIso))}`;
}

/** servicePrice is in Costa Rican colones (CRC) per the contract. */
export function formatPrice(colones: number): string {
  return priceFormat.format(colones);
}
