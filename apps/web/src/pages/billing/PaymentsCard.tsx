import { useEffect, useState } from 'react';
import type { components } from '@spot/shared';
import { Button } from '../../components/Button';
import { formatPrice } from '../bookings/format';
import { PAYMENT_STATUS_LABELS, formatDate } from './format';
import { billingApi } from './billingApi';
import formStyles from '../AuthForm.module.css';
import pageStyles from '../BusinessProfilePage.module.css';
import styles from './Billing.module.css';

type Payment = components['schemas']['SubscriptionPayment'];
type PaymentStatus = components['schemas']['PaymentStatus'];
type Pagination = components['schemas']['PaginationMeta'];

const PAGE_SIZE = 10;

const STATUS_BADGE: Record<PaymentStatus, string> = {
  PAID: styles.badgeSuccess,
  FAILED: styles.badgeDanger,
};

type ListState =
  | { status: 'loading' }
  | { status: 'ready'; payments: Payment[]; pagination: Pagination }
  | { status: 'error' };

/** A finished list request, tagged with the query it answered; any other query is still loading. */
type LoadedList = { query: string } & Exclude<ListState, { status: 'loading' }>;

interface PaymentsCardProps {
  onAuthError: (error: unknown) => boolean;
}

/** Historial de pagos: the subscription payments Stripe reported, paginated. */
export function PaymentsCard({ onAuthError }: PaymentsCardProps) {
  const [page, setPage] = useState(1);
  const [loaded, setLoaded] = useState<LoadedList | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Same approach as BookingsPage: the list reads as loading until the response for this exact
  // query arrives, and late responses for an older page are ignored.
  const query = JSON.stringify([page, reloadKey]);
  const list: ListState = loaded?.query === query ? loaded : { status: 'loading' };

  useEffect(() => {
    let ignore = false;
    billingApi
      .listPayments({ page, pageSize: PAGE_SIZE })
      .then((result) => {
        if (ignore) return;
        setLoaded({ query, status: 'ready', payments: result.data, pagination: result.pagination });
      })
      .catch((error: unknown) => {
        if (!ignore && !onAuthError(error)) setLoaded({ query, status: 'error' });
      });
    return () => {
      ignore = true;
    };
  }, [page, query, onAuthError]);

  const reload = () => setReloadKey((key) => key + 1);

  return (
    <article className={pageStyles.card}>
      <h2 className={pageStyles.cardTitle}>Historial de pagos</h2>
      <div className={styles.stack}>
        {list.status === 'loading' ? (
          <p className={pageStyles.placeholder}>Cargando…</p>
        ) : list.status === 'error' ? (
          <>
            <p className={formStyles.generalError}>No se pudo cargar el historial de pagos.</p>
            <Button type="button" onClick={reload}>
              Reintentar
            </Button>
          </>
        ) : list.payments.length === 0 ? (
          <p className={pageStyles.placeholder}>Todavía no hay pagos registrados.</p>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Monto</th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                {list.payments.map((payment) => (
                  <tr key={payment.id}>
                    {/* A FAILED payment has no paidAt. */}
                    <td>{payment.paidAt ? formatDate(payment.paidAt) : '—'}</td>
                    <td>{formatPrice(payment.amountCrc)}</td>
                    <td>
                      <span className={`${styles.badge} ${STATUS_BADGE[payment.status]}`}>
                        {PAYMENT_STATUS_LABELS[payment.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  Página {list.pagination.page} de {list.pagination.totalPages} · {list.pagination.total} pagos
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
  );
}
