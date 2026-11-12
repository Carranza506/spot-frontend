import { useState } from 'react';
import { PHONE_COUNTRIES, validatePhone, type CountryCode } from '@spot/shared';
import styles from './TextField.module.css';
import phoneStyles from './PhoneField.module.css';

export interface PhoneValue {
  country: CountryCode;
  /** The number without the country code, as typed. */
  national: string;
}

interface PhoneFieldProps {
  id: string;
  label: string;
  value: PhoneValue;
  onChange: (value: PhoneValue) => void;
  /** From the form's submit or the API; shown instead of the field's own check. */
  error?: string | null;
}

/**
 * A country selector (with its code, e.g. "+506") and the number without it. The number is checked
 * for the selected country once the field is left, and live from then on; send it with toE164().
 */
export function PhoneField({ id, label, value, onChange, error }: PhoneFieldProps) {
  const [touched, setTouched] = useState(false);
  const shownError = error ?? (touched ? validatePhone(value.national, value.country) : null);
  const errorId = `${id}-error`;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={phoneStyles.row}>
        <select
          aria-label={`País de ${label.toLowerCase()}`}
          className={[styles.input, phoneStyles.country].join(' ')}
          value={value.country}
          onChange={(e) => onChange({ ...value, country: e.target.value as CountryCode })}
        >
          {PHONE_COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.dialCode} {country.name}
            </option>
          ))}
        </select>
        <input
          id={id}
          type="tel"
          autoComplete="tel-national"
          inputMode="tel"
          className={[styles.input, phoneStyles.number, shownError ? styles.inputError : ''].filter(Boolean).join(' ')}
          aria-invalid={shownError ? true : undefined}
          aria-describedby={shownError ? errorId : undefined}
          value={value.national}
          onChange={(e) => onChange({ ...value, national: e.target.value })}
          onBlur={() => setTouched(true)}
        />
      </div>
      {shownError && (
        <span id={errorId} className={styles.error}>
          {shownError}
        </span>
      )}
    </div>
  );
}
