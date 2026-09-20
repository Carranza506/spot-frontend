import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
}

export function Button({ fullWidth, className, ...props }: ButtonProps) {
  const classes = [styles.button, fullWidth ? styles.fullWidth : '', className].filter(Boolean).join(' ');
  return <button className={classes} {...props} />;
}
