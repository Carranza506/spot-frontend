import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  /** A shorter button, for dialogs and action rows. */
  compact?: boolean;
}

export function Button({ fullWidth, variant = 'primary', compact, className, ...props }: ButtonProps) {
  const classes = [styles.button, styles[variant], compact ? styles.compact : '', fullWidth ? styles.fullWidth : '', className]
    .filter(Boolean)
    .join(' ');
  return <button className={classes} {...props} />;
}
