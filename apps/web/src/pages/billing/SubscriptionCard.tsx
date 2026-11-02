import { useState } from 'react';
import { ApiError, formatPrice, type components } from '@spot/shared';
import { Button } from '../../components/Button';
import { INTERVAL_LABELS, SUBSCRIPTION_STATUS_LABELS, formatDate } from './format';
import { billingApi } from './billingApi';
import formStyles from '../AuthForm.module.css';
import pageStyles from '../BusinessProfilePage.module.css';
import styles from './Billing.module.css';

type Subscription = components['schemas']['Subscription'];
type SubscriptionStatus = components['schemas']['SubscriptionStatus'];

const NETWORK_ERROR = 'No se pudo conectar con el servidor. Intentá de nuevo.';

const STATUS_BADGE: Record<SubscriptionStatus, string> = {
  ACTIVE: styles.badgeSuccess,
  PAST_DUE: styles.badgeWarning,
  CANCELED: styles.badgeMuted,
  EXPIRED: styles.badgeMuted,
};

interface SubscriptionCardProps {
  subscription: Subscription;
  onChange: (subscription: Subscription) => void;
  onAuthError: (error: unknown) => boolean;
  /** Re-reads the subscription, e.g. after a 404 shows it ended since the page loaded. */
  onStale: () => void;
}

/** Mi suscripción: the effective plan, its status and period end, and cancel-at-period-end. */
export function SubscriptionCard({ subscription, onChange, onAuthError, onStale }: SubscriptionCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { plan, status, currentPeriodEnd, cancelAtPeriodEnd } = subscription;
  // Only ACTIVE/PAST_DUE subscriptions can be canceled (404 otherwise).
  const cancellable = (status === 'ACTIVE' || status === 'PAST_DUE') && !cancelAtPeriodEnd;

  async function handleCancel() {
    setError(null);
    setSuccess(null);
    setPending(true);
    try {
      const updated = await billingApi.cancelSubscription();
      setConfirmOpen(false);
      setSuccess('Tu suscripción se cancelará al final del período actual.');
      onChange(updated);
    } catch (err) {
      if (onAuthError(err)) return;
      setConfirmOpen(false);
      if (err instanceof ApiError && err.status === 404) {
        setError('No tenés una suscripción activa para cancelar. Actualizamos tu suscripción.');
        onStale();
      } else {
        setError(err instanceof ApiError ? err.message : NETWORK_ERROR);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <article className={pageStyles.card}>
      <h2 className={pageStyles.cardTitle}>Mi suscripción</h2>
      <div className={styles.stack}>
        {success && <p className={pageStyles.success}>{success}</p>}
        {error && <p className={formStyles.generalError}>{error}</p>}

        <dl className={styles.details}>
          <div className={styles.detail}>
            <dt>Plan</dt>
            <dd>{plan.name}</dd>
          </div>
          <div className={styles.detail}>
            <dt>Precio</dt>
            <dd>
              {formatPrice(plan.priceCrc)} / {INTERVAL_LABELS[plan.interval]}
            </dd>
          </div>
          <div className={styles.detail}>
            <dt>Estado</dt>
            <dd>
              {status ? (
                <span className={`${styles.badge} ${STATUS_BADGE[status]}`}>{SUBSCRIPTION_STATUS_LABELS[status]}</span>
              ) : (
                <span className={`${styles.badge} ${styles.badgeMuted}`}>Sin suscripción</span>
              )}
            </dd>
          </div>
          {currentPeriodEnd && (
            <div className={styles.detail}>
              <dt>{cancelAtPeriodEnd ? 'Vigente hasta' : 'Próxima renovación'}</dt>
              <dd>{formatDate(currentPeriodEnd)}</dd>
            </div>
          )}
        </dl>

        {!status && <p className={styles.note}>Estás en el plan gratuito. Suscribite a un plan pago para quitar los límites.</p>}
        {status === 'PAST_DUE' && (
          <p className={styles.note}>El último cobro no se pudo completar; tu plan sigue activo mientras tanto.</p>
        )}

        {cancelAtPeriodEnd && currentPeriodEnd ? (
          <p className={styles.note}>Se cancelará el {formatDate(currentPeriodEnd)}.</p>
        ) : cancellable && confirmOpen ? (
          <div className={styles.confirmPanel}>
            <p>
              ¿Cancelar tu suscripción? Vas a mantener el plan {plan.name} hasta
              {currentPeriodEnd ? ` el ${formatDate(currentPeriodEnd)}` : ' el final del período'} y después no se
              renovará.
            </p>
            <div className={styles.confirmActions}>
              <button type="button" className={styles.textButton} onClick={() => setConfirmOpen(false)} disabled={pending}>
                Volver
              </button>
              <Button type="button" onClick={handleCancel} disabled={pending}>
                {pending ? 'Cancelando…' : 'Cancelar suscripción'}
              </Button>
            </div>
          </div>
        ) : cancellable ? (
          <button
            type="button"
            className={styles.dangerButton}
            onClick={() => {
              setConfirmOpen(true);
              setSuccess(null);
              setError(null);
            }}
          >
            Cancelar suscripción
          </button>
        ) : null}
      </div>
    </article>
  );
}
