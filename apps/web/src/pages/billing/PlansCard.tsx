import { useState } from 'react';
import { ApiError, type components } from '@spot/shared';
import { Button } from '../../components/Button';
import { CheckCircleIcon } from '../../components/dashboard/icons';
import { formatPrice } from '../bookings/format';
import { INTERVAL_LABELS, featureLines } from './format';
import { billingApi } from './billingApi';
import formStyles from '../AuthForm.module.css';
import pageStyles from '../BusinessProfilePage.module.css';
import styles from './Billing.module.css';

type Plan = components['schemas']['Plan'];
type PlanCode = components['schemas']['PlanCode'];

const NETWORK_ERROR = 'No se pudo conectar con el servidor. Intentá de nuevo.';

interface PlansCardProps {
  plans: Plan[];
  currentPlanCode: PlanCode;
  onAuthError: (error: unknown) => boolean;
  /** Re-reads the subscription, e.g. after a 409 shows it changed since the page loaded. */
  onStale: () => void;
}

/** Planes: every active plan with its price and features; paid ones not yet subscribed go to Stripe Checkout. */
export function PlansCard({ plans, currentPlanCode, onAuthError, onStale }: PlansCardProps) {
  const [pendingCode, setPendingCode] = useState<PlanCode | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe(plan: Plan) {
    setError(null);
    setPendingCode(plan.code);
    try {
      const checkoutUrl = await billingApi.checkout(plan.code);
      // Leaves the app for Stripe's hosted page; the button stays disabled until the browser navigates.
      // Same as `window.location.href = …`, which react-hooks/immutability rejects inside a component.
      window.location.assign(checkoutUrl);
    } catch (err) {
      setPendingCode(null);
      if (onAuthError(err)) return;
      if (err instanceof ApiError && err.status === 409 && err.code === 'ALREADY_SUBSCRIBED') {
        setError(`Ya tenés una suscripción activa al plan ${plan.name}. Actualizamos tu suscripción.`);
        onStale();
      } else {
        setError(err instanceof ApiError ? err.message : NETWORK_ERROR);
      }
    }
  }

  return (
    <article className={pageStyles.card}>
      <h2 className={pageStyles.cardTitle}>Planes</h2>
      <div className={styles.stack}>
        {error && <p className={formStyles.generalError}>{error}</p>}
        <div className={styles.plans}>
          {plans.map((plan) => {
            const isCurrent = plan.code === currentPlanCode;
            return (
              <section key={plan.code} className={[styles.plan, isCurrent ? styles.planCurrent : ''].join(' ')}>
                <div className={styles.planHeader}>
                  <h3 className={styles.planName}>{plan.name}</h3>
                  {isCurrent && <span className={`${styles.badge} ${styles.badgeSuccess}`}>Plan actual</span>}
                </div>
                <span className={styles.price}>
                  {formatPrice(plan.priceCrc)} <span className={styles.interval}>/ {INTERVAL_LABELS[plan.interval]}</span>
                </span>
                <ul className={styles.features}>
                  {featureLines(plan.features).map((line) => (
                    <li key={line} className={styles.feature}>
                      <span className={styles.featureIcon}>
                        <CheckCircleIcon size={16} />
                      </span>
                      {line}
                    </li>
                  ))}
                </ul>
                {/* FREE can't be checked out (it's what's left without a paid subscription). */}
                {!isCurrent && plan.code !== 'FREE' && (
                  <Button
                    type="button"
                    fullWidth
                    onClick={() => handleSubscribe(plan)}
                    disabled={pendingCode !== null}
                  >
                    {pendingCode === plan.code ? 'Redirigiendo…' : 'Suscribirse'}
                  </Button>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </article>
  );
}
