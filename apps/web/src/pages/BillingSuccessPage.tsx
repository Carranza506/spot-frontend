import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, type components } from '@spot/shared';
import { Button } from '../components/Button';
import { CheckCircleIcon, ClockIcon } from '../components/dashboard/icons';
import { billingApi } from './billing/billingApi';
import { formatDate } from './billing/format';
import pageStyles from './BusinessProfilePage.module.css';
import styles from './billing/Billing.module.css';

type Subscription = components['schemas']['Subscription'];

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 20000;

type CheckState = { status: 'processing' } | { status: 'active'; subscription: Subscription } | { status: 'timeout' };

/** A finished round of polling, tagged with the attempt it belongs to; any other attempt is still processing. */
type Checked = { attempt: number } & Exclude<CheckState, { status: 'processing' }>;

/**
 * Where Stripe Checkout sends the user after paying (`?session_id=` is ignored: no endpoint takes it).
 * The redirect proves nothing — the subscription only becomes ACTIVE once the backend gets Stripe's
 * webhook — so this polls GET /business/billing/subscription until it reads ACTIVE or gives up.
 */
export function BillingSuccessPage() {
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(0);
  const [checked, setChecked] = useState<Checked | null>(null);

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

  const state: CheckState = checked?.attempt === attempt ? checked : { status: 'processing' };

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    async function check() {
      try {
        const subscription = await billingApi.getSubscription();
        if (cancelled) return;
        if (subscription.status === 'ACTIVE') {
          setChecked({ attempt, status: 'active', subscription });
          return;
        }
      } catch (error) {
        // Anything but a 401 is treated as transient: keep polling until the deadline.
        if (cancelled || handleAuthError(error)) return;
      }
      if (Date.now() + POLL_INTERVAL_MS > deadline) {
        setChecked({ attempt, status: 'timeout' });
        return;
      }
      timer = window.setTimeout(check, POLL_INTERVAL_MS);
    }

    check();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [attempt, handleAuthError]);

  return (
    <article className={pageStyles.card}>
      <div className={styles.result}>
        {state.status === 'processing' ? (
          <>
            <span className={styles.resultIcon}>
              <ClockIcon size={40} />
            </span>
            <h2 className={styles.resultTitle}>Procesando tu pago…</h2>
            <p>Estamos confirmando el pago con Stripe. Esto puede tardar unos segundos; no cierres esta página.</p>
          </>
        ) : state.status === 'active' ? (
          <>
            <span className={styles.resultIconSuccess}>
              <CheckCircleIcon size={40} />
            </span>
            <h2 className={styles.resultTitle}>¡Listo! Tu plan {state.subscription.plan.name} está activo</h2>
            {state.subscription.currentPeriodEnd && (
              <p>Se renovará el {formatDate(state.subscription.currentPeriodEnd)}.</p>
            )}
            <Link to="/billing" className={styles.textButton}>
              Ver mi suscripción
            </Link>
          </>
        ) : (
          <>
            <span className={styles.resultIcon}>
              <ClockIcon size={40} />
            </span>
            <h2 className={styles.resultTitle}>Tu pago se está procesando</h2>
            <p>
              Todavía no recibimos la confirmación de Stripe. Puede tardar un momento en reflejarse; si ya pagaste, no
              vuelvas a pagar.
            </p>
            <div className={styles.resultActions}>
              <Button type="button" onClick={() => setAttempt((a) => a + 1)}>
                Volver a comprobar
              </Button>
              <Link to="/billing" className={styles.textButton}>
                Ir a mi suscripción
              </Link>
            </div>
          </>
        )}
      </div>
    </article>
  );
}
