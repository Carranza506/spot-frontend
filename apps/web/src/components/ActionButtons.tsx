import type { ReactNode } from 'react';
import styles from './ActionButtons.module.css';

interface ActionButtonsProps {
  className?: string;
  /** One above the other, for a narrow card where a long label would break in two lines. */
  stacked?: boolean;
  children: ReactNode;
}

/** A row of equally sized buttons, aligned to the right: the secondary one first, then the main one. */
export function ActionButtons({ className, stacked, children }: ActionButtonsProps) {
  const classes = [styles.actions, stacked ? styles.stacked : '', className].filter(Boolean).join(' ');
  return <div className={classes}>{children}</div>;
}
