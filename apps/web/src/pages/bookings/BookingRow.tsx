import { useState, type FormEvent } from 'react';
import { BOOKING_CANCEL_REASON_MAX_LENGTH, allowedBookingActions, type BookingAction, type components } from '@spot/shared';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { ACTION_LABELS, STATUS_LABELS, formatDay, formatPrice, formatTimeRange } from './format';
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

const CONFIRM_MESSAGES: Record<Exclude<BookingAction, 'cancel'>, string> = {
  complete: '¿Marcar esta reservación como completada?',
  noShow: '¿Marcar que el cliente no asistió a esta reservación?',
};

interface BookingRowProps {
  booking: Booking;
  /** True while any transition is in flight, so two can't race each other. */
  busy: boolean;
  /** True while this row's own transition is in flight. */
  pending: boolean;
  onAction: (booking: Booking, action: BookingAction, reason?: string) => void;
}

export function BookingRow({ booking, busy, pending, onAction }: BookingRowProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const actions = allowedBookingActions(booking.status);

  function handleAction(action: BookingAction) {
    if (action === 'cancel') {
      setCancelOpen(true);
      return;
    }
    if (window.confirm(CONFIRM_MESSAGES[action])) onAction(booking, action);
  }

  function handleCancelSubmit(event: FormEvent) {
    event.preventDefault();
    onAction(booking, 'cancel', reason.trim() || undefined);
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
          {booking.serviceDurationMinutes} min · {formatPrice(booking.servicePrice)}
        </span>
        {booking.notes && <span className={styles.notes}>“{booking.notes}”</span>}
      </div>

      <span className={`${styles.badge} ${STATUS_BADGE[booking.status]}`}>{STATUS_LABELS[booking.status]}</span>

      <div className={styles.actions}>
        {pending ? (
          <span className={styles.pendingText}>Guardando…</span>
        ) : (
          actions.map((action) => (
            <button
              key={action}
              type="button"
              className={action === 'cancel' ? styles.dangerAction : styles.action}
              onClick={() => handleAction(action)}
              disabled={busy || cancelOpen}
            >
              {ACTION_LABELS[action]}
            </button>
          ))
        )}
      </div>

      {cancelOpen && !pending && (
        <form className={styles.cancelForm} onSubmit={handleCancelSubmit} noValidate>
          <TextField
            id={`cancelReason-${booking.id}`}
            label="Motivo de la cancelación (opcional)"
            value={reason}
            maxLength={BOOKING_CANCEL_REASON_MAX_LENGTH}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className={styles.cancelActions}>
            <button type="button" className={styles.action} onClick={() => setCancelOpen(false)} disabled={busy}>
              Volver
            </button>
            <Button type="submit" disabled={busy}>
              Cancelar reservación
            </Button>
          </div>
        </form>
      )}
    </li>
  );
}
