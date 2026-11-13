import { Link } from 'react-router-dom';
import pageStyles from './BusinessProfilePage.module.css';
import styles from './billing/Billing.module.css';

/** Where Stripe Checkout sends the user when they leave without paying. Nothing was charged. */
export function BillingCancelPage() {
  return (
    <article className={pageStyles.card}>
      <div className={styles.result}>
        <h2 className={styles.resultTitle}>Pago cancelado</h2>
        <p>No se realizó ningún cobro y tu plan sigue igual. Podés suscribirte cuando quieras.</p>
        <Link to="/billing" className={styles.textButton}>
          Volver a los planes
        </Link>
      </div>
    </article>
  );
}
