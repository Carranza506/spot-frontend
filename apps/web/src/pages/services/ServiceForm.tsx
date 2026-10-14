import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ApiError,
  SERVICE_NAME_MAX_LENGTH,
  mapServiceApiError,
  validateRequired,
  validateServiceDuration,
  validateServicePrice,
  type components,
} from '@spot/shared';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import formStyles from '../AuthForm.module.css';
import styles from './Services.module.css';

type Service = components['schemas']['Service'];

export interface ServiceFormValues {
  name: string;
  /** null when left empty. */
  description: string | null;
  price: number;
  durationMinutes: number;
}

const NETWORK_ERROR = 'No se pudo conectar con el servidor. Intentá de nuevo.';

interface ServiceFormProps {
  /** The service being edited; omitted when creating one. */
  service?: Service;
  submitLabel: string;
  onSubmit: (values: ServiceFormValues) => Promise<void>;
  onCancel: () => void;
}

/** Create/edit form for a service's name, description, price (CRC) and duration. */
export function ServiceForm({ service, submitLabel, onSubmit, onCancel }: ServiceFormProps) {
  const navigate = useNavigate();
  const [name, setName] = useState(service?.name ?? '');
  const [description, setDescription] = useState(service?.description ?? '');
  const [price, setPrice] = useState(service ? String(service.price) : '');
  const [duration, setDuration] = useState(service ? String(service.durationMinutes) : '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const errors: Record<string, string> = {};
    const nameError = validateRequired(name, 'El nombre es requerido.');
    const priceError = validateServicePrice(price);
    const durationError = validateServiceDuration(duration);
    if (nameError) errors.name = nameError;
    if (priceError) errors.price = priceError;
    if (durationError) errors.durationMinutes = durationError;
    setFieldErrors(errors);
    setGeneralError(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price),
        durationMinutes: Number(duration),
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        navigate('/login', { replace: true });
      } else if (error instanceof ApiError) {
        const mapped = mapServiceApiError(error);
        setFieldErrors(mapped.fieldErrors);
        setGeneralError(mapped.generalError ?? null);
      } else {
        setGeneralError(NETWORK_ERROR);
      }
      setSubmitting(false);
    }
  }

  const idPrefix = service ? `service-${service.id}` : 'newService';

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {generalError && <p className={`${formStyles.generalError} ${styles.fullRow}`}>{generalError}</p>}
      <div className={styles.fullRow}>
        <TextField
          id={`${idPrefix}-name`}
          label="Nombre"
          placeholder="Corte y peinado"
          value={name}
          maxLength={SERVICE_NAME_MAX_LENGTH}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
        />
      </div>
      <div className={styles.fullRow}>
        <TextField
          id={`${idPrefix}-description`}
          label="Descripción (opcional)"
          multiline
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={fieldErrors.description}
        />
      </div>
      <TextField
        id={`${idPrefix}-price`}
        label="Precio (₡)"
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        placeholder="12000"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        error={fieldErrors.price}
      />
      <TextField
        id={`${idPrefix}-duration`}
        label="Duración (minutos)"
        type="number"
        inputMode="numeric"
        min={1}
        step={1}
        placeholder="45"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        error={fieldErrors.durationMinutes}
      />
      <div className={`${styles.formActions} ${styles.fullRow}`}>
        <button type="button" className={styles.textButton} onClick={onCancel} disabled={submitting}>
          Cancelar
        </button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Guardando…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
