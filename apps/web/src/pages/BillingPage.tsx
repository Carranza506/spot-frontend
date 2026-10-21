import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, type components } from '@spot/shared';
import { Button } from '../components/Button';
import { billingApi } from './billing/billingApi';
import { PaymentsCard } from './billing/PaymentsCard';
import { PlansCard } from './billing/PlansCard';
import { SubscriptionCard } from './billing/SubscriptionCard';
import pageStyles from './BusinessProfilePage.module.css';
import styles from './billing/Billing.module.css';

type Plan = components['schemas']['Plan'];
type Subscription = components['schemas']['Subscription'];

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; plans: Plan[]; subscription: Subscription }
  | { status: 'error' };

/** A finished load, tagged with the reloadKey it answered; any other key is still loading. */
type Loaded = { key: number } & Exclude<LoadState, { status: 'loading' }>;

/** Plan: the available plans (subscribe through Stripe Checkout), the current subscription and its payments. */
export function BillingPage() {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

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

  const state: LoadState = loaded?.key === reloadKey ? loaded : { status: 'loading' };

  useEffect(() => {
    let ignore = false;
    Promise.all([billingApi.listPlans(), billingApi.getSubscription()])
      .then(([plans, subscription]) => {
        if (!ignore) setLoaded({ key: reloadKey, status: 'ready', plans, subscription });
      })
      .catch((error: unknown) => {
        if (!ignore && !handleAuthError(error)) setLoaded({ key: reloadKey, status: 'error' });
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey, handleAuthError]);

  const setSubscription = useCallback((subscription: Subscription) => {
    setLoaded((current) => (current?.status === 'ready' ? { ...current, subscription } : current));
  }, []);

  // Re-reads only the subscription, in place, so the cards keep the message that explains why.
  const refreshSubscription = useCallback(() => {
    billingApi
      .getSubscription()
      .then(setSubscription)
      .catch((error: unknown) => {
        handleAuthError(error);
      });
  }, [setSubscription, handleAuthError]);

  if (state.status !== 'ready') {
    return (
      <article className={pageStyles.card}>
        <h2 className={pageStyles.cardTitle}>Plan</h2>
        {state.status === 'loading' ? (
          <div className={pageStyles.message}>Cargando…</div>
        ) : (
          <div className={pageStyles.message}>
            <p>No se pudo cargar tu plan.</p>
            <Button type="button" onClick={() => setReloadKey((key) => key + 1)}>
              Reintentar
            </Button>
          </div>
        )}
      </article>
    );
  }

  return (
    <div className={styles.page}>
      <div className={pageStyles.page}>
        <PlansCard
          plans={state.plans}
          currentPlanCode={state.subscription.plan.code}
          onAuthError={handleAuthError}
          onStale={refreshSubscription}
        />
        <SubscriptionCard
          subscription={state.subscription}
          onChange={setSubscription}
          onAuthError={handleAuthError}
          onStale={refreshSubscription}
        />
      </div>
      <PaymentsCard onAuthError={handleAuthError} />
    </div>
  );
}
