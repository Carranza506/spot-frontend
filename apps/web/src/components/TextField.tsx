import type { InputHTMLAttributes } from 'react';
import styles from './TextField.module.css';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
}

export function TextField({ label, id, error, className, ...props }: TextFieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        className={[styles.input, error ? styles.inputError : '', className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
