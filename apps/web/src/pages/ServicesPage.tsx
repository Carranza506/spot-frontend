import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, type components } from '@spot/shared';
import { Button } from '../components/Button';
import { SelectField } from '../components/SelectField';
import { useBusinessContext } from '../routes/businessContext';
import { ServiceForm, type ServiceFormValues } from './services/ServiceForm';
import { ServiceRow } from './services/ServiceRow';
import { isServicesMock, servicesApi } from './services/servicesApi';
import formStyles from './AuthForm.module.css';
import pageStyles from './BusinessProfilePage.module.css';
import styles from './services/Services.module.css';

type Service = components['schemas']['Service'];
type Pagination = components['schemas']['PaginationMeta'];

const PAGE_SIZE = 20;
const NETWORK_ERROR = 'No se pudo conectar con el servidor. Intentá de nuevo.';

type StatusFilter = 'all' | 'active' | 'inactive';

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: 'Todos',
  active: 'Activos',
  inactive: 'Inactivos',
};

const IS_ACTIVE_QUERY: Record<StatusFilter, boolean | undefined> = {
  all: undefined,
  active: true,
  inactive: false,
};

type ListState =
  | { status: 'loading' }
  | { status: 'ready'; services: Service[]; pagination: Pagination }
  | { status: 'error' };

/** A finished list request, tagged with the query it answered; any other query is still loading. */
type LoadedList = { query: string } & Exclude<ListState, { status: 'loading' }>;

/** Servicios: the business's services (create, edit, deactivate/reactivate) and each one's photos. */
export function ServicesPage() {
  const { business } = useBusinessContext();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [loaded, setLoaded] = useState<LoadedList | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  // Same approach as BookingsPage: the list reads as loading until the response for this exact
  // query arrives, and late responses for an older filter/page are ignored.
  const query = JSON.stringify([business.id, statusFilter, page, reloadKey]);
  const list: ListState = loaded?.query === query ? loaded : { status: 'loading' };

  useEffect(() => {
    let ignore = false;
    servicesApi
      .list(business.id, { page, pageSize: PAGE_SIZE, isActive: IS_ACTIVE_QUERY[statusFilter] })
      .then((result) => {
        if (ignore) return;
        // A deactivation can empty the last page under the "Activos" filter: move back instead
        // of showing an empty list with no pager.
        const lastPage = Math.max(1, result.pagination.totalPages);
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setLoaded({ query, status: 'ready', services: result.data, pagination: result.pagination });
      })
      .catch((error: unknown) => {
        if (!ignore && !handleAuthError(error)) setLoaded({ query, status: 'error' });
      });
    return () => {
      ignore = true;
    };
  }, [business.id, statusFilter, page, query, handleAuthError]);

  const reload = () => setReloadKey((key) => key + 1);

  function clearMessages() {
    setActionError(null);
    setSuccess(null);
  }

  function changeFilter(filter: StatusFilter) {
    setStatusFilter(filter);
    setPage(1);
    clearMessages();
  }

  async function handleCreate(values: ServiceFormValues) {
    clearMessages();
    await servicesApi.create(business.id, { ...values, description: values.description ?? undefined });
    setCreating(false);
    setSuccess(`Servicio “${values.name}” creado.`);
    reload();
  }

  async function handleUpdate(service: Service, values: ServiceFormValues) {
    clearMessages();
    const updated = await servicesApi.update(service.id, values);
    setSuccess(`Servicio “${updated.name}” actualizado.`);
    setLoaded((current) =>
      current?.status === 'ready'
        ? { ...current, services: current.services.map((s) => (s.id === updated.id ? updated : s)) }
        : current,
    );
  }

  async function handleToggleActive(service: Service) {
    const deactivating = service.isActive;
    if (
      deactivating &&
      !window.confirm(
        `¿Desactivar “${service.name}”? Los clientes ya no podrán reservarlo; las reservaciones existentes se mantienen.`,
      )
    ) {
      return;
    }

    clearMessages();
    setPendingId(service.id);
    try {
      if (deactivating) await servicesApi.deactivate(service.id);
      else await servicesApi.update(service.id, { isActive: true });
      setSuccess(`Servicio “${service.name}” ${deactivating ? 'desactivado' : 'reactivado'}.`);
      // Re-read: the new state may no longer match the status filter.
      reload();
    } catch (error) {
      if (handleAuthError(error)) return;
      if (error instanceof ApiError && error.status === 404) {
        setActionError('El servicio ya no existe. Actualizamos la lista.');
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
      {isServicesMock && (
        <p className={styles.mockNotice}>
          Modo de prueba: los servicios y sus fotos son de ejemplo y se guardan solo en este navegador
          (VITE_SERVICES_MOCK=true).
        </p>
      )}

      <article className={pageStyles.card}>
        <div className={styles.titleRow}>
          <h2 className={pageStyles.cardTitle}>Servicios</h2>
          {!creating && (
            <Button
              type="button"
              onClick={() => {
                setCreating(true);
                clearMessages();
              }}
            >
              Nuevo servicio
            </Button>
          )}
        </div>

        <div className={styles.stack}>
          {creating && (
            <div className={styles.createPanel}>
              <h3 className={styles.panelTitle}>Nuevo servicio</h3>
              <ServiceForm submitLabel="Crear servicio" onSubmit={handleCreate} onCancel={() => setCreating(false)} />
            </div>
          )}

          <div className={styles.filters}>
            <SelectField
              id="serviceStatus"
              label="Estado"
              value={statusFilter}
              onChange={(e) => changeFilter(e.target.value as StatusFilter)}
            >
              {(Object.keys(STATUS_FILTER_LABELS) as StatusFilter[]).map((filter) => (
                <option key={filter} value={filter}>
                  {STATUS_FILTER_LABELS[filter]}
                </option>
              ))}
            </SelectField>
          </div>

          {success && <p className={pageStyles.success}>{success}</p>}
          {actionError && <p className={formStyles.generalError}>{actionError}</p>}

          {list.status === 'loading' ? (
            <p className={pageStyles.placeholder}>Cargando…</p>
          ) : list.status === 'error' ? (
            <>
              <p className={formStyles.generalError}>No se pudieron cargar los servicios.</p>
              <Button type="button" onClick={reload}>
                Reintentar
              </Button>
            </>
          ) : list.services.length === 0 ? (
            <p className={pageStyles.placeholder}>
              {statusFilter === 'all'
                ? 'Todavía no tenés servicios. Creá el primero con “Nuevo servicio”.'
                : 'No hay servicios con este estado.'}
            </p>
          ) : (
            <>
              <ul className={styles.list}>
                {list.services.map((service) => (
                  <ServiceRow
                    key={service.id}
                    service={service}
                    busy={pendingId !== null}
                    pending={pendingId === service.id}
                    onUpdate={handleUpdate}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </ul>
              {list.pagination.totalPages > 1 && (
                <nav className={styles.pager} aria-label="Paginación">
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page <= 1}
                  >
                    Anterior
                  </button>
                  <span className={styles.pageInfo}>
                    Página {list.pagination.page} de {list.pagination.totalPages} · {list.pagination.total} servicios
                  </span>
                  <button
                    type="button"
                    className={styles.textButton}
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
