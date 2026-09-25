import type { SelectHTMLAttributes } from 'react';
import styles from './TextField.module.css';

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string | null;
}

/** A <select> with TextField's label, border, focus and error styling; pass <option>s as children. */
export function SelectField({ label, id, error, className, children, ...props }: SelectFieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <select
        id={id}
        className={[styles.input, error ? styles.inputError : '', className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        {...props}
      >
        {children}
      </select>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
