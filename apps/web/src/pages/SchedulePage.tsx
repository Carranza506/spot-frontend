import { useBusinessContext } from '../routes/businessContext';
import { ScheduleExceptionsCard } from './schedule/ScheduleExceptionsCard';
import { WeeklyHoursCard } from './schedule/WeeklyHoursCard';
import { isScheduleMock } from './schedule/scheduleApi';
import pageStyles from './BusinessProfilePage.module.css';
import styles from './schedule/Schedule.module.css';

/** Horarios: the business's weekly hours (PUT /hours) and its date-specific schedule exceptions. */
export function SchedulePage() {
  const { business } = useBusinessContext();

  return (
    <div className={pageStyles.page}>
      {isScheduleMock && (
        <p className={`${styles.mockNotice} ${pageStyles.fullRow}`}>
          Modo de prueba: las excepciones se guardan solo en este navegador (VITE_SCHEDULE_MOCK=true).
        </p>
      )}
      <WeeklyHoursCard businessId={business.id} />
      <div className={pageStyles.sideColumn}>
        <ScheduleExceptionsCard businessId={business.id} />
      </div>
    </div>
  );
}
