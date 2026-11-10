import { useState } from 'react';
import {
  BOOKING_STATUS_LABELS,
  allowedBookingActions,
  formatPrice,
  type BookingAction,
  type components,
} from '@spot/shared';
import { useFeedback, type ConfirmOptions } from '../../components/feedback/feedbackContext';
import { ACTION_LABELS, formatDay, formatTimeRange } from './format';
import styles from './Bookings.module.css';

type Booking = components['schemas']['Booking'];
type BookingStatus = components['schemas']['BookingStatus'];

const STATUS_BADGE: Record<BookingStatus, string> = {
  PENDING: styles.badgePending,
  CONFIRMED: styles.badgeConfirmed,
  COMPLETED: styles.badgeCompleted,
  CANCELLED: styles.badgeClosed,
  NO_SHOW: styles.badgeClosed,
};

const CONFIRM_OPTIONS: Record<BookingAction, ConfirmOptions> = {
  confirm: {
    title: 'Confirmar reservación',
    message: '¿Confirmar esta reservación? El cliente recibirá una notificación.',
    confirmLabel: 'Confirmar',
  },
  cancel: {
    title: 'Cancelar reservación',
    message: '¿Cancelar esta reservación? No se puede deshacer.',
    confirmLabel: 'Cancelar reservación',
    danger: true,
  },
  complete: {
    title: 'Marcar como completada',
    message: '¿Marcar esta reservación como completada?',
    confirmLabel: 'Marcar completada',
  },
  noShow: {
    title: 'Marcar como no asistió',
    message: '¿Marcar que el cliente no asistió a esta reservación?',
    confirmLabel: 'Marcar no asistió',
    danger: true,
  },
};

interface BookingRowProps {
  booking: Booking;
  /** True while any transition is in flight, so two can't race each other. */
  busy: boolean;
  /** True while this row's own transition is in flight. */
  pending: boolean;
  onAction: (booking: Booking, action: BookingAction) => void;
}

export function BookingRow({ booking, busy, pending, onAction }: BookingRowProps) {
  const { confirm } = useFeedback();
  // Read once per row, not on every render (render must stay pure). A row left open past startAt keeps the
  // buttons hidden until the list reloads, which is the safe side.
  const [renderedAt] = useState(Date.now);
  // The backend only allows complete / no-show once the booking's start time has arrived (BOOKING_NOT_STARTED).
  const started = new Date(booking.startAt).getTime() <= renderedAt;
  const actions = allowedBookingActions(booking.status).filter(
    (action) => started || (action !== 'complete' && action !== 'noShow'),
  );

  async function handleAction(action: BookingAction) {
    if (await confirm(CONFIRM_OPTIONS[action])) onAction(booking, action);
  }

  return (
    <li className={styles.row}>
      <div className={styles.when}>
        <span className={styles.day}>{formatDay(booking.startAt)}</span>
        <span className={styles.time}>{formatTimeRange(booking.startAt, booking.endAt)}</span>
      </div>

      <div className={styles.info}>
        <span className={styles.service}>{booking.serviceName}</span>
        <span className={styles.meta}>
          {booking.clientName ? `${booking.clientName} · ` : ''}
          {booking.serviceDurationMinutes} min · {formatPrice(booking.servicePrice)}
        </span>
        {booking.notes && <span className={styles.notes}>“{booking.notes}”</span>}
      </div>

      <span className={`${styles.badge} ${STATUS_BADGE[booking.status]}`}>{BOOKING_STATUS_LABELS[booking.status]}</span>

      <div className={styles.actions}>
        {pending ? (
          <span className={styles.pendingText}>Guardando…</span>
        ) : (
          actions.map((action) => (
            <button
              key={action}
              type="button"
              className={action === 'cancel' || action === 'noShow' ? styles.dangerAction : styles.action}
              onClick={() => handleAction(action)}
              disabled={busy}
            >
              {ACTION_LABELS[action]}
            </button>
          ))
        )}
      </div>
    </li>
  );
}
