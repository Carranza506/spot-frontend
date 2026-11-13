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
          <LogoMark />
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

function LogoMark() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      {/* On the dark panel a navy square would vanish: a translucent white one keeps the mark visible. */}
      <rect x="2" y="2" width="20" height="20" rx="6" fill="rgba(255, 255, 255, 0.16)" />
      <circle cx="16.5" cy="16.5" r="3" fill="var(--color-accentAmber)" />
    </svg>
  );
}
