import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, fromApiTime, toApiTime, validateTimeRange, type components } from '@spot/shared';
import { Button } from '../../components/Button';
import fieldStyles from '../../components/TextField.module.css';
import formStyles from '../AuthForm.module.css';
import pageStyles from '../BusinessProfilePage.module.css';
import { scheduleApi } from './scheduleApi';
import styles from './Schedule.module.css';

type BusinessHour = components['schemas']['BusinessHour'];
type BusinessHourInput = components['schemas']['BusinessHourInput'];

// Shown Monday-first, the way a week reads in Costa Rica; dayOfWeek keeps the contract's 0=Sunday numbering.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Pre-filled for days without stored times, so opening one only needs adjusting, not typing.
const DEFAULT_OPEN_TIME = '09:00';
const DEFAULT_CLOSE_TIME = '18:00';

const NETWORK_ERROR = 'No se pudo conectar con el servidor. Intentá de nuevo.';

interface DayRow {
  dayOfWeek: number;
  isClosed: boolean;
  /** "HH:MM", as `<input type="time">` uses it. */
  openTime: string;
  closeTime: string;
}

type LoadState = { status: 'loading' } | { status: 'ready'; configured: boolean } | { status: 'error' };

function toRows(hours: BusinessHour[]): DayRow[] {
  return WEEK_ORDER.map((dayOfWeek) => {
    const stored = hours.find((h) => h.dayOfWeek === dayOfWeek);
    // A day with no stored row has never been published, so it starts out closed.
    return {
      dayOfWeek,
      isClosed: stored?.isClosed ?? true,
      openTime: fromApiTime(stored?.openTime) || DEFAULT_OPEN_TIME,
      closeTime: fromApiTime(stored?.closeTime) || DEFAULT_CLOSE_TIME,
    };
  });
}

function toInput(row: DayRow): BusinessHourInput {
  // Closed days omit the times: the CHECK only constrains open days, and keeping stale ones would mislead.
  if (row.isClosed) return { dayOfWeek: row.dayOfWeek, isClosed: true };
  return {
    dayOfWeek: row.dayOfWeek,
    isClosed: false,
    openTime: toApiTime(row.openTime),
    closeTime: toApiTime(row.closeTime),
  };
}

/** Per-day errors keyed by dayOfWeek: blocks the PUT before it reaches the API (openTime < closeTime). */
function validate(rows: DayRow[]): Record<number, string> {
  const errors: Record<number, string> = {};
  for (const row of rows) {
    if (row.isClosed) continue;
    const error = validateTimeRange(row.openTime, row.closeTime);
    if (error) errors[row.dayOfWeek] = error;
  }
  return errors;
}

interface WeeklyHoursCardProps {
  businessId: string;
}

export function WeeklyHoursCard({ businessId }: WeeklyHoursCardProps) {
  const navigate = useNavigate();
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [rows, setRows] = useState<DayRow[]>(() => toRows([]));
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchHours = useCallback(() => {
    scheduleApi
      .listHours(businessId)
      .then((hours) => {
        setRows(toRows(hours));
        setLoad({ status: 'ready', configured: hours.length > 0 });
      })
      .catch(() => setLoad({ status: 'error' }));
  }, [businessId]);

  useEffect(fetchHours, [fetchHours]);

  function retry() {
    setLoad({ status: 'loading' });
    fetchHours();
  }

  function updateRow(dayOfWeek: number, changes: Partial<DayRow>) {
    setRows((current) => current.map((row) => (row.dayOfWeek === dayOfWeek ? { ...row, ...changes } : row)));
    setRowErrors((current) => {
      if (!(dayOfWeek in current)) return current;
      const next = { ...current };
      delete next[dayOfWeek];
      return next;
    });
    setSaved(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaved(false);

    const errors = validate(rows);
    if (Object.keys(errors).length > 0) {
      setRowErrors(errors);
      setGeneralError(null);
      return;
    }

    setRowErrors({});
    setGeneralError(null);
    setSubmitting(true);
    try {
      const updated = await scheduleApi.replaceHours(businessId, rows.map(toInput));
      setRows(toRows(updated));
      setLoad({ status: 'ready', configured: true });
      setSaved(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        navigate('/login', { replace: true });
      } else if (error instanceof ApiError) {
        setGeneralError(error.message);
      } else {
        setGeneralError(NETWORK_ERROR);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className={pageStyles.card}>
      <h2 className={pageStyles.cardTitle}>Horario semanal</h2>

      {load.status === 'loading' && <div className={pageStyles.message}>Cargando…</div>}
      {load.status === 'error' && (
        <div className={pageStyles.message}>
          <p>No se pudo cargar el horario.</p>
          <Button type="button" onClick={retry}>
            Reintentar
          </Button>
        </div>
      )}
      {load.status === 'ready' && (
        <form className={styles.stack} onSubmit={handleSubmit} noValidate>
          {!load.configured && (
            <p className={pageStyles.placeholder}>
              Todavía no publicaste tu horario. Marcá los días que abrís, ajustá las horas y guardá.
            </p>
          )}
          {generalError && <p className={formStyles.generalError} role="alert">{generalError}</p>}
          {saved && <p className={pageStyles.success} role="status">El horario se guardó correctamente.</p>}

          <ul className={styles.hoursList}>
            {rows.map((row) => {
              const label = DAY_LABELS[row.dayOfWeek];
              const error = rowErrors[row.dayOfWeek];
              const inputClass = [fieldStyles.input, styles.timeInput, error ? fieldStyles.inputError : '']
                .filter(Boolean)
                .join(' ');
              return (
                <li key={row.dayOfWeek} className={styles.dayRow}>
                  <span className={styles.dayLabel}>{label}</span>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      aria-label={`${label}: abierto`}
                      checked={!row.isClosed}
                      disabled={submitting}
                      onChange={(e) => updateRow(row.dayOfWeek, { isClosed: !e.target.checked })}
                    />
                    Abierto
                  </label>
                  <div className={styles.timeRange}>
                    {row.isClosed ? (
                      <span className={styles.closedText}>Cerrado</span>
                    ) : (
                      <>
                        <input
                          type="time"
                          aria-label={`Hora de apertura (${label})`}
                          aria-invalid={error ? true : undefined}
                          disabled={submitting}
                          className={inputClass}
                          value={row.openTime}
                          onChange={(e) => updateRow(row.dayOfWeek, { openTime: e.target.value })}
                        />
                        <span className={styles.timeSeparator}>a</span>
                        <input
                          type="time"
                          aria-label={`Hora de cierre (${label})`}
                          aria-invalid={error ? true : undefined}
                          disabled={submitting}
                          className={inputClass}
                          value={row.closeTime}
                          onChange={(e) => updateRow(row.dayOfWeek, { closeTime: e.target.value })}
                        />
                      </>
                    )}
                  </div>
                  {error && <span className={`${fieldStyles.error} ${styles.rowError}`}>{error}</span>}
                </li>
              );
            })}
          </ul>

          <div className={styles.actions}>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando…' : 'Guardar horario'}
            </Button>
          </div>
        </form>
      )}
    </article>
  );
}
