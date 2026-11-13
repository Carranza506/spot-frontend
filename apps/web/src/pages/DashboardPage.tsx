import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, BOOKING_STATUS_LABELS, formatPrice, type components } from '@spot/shared';
import { Button } from '../components/Button';
import { useFeedback } from '../components/feedback/feedbackContext';
import { useBusinessContext } from '../routes/businessContext';
import { bookingsApi } from './bookings/bookingsApi';
import { formatDay, formatTimeRange } from './bookings/format';
import { loadDashboard, type DashboardData } from './dashboard/dashboardData';
import formStyles from './AuthForm.module.css';
import pageStyles from './BusinessProfilePage.module.css';
import styles from './DashboardPage.module.css';

type Booking = components['schemas']['Booking'];
type DashboardState = { key: string; status: 'ready'; data: DashboardData } | { key: string; status: 'error' };

const NETWORK_ERROR = 'No se pudo conectar con el servidor. Intentá de nuevo.';
const todayFormat = new Intl.DateTimeFormat('es-CR', { weekday: 'long', day: 'numeric', month: 'long' });
const hourFormat = new Intl.DateTimeFormat('es-CR', { hour: 'numeric', minute: '2-digit' });

/** Hoy (#101): the day's agenda, what's waiting for confirmation, and the week's figures. */
export function DashboardPage() {
  const { business } = useBusinessContext();
  const navigate = useNavigate();
  const { confirm, showToast } = useFeedback();
  const [reloadKey, setReloadKey] = useState(0);
  const [loaded, setLoaded] = useState<DashboardState | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // A response for an older business or reload is ignored, so the page reads as loading until its own arrives.
  const key = `${business.id}:${reloadKey}`;
  const state = loaded?.key === key ? loaded : null;
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let ignore = false;
    loadDashboard(business.id)
      .then((data) => !ignore && setLoaded({ key, status: 'ready', data }))
      .catch(() => !ignore && setLoaded({ key, status: 'error' }));
    return () => {
      ignore = true;
    };
  }, [business.id, key]);

  async function decide(booking: Booking, accept: boolean) {
    const who = booking.clientName ?? 'el cliente';
    if (
      !accept &&
      !(await confirm({
        title: 'Rechazar reservación',
        message: `¿Rechazar la reservación de ${who} (${booking.serviceName}, ${formatDay(booking.startAt)})? Se cancela y se le avisa.`,
        confirmLabel: 'Rechazar',
        danger: true,
      }))
    ) {
      return;
    }
    setActionError(null);
    setPendingId(booking.id);
    try {
      if (accept) await bookingsApi.confirm(booking.id);
      else await bookingsApi.cancel(booking.id);
      showToast(accept ? 'Reservación confirmada.' : 'Reservación rechazada.');
      reload();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      // 404 or 422: it was cancelled or changed meanwhile; the refreshed lists show where it stands.
      setActionError(error instanceof ApiError ? error.message : NETWORK_ERROR);
      reload();
    } finally {
      setPendingId(null);
    }
  }

  if (!state) return <p className={pageStyles.placeholder}>Cargando…</p>;

  if (state.status === 'error') {
    return (
      <div className={styles.page}>
        <p className={formStyles.generalError}>No se pudo cargar tu agenda de hoy.</p>
        <Button type="button" onClick={reload}>
          Reintentar
        </Button>
      </div>
    );
  }

  const { data } = state;
  const now = new Date();

  return (
    <div className={styles.page}>
      <section className={styles.agendaColumn}>
        <div className={styles.dayHeader}>
          {/* The top bar already says "Hoy": the date is the title here. */}
          <h2 className={styles.dayTitle}>{capitalize(todayFormat.format(now))}</h2>
          <p className={styles.daySubtitle}>
            {data.todayCount === 0 ? 'No tenés citas hoy.' : data.todayCount === 1 ? '1 cita hoy' : `${data.todayCount} citas hoy`}
          </p>
        </div>

        <ol className={styles.agenda} aria-label="Agenda de hoy">
          {data.agenda.map(({ hour, bookings }) => (
            <li key={hour} className={styles.hourRow}>
              <span className={styles.hourLabel}>{hourFormat.format(new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour))}</span>
              <div className={styles.hourSlot}>
                {hour === now.getHours() && (
                  <div className={styles.nowLine} role="presentation">
                    <span>Ahora</span>
                  </div>
                )}
                {bookings.map((booking) => (
                  <AgendaItem key={booking.id} booking={booking} />
                ))}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <aside className={styles.sideColumn}>
        <div className={styles.stats}>
          <article className={styles.statCard}>
            <span className={styles.statLabel}>Citas esta semana</span>
            <span className={styles.statValue}>{data.weekCount}</span>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statLabel}>Ingresos estimados</span>
            <span className={styles.statValue}>{formatPrice(data.weekIncome)}</span>
            <span className={styles.statHint}>Esta semana</span>
          </article>
        </div>

        <article className={styles.card}>
          <h2 className={styles.cardTitle}>
            Por confirmar <span className={styles.cardCount}>{data.toConfirmTotal}</span>
          </h2>
          {actionError && <p className={formStyles.generalError}>{actionError}</p>}
          {data.toConfirm.length === 0 ? (
            <p className={pageStyles.placeholder}>No hay reservaciones esperando tu confirmación.</p>
          ) : (
            <ul className={styles.requestList}>
              {data.toConfirm.map((booking) => (
                <li key={booking.id} className={styles.request}>
                  <div className={styles.requestInfo}>
                    <span className={styles.requestName}>{booking.clientName ?? 'Cliente'}</span>
                    <span className={styles.requestMeta}>
                      {formatDay(booking.startAt)} · {formatTimeRange(booking.startAt, booking.endAt)} · {booking.serviceName}
                    </span>
                  </div>
                  <div className={styles.requestActions}>
                    <Button
                      type="button"
                      variant="secondary"
                      className={styles.smallButton}
                      disabled={pendingId !== null}
                      onClick={() => void decide(booking, false)}
                    >
                      Rechazar
                    </Button>
                    <Button
                      type="button"
                      className={styles.smallButton}
                      disabled={pendingId !== null}
                      onClick={() => void decide(booking, true)}
                    >
                      {pendingId === booking.id ? 'Guardando…' : 'Confirmar'}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </aside>
    </div>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** One booking on the agenda. Pending ones are the sunflower ticket: they still need the owner. */
function AgendaItem({ booking }: { booking: Booking }) {
  const pending = booking.status === 'PENDING';
  const done = booking.status === 'COMPLETED' || booking.status === 'NO_SHOW';
  return (
    <div className={[styles.item, pending ? styles.itemPending : done ? styles.itemDone : styles.itemConfirmed].join(' ')}>
      <div className={styles.itemInfo}>
        <span className={styles.itemTitle}>
          {formatTimeRange(booking.startAt, booking.endAt)} · {booking.serviceName}
        </span>
        <span className={styles.itemMeta}>{booking.clientName ?? 'Cliente'}</span>
      </div>
      <span className={styles.itemStatus}>{pending ? 'Por confirmar' : BOOKING_STATUS_LABELS[booking.status]}</span>
    </div>
  );
}
