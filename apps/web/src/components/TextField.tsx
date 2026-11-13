import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import styles from './TextField.module.css';

interface FieldProps {
  label: string;
  error?: string | null;
}

type TextFieldProps =
  | (FieldProps & InputHTMLAttributes<HTMLInputElement> & { multiline?: false })
  | (FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement> & { multiline: true });

export function TextField({ label, id, error, className, multiline, ...props }: TextFieldProps) {
  const controlProps = {
    id,
    className: [styles.input, multiline ? styles.textarea : '', error ? styles.inputError : '', className]
      .filter(Boolean)
      .join(' '),
    'aria-invalid': error ? true : undefined,
  };

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {multiline ? (
        <textarea {...controlProps} {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      ) : (
        <input {...controlProps} {...(props as InputHTMLAttributes<HTMLInputElement>)} />
      )}
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
