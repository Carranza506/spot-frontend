import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ApiError,
  SCHEDULE_EXCEPTION_REASON_MAX_LENGTH,
  fromApiTime,
  mapBusinessApiError,
  toApiTime,
  validateTimeRange,
  type components,
} from '@spot/shared';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import fieldStyles from '../../components/TextField.module.css';
import formStyles from '../AuthForm.module.css';
import pageStyles from '../BusinessProfilePage.module.css';
import { formatIsoDate, todayIsoDate } from './dates';
import { scheduleApi } from './scheduleApi';
import styles from './Schedule.module.css';

type BusinessScheduleException = components['schemas']['BusinessScheduleException'];

// BusinessScheduleExceptionCreateRequest fields, for mapping a 400's details.field.
const EXCEPTION_FIELDS = new Set(['exceptionDate', 'isClosed', 'openTime', 'closeTime', 'reason']);

const DEFAULT_OPEN_TIME = '09:00';
const DEFAULT_CLOSE_TIME = '13:00';

const NETWORK_ERROR = 'No se pudo conectar con el servidor. Intentá de nuevo.';

type ListState =
  | { status: 'loading' }
  | { status: 'ready'; exceptions: BusinessScheduleException[] }
  | { status: 'error' };

/** Form errors by field; `timeRange` covers the open/close pair as a whole. */
type FormErrors = Partial<Record<'exceptionDate' | 'timeRange' | 'reason', string>>;

function describe(exception: BusinessScheduleException): string {
  const hours = exception.isClosed
    ? 'Cerrado todo el día'
    : `${fromApiTime(exception.openTime)} a ${fromApiTime(exception.closeTime)}`;
  return exception.reason ? `${hours} · ${exception.reason}` : hours;
}

interface ScheduleExceptionsCardProps {
  businessId: string;
}

