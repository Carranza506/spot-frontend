import { useBusinessContext } from '../routes/businessContext';
import { ScheduleExceptionsCard } from './schedule/ScheduleExceptionsCard';
import { WeeklyHoursCard } from './schedule/WeeklyHoursCard';
import pageStyles from './BusinessProfilePage.module.css';

/** Horarios: the business's weekly hours (PUT /hours) and its date-specific schedule exceptions. */
export function SchedulePage() {
  const { business } = useBusinessContext();

  return (
    <div className={pageStyles.page}>
      <WeeklyHoursCard businessId={business.id} />
      <div className={pageStyles.sideColumn}>
        <ScheduleExceptionsCard businessId={business.id} />
      </div>
    </div>
  );
}
