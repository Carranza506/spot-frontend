import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, type BookingAction, type components } from '@spot/shared';
import { Button } from '../components/Button';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import { useBusinessContext } from '../routes/businessContext';
import { BookingRow } from './bookings/BookingRow';
import { bookingsApi, isBookingsMock } from './bookings/bookingsApi';
import { ACTION_VERBS, STATUS_LABELS, localIsoDate } from './bookings/format';
import formStyles from './AuthForm.module.css';
import pageStyles from './BusinessProfilePage.module.css';
import styles from './bookings/Bookings.module.css';

type Booking = components['schemas']['Booking'];
type BookingStatus = components['schemas']['BookingStatus'];
type Pagination = components['schemas']['PaginationMeta'];

const PAGE_SIZE = 20;
const NETWORK_ERROR = 'No se pudo conectar con el servidor. Intentá de nuevo.';

const SUCCESS_MESSAGES: Record<BookingAction, string> = {
  cancel: 'Reservación cancelada.',
  complete: 'Reservación marcada como completada.',
  noShow: 'Reservación marcada como no asistida.',
};

interface Filters {
  status: BookingStatus | '';
  from: string;
  to: string;
}

type ListState =
  | { status: 'loading' }
  | { status: 'ready'; bookings: Booking[]; pagination: Pagination }
  | { status: 'error' };

/** A finished list request, tagged with the query it answered; any other query is still loading. */
type LoadedList = { query: string } & Exclude<ListState, { status: 'loading' }>;

/** Reservaciones: the business's bookings, filtered by status/date, with cancel/complete/no-show. */
export function BookingsPage() {
  const { business } = useBusinessContext();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<Filters>(() => ({ status: '', from: localIsoDate(new Date()), to: '' }));
  const [page, setPage] = useState(1);
  const [loaded, setLoaded] = useState<LoadedList | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const rangeError = filters.from && filters.to && filters.from > filters.to ? 'La fecha final debe ser posterior a la inicial.' : null;

  const handleAuthError = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        navigate('/login', { replace: true });
        return true;
      }
      return false;
    },
    [navigate],
  );

  // Changing a filter, the page or reloadKey changes the query, so the list reads as loading
  // until the response for that exact query arrives (and late responses for old ones are ignored).
  const query = JSON.stringify([business.id, filters, page, reloadKey]);
  const list: ListState = loaded?.query === query ? loaded : { status: 'loading' };

  useEffect(() => {
    if (rangeError) return;
    let ignore = false;
    bookingsApi
      .list(business.id, {
        page,
        pageSize: PAGE_SIZE,
        status: filters.status || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      })
      .then((result) => {
        if (!ignore) setLoaded({ query, status: 'ready', bookings: result.data, pagination: result.pagination });
      })
      .catch((error: unknown) => {
        if (!ignore && !handleAuthError(error)) setLoaded({ query, status: 'error' });
      });
    return () => {
      ignore = true;
    };
  }, [business.id, filters, page, query, rangeError, handleAuthError]);

  function updateFilters(changes: Partial<Filters>) {
    setFilters((current) => ({ ...current, ...changes }));
    setPage(1);
    setActionError(null);
    setSuccess(null);
  }

  const reload = () => setReloadKey((key) => key + 1);

  async function handleAction(booking: Booking, action: BookingAction, reason?: string) {
    setActionError(null);
    setSuccess(null);
    setPendingId(booking.id);
    try {
      const updated =
        action === 'cancel'
          ? await bookingsApi.cancel(booking.id, reason)
          : action === 'complete'
            ? await bookingsApi.complete(booking.id)
            : await bookingsApi.markNoShow(booking.id);
      setSuccess(SUCCESS_MESSAGES[action]);
      // The new status may no longer match the status filter, so re-read instead of patching in place.
      if (filters.status && updated.status !== filters.status) reload();
      else
        setLoaded((current) =>
          current?.status === 'ready'
            ? { ...current, bookings: current.bookings.map((b) => (b.id === updated.id ? updated : b)) }
            : current,
        );
    } catch (error) {
      if (handleAuthError(error)) return;
      if (error instanceof ApiError && error.status === 422) {
        // Invalid transition: the booking changed state since the list was loaded (another tab, the client).
        setActionError(
          `No se pudo ${ACTION_VERBS[action]} la reservación porque ya cambió de estado. Actualizamos la lista con su estado actual.`,
        );
        reload();
      } else if (error instanceof ApiError && error.status === 404) {
        setActionError('La reservación ya no existe. Actualizamos la lista.');
        reload();
      } else {
        setActionError(error instanceof ApiError ? error.message : NETWORK_ERROR);
      }
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className={styles.page}>
      {isBookingsMock && (
        <p className={styles.mockNotice}>
          Modo de prueba: las reservaciones son de ejemplo y se guardan solo en este navegador (VITE_BOOKINGS_MOCK=true).
        </p>
      )}

      <article className={pageStyles.card}>
        <h2 className={pageStyles.cardTitle}>Reservaciones</h2>

        <div className={styles.filters}>
          <SelectField
            id="bookingStatus"
            label="Estado"
            value={filters.status}
            onChange={(e) => updateFilters({ status: e.target.value as BookingStatus | '' })}
          >
            <option value="">Todos</option>
            {(Object.keys(STATUS_LABELS) as BookingStatus[]).map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </SelectField>
          <TextField
            id="bookingFrom"
            label="Desde"
            type="date"
            value={filters.from}
            onChange={(e) => updateFilters({ from: e.target.value })}
          />
          <TextField
            id="bookingTo"
            label="Hasta"
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(e) => updateFilters({ to: e.target.value })}
            error={rangeError}
          />
        </div>

        <div className={styles.stack}>
          {success && <p className={pageStyles.success}>{success}</p>}
          {actionError && <p className={formStyles.generalError}>{actionError}</p>}

          {rangeError ? null : list.status === 'loading' ? (
            <p className={pageStyles.placeholder}>Cargando…</p>
          ) : list.status === 'error' ? (
            <>
              <p className={formStyles.generalError}>No se pudieron cargar las reservaciones.</p>
              <Button type="button" onClick={reload}>
                Reintentar
              </Button>
            </>
          ) : list.bookings.length === 0 ? (
            <p className={pageStyles.placeholder}>No hay reservaciones con estos filtros.</p>
          ) : (
            <>
              <ul className={styles.list}>
                {list.bookings.map((booking) => (
                  <BookingRow
                    // Keyed by status too: a transition remounts the row, closing its cancel form.
                    key={`${booking.id}-${booking.status}`}
                    booking={booking}
                    busy={pendingId !== null}
                    pending={pendingId === booking.id}
                    onAction={handleAction}
                  />
                ))}
              </ul>
              {list.pagination.totalPages > 1 && (
                <nav className={styles.pager} aria-label="Paginación">
                  <button
                    type="button"
                    className={styles.action}
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page <= 1}
                  >
                    Anterior
                  </button>
                  <span className={styles.pageInfo}>
                    Página {list.pagination.page} de {list.pagination.totalPages} · {list.pagination.total} reservaciones
                  </span>
                  <button
                    type="button"
                    className={styles.action}
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= list.pagination.totalPages}
                  >
                    Siguiente
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </article>
    </div>
  );
}