export function ScheduleExceptionsCard({ businessId }: ScheduleExceptionsCardProps) {
  const navigate = useNavigate();
  const [list, setList] = useState<ListState>({ status: 'loading' });
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [exceptionDate, setExceptionDate] = useState('');
  const [isClosed, setIsClosed] = useState(true);
  const [openTime, setOpenTime] = useState(DEFAULT_OPEN_TIME);
  const [closeTime, setCloseTime] = useState(DEFAULT_CLOSE_TIME);
  const [reason, setReason] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Only upcoming exceptions: past ones no longer affect availability.
  const fetchExceptions = useCallback(() => {
    scheduleApi
      .listExceptions(businessId, todayIsoDate())
      .then((exceptions) =>
        setList({
          status: 'ready',
          exceptions: [...exceptions].sort((a, b) => a.exceptionDate.localeCompare(b.exceptionDate)),
        }),
      )
      .catch(() => setList({ status: 'error' }));
  }, [businessId]);

  useEffect(fetchExceptions, [fetchExceptions]);

  function retry() {
    setList({ status: 'loading' });
    fetchExceptions();
  }

  function openForm() {
    setFormOpen(true);
    setActionError(null);
  }

  function closeForm() {
    setFormOpen(false);
    setExceptionDate('');
    setIsClosed(true);
    setOpenTime(DEFAULT_OPEN_TIME);
    setCloseTime(DEFAULT_CLOSE_TIME);
    setReason('');
    setFieldErrors({});
    setGeneralError(null);
  }

  function validate(): FormErrors {
    const errors: FormErrors = {};
    if (!exceptionDate) errors.exceptionDate = 'La fecha es requerida.';
    else if (exceptionDate < todayIsoDate()) errors.exceptionDate = 'La fecha no puede ser anterior a hoy.';
    if (!isClosed) {
      const timeError = validateTimeRange(openTime, closeTime);
      if (timeError) errors.timeRange = timeError;
    }
    return errors;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setGeneralError(null);
      return;
    }

    setFieldErrors({});
    setGeneralError(null);
    setSubmitting(true);
    try {
      await scheduleApi.createException(businessId, {
        exceptionDate,
        isClosed,
        ...(isClosed ? {} : { openTime: toApiTime(openTime), closeTime: toApiTime(closeTime) }),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      closeForm();
      fetchExceptions();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        navigate('/login', { replace: true });
      } else if (error instanceof ApiError && error.status === 409) {
        setFieldErrors({ exceptionDate: 'Ya existe una excepción para esa fecha.' });
      } else if (error instanceof ApiError) {
        const mapped = mapBusinessApiError(error, EXCEPTION_FIELDS);
        const { exceptionDate: dateError, reason: reasonError, openTime: openError, closeTime: closeError } =
          mapped.fieldErrors;
        setFieldErrors({ exceptionDate: dateError, reason: reasonError, timeRange: openError ?? closeError });
        setGeneralError(mapped.generalError ?? null);
      } else {
        setGeneralError(NETWORK_ERROR);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(exception: BusinessScheduleException) {
    if (!window.confirm(`¿Eliminar la excepción del ${formatIsoDate(exception.exceptionDate)}?`)) return;

    setActionError(null);
    setDeletingId(exception.id);
    try {
      await scheduleApi.deleteException(businessId, exception.id);
      fetchExceptions();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        navigate('/login', { replace: true });
      } else if (error instanceof ApiError && error.status === 404) {
        // Already gone: the refreshed list reflects that.
        fetchExceptions();
      } else {
        setActionError(error instanceof ApiError ? error.message : NETWORK_ERROR);
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <article className={pageStyles.card}>
      <h2 className={pageStyles.cardTitle}>Excepciones y feriados</h2>

      {list.status === 'loading' && <p className={pageStyles.placeholder}>Cargando…</p>}
      {list.status === 'error' && (
        <div className={styles.stack}>
          <p className={formStyles.generalError} role="alert">No se pudieron cargar las excepciones.</p>
          <Button type="button" onClick={retry}>
            Reintentar
          </Button>
        </div>
      )}
      {list.status === 'ready' && (
        <div className={styles.stack}>
          <p className={pageStyles.placeholder}>
            Feriados, cierres o un horario distinto para un día puntual. Tienen prioridad sobre el horario semanal.
          </p>
          {actionError && <p className={formStyles.generalError} role="alert">{actionError}</p>}
          {list.exceptions.length === 0 ? (
            <p className={pageStyles.placeholder}>Sin excepciones próximas.</p>
          ) : (
            <ul className={styles.list}>
              {list.exceptions.map((exception) => (
                <li key={exception.id} className={styles.row}>
                  <div className={styles.info}>
                    <span className={styles.title}>
                      {formatIsoDate(exception.exceptionDate)}
                      <span
                        className={`${styles.badge} ${exception.isClosed ? styles.badgeClosed : styles.badgeSpecial}`}
                      >
                        {exception.isClosed ? 'Cerrado' : 'Horario especial'}
                      </span>
                    </span>
                    <span className={styles.detail}>{describe(exception)}</span>
                  </div>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => handleDelete(exception)}
                    disabled={deletingId !== null}
                  >
                    {deletingId === exception.id ? 'Eliminando…' : 'Eliminar'}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {formOpen ? (
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              {generalError && <p className={formStyles.generalError} role="alert">{generalError}</p>}
              <TextField
                id="exceptionDate"
                label="Fecha"
                type="date"
                min={todayIsoDate()}
                value={exceptionDate}
                onChange={(e) => setExceptionDate(e.target.value)}
                error={fieldErrors.exceptionDate}
                disabled={submitting}
              />
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={isClosed}
                  onChange={(e) => setIsClosed(e.target.checked)}
                  disabled={submitting}
                />
                Cerrado todo el día
              </label>
              {!isClosed && (
                <>
                  <div className={styles.timeFields}>
                    <TextField
                      id="exceptionOpenTime"
                      label="Abre"
                      type="time"
                      value={openTime}
                      onChange={(e) => setOpenTime(e.target.value)}
                      disabled={submitting}
                      className={fieldErrors.timeRange ? fieldStyles.inputError : undefined}
                    />
                    <TextField
                      id="exceptionCloseTime"
                      label="Cierra"
                      type="time"
                      value={closeTime}
                      onChange={(e) => setCloseTime(e.target.value)}
                      disabled={submitting}
                      className={fieldErrors.timeRange ? fieldStyles.inputError : undefined}
                    />
                  </div>
                  {fieldErrors.timeRange && <span className={fieldStyles.error} role="alert">{fieldErrors.timeRange}</span>}
                </>
              )}
              <TextField
                id="exceptionReason"
                label="Motivo (opcional)"
                placeholder="Feriado, inventario, evento privado…"
                maxLength={SCHEDULE_EXCEPTION_REASON_MAX_LENGTH}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                error={fieldErrors.reason}
                disabled={submitting}
              />
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelButton} onClick={closeForm} disabled={submitting}>
                  Cancelar
                </button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Guardando…' : 'Guardar excepción'}
                </Button>
              </div>
            </form>
          ) : (
            <Button type="button" fullWidth onClick={openForm}>
              Agregar excepción
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
