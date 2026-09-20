import type { ReactNode } from 'react';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  heading: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthLayout({ heading, children, footer }: AuthLayoutProps) {
  return (
    <div className={styles.page}>
      <aside className={styles.leftPanel}>
        <div className={styles.logo}>
          <PinIcon />
          <span>Spot</span>
        </div>
        <h1 className={styles.title}>Panel de administración de negocios</h1>
        <p className={styles.subtitle}>
          Gestioná tus servicios, horarios, reservaciones y reseñas desde un solo lugar.
        </p>
      </aside>
      <main className={styles.rightPanel}>
        <div className={styles.formCard}>
          <h2 className={styles.heading}>{heading}</h2>
          {children}
          <div className={styles.footer}>{footer}</div>
        </div>
      </main>
    </div>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <path
        d="M12 2C7.58 2 4 5.58 4 10c0 5.25 6.72 11.19 7.01 11.44a1.5 1.5 0 0 0 1.98 0C13.28 21.19 20 15.25 20 10c0-4.42-3.58-8-8-8Z"
        stroke="var(--color-onPanelDark)"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="10" r="2.6" fill="var(--color-accentAmber)" />
    </svg>
  );
}
