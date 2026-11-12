import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  ApiError,
  BUSINESS_LEGAL_NAME_MAX_LENGTH,
  BUSINESS_NAME_MAX_LENGTH,
  getMyBusiness,
  mapBusinessApiError,
  splitPhone,
  toE164,
  updateOwnBusiness,
  validateEmail,
  validateHttpUrl,
  validatePhone,
  validateRequired,
  type components,
} from '@spot/shared';
import { authClient } from '../api/client';
import { Button } from '../components/Button';
import { useFeedback } from '../components/feedback/feedbackContext';
import { PhoneField, type PhoneValue } from '../components/PhoneField';
import { TextField } from '../components/TextField';
import { useBusinessContext } from '../routes/businessContext';
import { ContactsCard } from './profile/ContactsCard';
import { LocationCard } from './profile/LocationCard';
import formStyles from './AuthForm.module.css';
import styles from './BusinessProfilePage.module.css';

type Business = components['schemas']['Business'];

type FormField = 'name' | 'description' | 'legalName' | 'email' | 'phone' | 'website' | 'logoUrl';
// The phone is kept apart as a PhoneValue (country + number), see PhoneField.
type FormValues = Record<Exclude<FormField, 'phone'>, string>;

type LoadState = { status: 'loading' } | { status: 'ready' } | { status: 'missing' | 'unauthenticated' | 'error' };

function toFormValues(business: Business): FormValues {
  return {
    name: business.name,
    description: business.description ?? '',
    legalName: business.legalName ?? '',
    email: business.email ?? '',
    website: business.website ?? '',
    logoUrl: business.logoUrl ?? '',
  };
}

/** Blank optional fields are sent as `null`, which clears them (BusinessUpdateRequest). */
function optional(value: string): string | null {
  return value.trim() || null;
}

function validate(values: FormValues, phone: PhoneValue): Partial<Record<FormField, string>> {
  const errors: Partial<Record<FormField, string>> = {};
  const nameError = validateRequired(values.name, 'El nombre del negocio es requerido.');
  if (nameError) errors.name = nameError;
  if (values.email.trim()) {
    const emailError = validateEmail(values.email.trim());
    if (emailError) errors.email = emailError;
  }
  const phoneError = validatePhone(phone.national, phone.country);
  if (phoneError) errors.phone = phoneError;
  for (const field of ['website', 'logoUrl'] as const) {
    if (values[field].trim()) {
      const urlError = validateHttpUrl(values[field]);
      if (urlError) errors[field] = urlError;
    }
  }
  return errors;
}

export function BusinessProfilePage() {
  const navigate = useNavigate();
  const { showToast } = useFeedback();
  const { business, setBusiness } = useBusinessContext();
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [values, setValues] = useState<FormValues>(() => toFormValues(business));
  const [phone, setPhone] = useState(() => splitPhone(business.phone));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reads the business fresh when the view opens, so the form reflects the persisted state
  // rather than whatever BusinessGuard loaded earlier in the session.
  const fetchBusiness = useCallback(() => {
    getMyBusiness(authClient)
      .then((fresh) => {
        setBusiness(fresh);
        setValues(toFormValues(fresh));
        setPhone(splitPhone(fresh.phone));
        setLoadState({ status: 'ready' });
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) setLoadState({ status: 'missing' });
        else if (error instanceof ApiError && error.status === 401) setLoadState({ status: 'unauthenticated' });
        else setLoadState({ status: 'error' });
      });
  }, [setBusiness]);

  useEffect(fetchBusiness, [fetchBusiness]);

  function retry() {
    setLoadState({ status: 'loading' });
    fetchBusiness();
  }

  function updateField(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const errors = validate(values, phone);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setGeneralError(null);
      return;
    }

    setFieldErrors({});
    setGeneralError(null);
    setSubmitting(true);
    try {
      const updated = await updateOwnBusiness(authClient, {
        name: values.name.trim(),
        description: optional(values.description),
        legalName: optional(values.legalName),
        email: optional(values.email),
        phone: toE164(phone.national, phone.country),
        website: optional(values.website),
        logoUrl: optional(values.logoUrl),
      });
      setBusiness(updated);
      setValues(toFormValues(updated));
      setPhone(splitPhone(updated.phone));
      showToast('Los cambios se guardaron correctamente.');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        navigate('/login', { replace: true });
      } else if (error instanceof ApiError) {
        const mapped = mapBusinessApiError(error);
        setFieldErrors(mapped.fieldErrors);
        setGeneralError(mapped.generalError ?? null);
      } else {
        setGeneralError('No se pudo conectar con el servidor. Intentá de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loadState.status === 'missing') return <Navigate to="/complete-profile" replace />;
  if (loadState.status === 'unauthenticated') return <Navigate to="/login" replace />;

  return (
    <div className={styles.page}>
      <article className={styles.card}>
        <h2 className={styles.cardTitle}>Datos del negocio</h2>
        {loadState.status === 'loading' && <div className={styles.message}>Cargando…</div>}
        {loadState.status === 'error' && (
          <div className={styles.message}>
            <p className={formStyles.generalError}>No se pudo cargar tu negocio.</p>
            <Button type="button" onClick={retry}>
              Reintentar
            </Button>
          </div>
        )}
        {loadState.status === 'ready' && (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {generalError && <p className={`${formStyles.generalError} ${styles.fullRow}`}>{generalError}</p>}
            <TextField
              id="name"
              label="Nombre del negocio"
              placeholder="Salón Bella Vista"
              autoComplete="organization"
              maxLength={BUSINESS_NAME_MAX_LENGTH}
              value={values.name}
              onChange={(e) => updateField('name', e.target.value)}
              error={fieldErrors.name}
            />
            <TextField
              id="legalName"
              label="Razón social (opcional)"
              placeholder="Bella Vista S.A."
              maxLength={BUSINESS_LEGAL_NAME_MAX_LENGTH}
              value={values.legalName}
              onChange={(e) => updateField('legalName', e.target.value)}
              error={fieldErrors.legalName}
            />
            <div className={styles.fullRow}>
              <TextField
                multiline
                id="description"
                label="Descripción (opcional)"
                placeholder="Contale a tus clientes sobre tu negocio"
                value={values.description}
                onChange={(e) => updateField('description', e.target.value)}
                error={fieldErrors.description}
              />
            </div>
            <TextField
              id="email"
              label="Correo (opcional)"
              type="email"
              placeholder="negocio@correo.com"
              autoComplete="email"
              value={values.email}
              onChange={(e) => updateField('email', e.target.value)}
              error={fieldErrors.email}
            />
            <PhoneField id="phone" label="Teléfono (opcional)" value={phone} onChange={setPhone} error={fieldErrors.phone} />
            <TextField
              id="website"
              label="Sitio web (opcional)"
              type="url"
              placeholder="https://bellavista.cr"
              autoComplete="url"
              value={values.website}
              onChange={(e) => updateField('website', e.target.value)}
              error={fieldErrors.website}
            />
            <TextField
              id="logoUrl"
              label="URL del logo (opcional)"
              type="url"
              placeholder="https://bellavista.cr/logo.png"
              value={values.logoUrl}
              onChange={(e) => updateField('logoUrl', e.target.value)}
              error={fieldErrors.logoUrl}
            />
            <div className={`${styles.actions} ${styles.fullRow}`}>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        )}
      </article>

      <div className={styles.sideColumn}>
        <LocationCard businessId={business.id} />
        <ContactsCard businessId={business.id} />
      </div>
    </div>
  );
}
