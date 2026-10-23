import { useEffect, useState } from 'react';
import type { components } from '@spot/shared';
import { Button } from '../components/Button';
import { useBusinessContext } from '../routes/businessContext';
import { ReviewRow } from './reviews/ReviewRow';
import { isReviewsMock, reviewsApi } from './reviews/reviewsApi';
import formStyles from './AuthForm.module.css';
import pageStyles from './BusinessProfilePage.module.css';
import styles from './reviews/Reviews.module.css';

type Review = components['schemas']['Review'];
type Pagination = components['schemas']['PaginationMeta'];

const PAGE_SIZE = 10;

type ListState =
  | { status: 'loading' }
  | { status: 'ready'; reviews: Review[]; pagination: Pagination }
  | { status: 'error' };

/** A finished list request, tagged with the query it answered; any other query is still loading. */
type LoadedList = { query: string } & Exclude<ListState, { status: 'loading' }>;

/** Reseñas: the reviews clients left on the business's completed bookings, newest first, paginated. */
export function ReviewsPage() {
  const { business } = useBusinessContext();

  const [page, setPage] = useState(1);
  const [loaded, setLoaded] = useState<LoadedList | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Same approach as BookingsPage: the list reads as loading until the response for this exact
  // query arrives, and late responses for an older page are ignored.
  const query = JSON.stringify([business.id, page, reloadKey]);
  const list: ListState = loaded?.query === query ? loaded : { status: 'loading' };

  // The endpoint is public, so there's no 401 to redirect on (unlike BookingsPage).
  useEffect(() => {
    let ignore = false;
    reviewsApi
      .list(business.id, { page, pageSize: PAGE_SIZE })
      .then((result) => {
        if (ignore) return;
        const lastPage = Math.max(1, result.pagination.totalPages);
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setLoaded({ query, status: 'ready', reviews: result.data, pagination: result.pagination });
      })
      .catch(() => {
        if (!ignore) setLoaded({ query, status: 'error' });
      });
    return () => {
      ignore = true;
    };
  }, [business.id, page, query]);

  const reload = () => setReloadKey((key) => key + 1);

  return (
    <div className={styles.page}>
      {isReviewsMock && (
        <p className={styles.mockNotice}>
          Modo de prueba: las reseñas son de ejemplo y no vienen del servidor (VITE_REVIEWS_MOCK=true).
        </p>
      )}

      <article className={pageStyles.card}>
        <div className={styles.titleRow}>
          <h2 className={pageStyles.cardTitle}>Reseñas</h2>
          {list.status === 'ready' && list.pagination.total > 0 && (
            <span className={styles.total}>
              {list.pagination.total} {list.pagination.total === 1 ? 'reseña' : 'reseñas'}
            </span>
          )}
        </div>

        <div className={styles.stack}>
          {list.status === 'loading' ? (
            <p className={pageStyles.placeholder}>Cargando…</p>
          ) : list.status === 'error' ? (
            <>
              <p className={formStyles.generalError}>No se pudieron cargar las reseñas.</p>
              <Button type="button" onClick={reload}>
                Reintentar
              </Button>
            </>
          ) : list.reviews.length === 0 ? (
            <p className={pageStyles.placeholder}>
              Tu negocio todavía no tiene reseñas. Aparecerán aquí cuando tus clientes califiquen sus reservaciones
              completadas.
            </p>
          ) : (
            <>
              <ul className={styles.list}>
                {list.reviews.map((review) => (
                  <ReviewRow key={review.id} review={review} />
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
                    Página {list.pagination.page} de {list.pagination.totalPages}
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
