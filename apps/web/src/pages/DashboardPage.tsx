import { CalendarIcon, CheckCircleIcon, ClockIcon, DollarIcon } from '../components/dashboard/icons';
import { dashboardStats, reservationsByDay, upcomingAppointments } from './dashboard/mockDashboard';
import styles from './DashboardPage.module.css';

function formatColones(amount: number): string {
  return `₡${Math.round(amount).toLocaleString('en-US').replace(/,/g, ' ')}`;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.charAt(0) ?? ''}${parts[1]?.charAt(0) ?? ''}`.toUpperCase();
}

const STATUS_LABEL: Record<'confirmed' | 'pending', string> = {
  confirmed: 'Confirmada',
  pending: 'Pendiente',
};

export function DashboardPage() {
  const maxDayValue = Math.max(...reservationsByDay.map((day) => day.value));

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
          <span className={styles.statValue}>{dashboardStats.totalReservations}</span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>Pendientes</span>
            <span className={styles.iconAmber}>
              <ClockIcon />
            </span>
          </div>
          <span className={styles.statValue}>{dashboardStats.pending}</span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>Confirmadas</span>
            <span className={styles.iconGreen}>
              <CheckCircleIcon />
            </span>
          </div>
          <span className={styles.statValue}>{dashboardStats.confirmed}</span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>Ingresos (completadas)</span>
            <span className={styles.iconNeutral}>
              <DollarIcon />
            </span>
          </div>
          <span className={styles.statValue}>{formatColones(dashboardStats.revenueColones)}</span>
        </article>
      </section>

      <section className={styles.contentGrid}>
        <article className={styles.card}>
          <h2 className={styles.cardTitle}>Reservaciones por día</h2>
          <div className={styles.chart}>
            {reservationsByDay.map((day) => (
              <div key={day.label} className={styles.chartColumn}>
                <div
                  className={styles.chartBar}
                  style={{ height: `${(day.value / maxDayValue) * 100}%` }}
                />
                <span className={styles.chartLabel}>{day.label}</span>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.card}>
          <h2 className={styles.cardTitle}>Próximas citas</h2>
          <ul className={styles.appointmentList}>
            {upcomingAppointments.map((appointment) => (
              <li key={appointment.id} className={styles.appointmentRow}>
                <span className={`${styles.appointmentAvatar} ${styles[`avatar${capitalize(appointment.avatarColor)}`]}`}>
                  {initialsFromName(appointment.name)}
                </span>
                <div className={styles.appointmentInfo}>
                  <span className={styles.appointmentName}>{appointment.name}</span>
                  <span className={styles.appointmentService}>{appointment.service}</span>
                </div>
                <span className={`${styles.badge} ${styles[`badge${capitalize(appointment.status)}`]}`}>
                  {STATUS_LABEL[appointment.status]}
                </span>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
