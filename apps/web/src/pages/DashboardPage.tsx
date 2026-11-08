import { useEffect, useState } from 'react';
import { BOOKING_STATUS_LABELS, formatPrice } from '@spot/shared';
import { Button } from '../components/Button';
import { CalendarIcon, CheckCircleIcon, ClockIcon, DollarIcon } from '../components/dashboard/icons';
import { useBusinessContext } from '../routes/businessContext';
import { formatDay, formatTimeRange } from './bookings/format';
import { loadDashboard, type DashboardData } from './dashboard/dashboardData';
import formStyles from './AuthForm.module.css';
import pageStyles from './BusinessProfilePage.module.css';
import styles from './DashboardPage.module.css';

type DashboardState = { key: string; status: 'ready'; data: DashboardData } | { key: string; status: 'error' };

export function DashboardPage() {
  const { business } = useBusinessContext();
  const [reloadKey, setReloadKey] = useState(0);
  const [loaded, setLoaded] = useState<DashboardState | null>(null);

  // A response for an older business or reload is ignored, so the page reads as loading until its own arrives.
  const key = `${business.id}:${reloadKey}`;
  const state = loaded?.key === key ? loaded : null;

  useEffect(() => {
    let ignore = false;
    loadDashboard(business.id)
      .then((data) => !ignore && setLoaded({ key, status: 'ready', data }))
      .catch(() => !ignore && setLoaded({ key, status: 'error' }));
    return () => {
      ignore = true;
    };
  }, [business.id, key]);

  if (!state) return <p className={pageStyles.placeholder}>Cargando…</p>;

  if (state.status === 'error') {
    return (
      <div className={styles.page}>
        <p className={formStyles.generalError}>No se pudo cargar el resumen de tu negocio.</p>
        <Button type="button" onClick={() => setReloadKey((k) => k + 1)}>
          Reintentar
        </Button>
      </div>
    );
  }

  const { data } = state;
  // At least 1, so an empty week draws flat bars instead of dividing by zero.
  const maxDayValue = Math.max(1, ...data.week.map((day) => day.value));

  return (
    <div className={styles.page}>
      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>Total reservaciones</span>
            <span className={styles.iconTeal}>
              <CalendarIcon />
            </span>
          </div>
          <span className={styles.statValue}>{data.total}</span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>Pendientes</span>
            <span className={styles.iconAmber}>
              <ClockIcon />
            </span>
          </div>
          <span className={styles.statValue}>{data.pending}</span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>Confirmadas</span>
            <span className={styles.iconGreen}>
              <CheckCircleIcon />
            </span>
          </div>
          <span className={styles.statValue}>{data.confirmed}</span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>Ingresos (completadas)</span>
            <span className={styles.iconNeutral}>
              <DollarIcon />
            </span>
          </div>
          <span className={styles.statValue}>{formatPrice(data.revenue)}</span>
        </article>
      </section>

      <section className={styles.contentGrid}>
        <article className={styles.card}>
          <h2 className={styles.cardTitle}>Reservaciones esta semana</h2>
          <div className={styles.chart}>
            {data.week.map((day) => (
              <div key={day.date} className={styles.chartColumn} title={`${day.value} el ${formatDay(`${day.date}T12:00:00`)}`}>
                <div className={styles.chartBar} style={{ height: `${(day.value / maxDayValue) * 100}%` }} />
                <span className={styles.chartLabel}>{day.label}</span>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.card}>
          <h2 className={styles.cardTitle}>Próximas citas</h2>
          {data.upcoming.length === 0 ? (
            <p className={pageStyles.placeholder}>No tenés citas pendientes ni confirmadas próximamente.</p>
          ) : (
            <ul className={styles.appointmentList}>
              {data.upcoming.map((booking) => {
                const pending = booking.status === 'PENDING';
                return (
                  <li key={booking.id} className={styles.appointmentRow}>
                    <span className={`${styles.appointmentAvatar} ${pending ? styles.avatarAmber : styles.avatarTeal}`}>
                      {(Array.from(booking.serviceName.trim())[0] ?? '?').toUpperCase()}
                    </span>
                    <div className={styles.appointmentInfo}>
                      <span className={styles.appointmentName}>{booking.serviceName}</span>
                      <span className={styles.appointmentService}>
                        {formatDay(booking.startAt)} · {formatTimeRange(booking.startAt, booking.endAt)}
                      </span>
                    </div>
                    <span className={`${styles.badge} ${pending ? styles.badgePending : styles.badgeConfirmed}`}>
                      {BOOKING_STATUS_LABELS[booking.status]}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}
