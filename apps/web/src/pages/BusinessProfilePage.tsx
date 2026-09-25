import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  ApiError,
  BUSINESS_LEGAL_NAME_MAX_LENGTH,
  BUSINESS_NAME_MAX_LENGTH,
  BUSINESS_PHONE_MAX_LENGTH,
  getMyBusiness,
  mapBusinessApiError,
  updateOwnBusiness,
  validateEmail,
  validateHttpUrl,
  validateRequired,
  type components,
} from '@spot/shared';
import { authClient } from '../api/client';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { useBusinessContext } from '../routes/businessContext';
import { ContactsCard } from './profile/ContactsCard';
import formStyles from './AuthForm.module.css';
import styles from './BusinessProfilePage.module.css';

type Business = components['schemas']['Business'];

type FormField = 'name' | 'description' | 'legalName' | 'email' | 'phone' | 'website' | 'logoUrl';
type FormValues = Record<FormField, string>;

type LoadState = { status: 'loading' } | { status: 'ready' } | { status: 'missing' | 'unauthenticated' | 'error' };

function toFormValues(business: Business): FormValues {
  return {
    name: business.name,
    description: business.description ?? '',
    legalName: business.legalName ?? '',
    email: business.email ?? '',
    phone: business.phone ?? '',
    website: business.website ?? '',
    logoUrl: business.logoUrl ?? '',
  };
}

/** Blank optional fields are sent as `null`, which clears them (BusinessUpdateRequest). */
function optional(value: string): string | null {
  return value.trim() || null;
}

function validate(values: FormValues): Partial<Record<FormField, string>> {
  const errors: Partial<Record<FormField, string>> = {};
  const nameError = validateRequired(values.name, 'El nombre del negocio es requerido.');
  if (nameError) errors.name = nameError;
  if (values.email.trim()) {
    const emailError = validateEmail(values.email.trim());
    if (emailError) errors.email = emailError;
  }
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
  const { business, setBusiness } = useBusinessContext();
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [values, setValues] = useState<FormValues>(() => toFormValues(business));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reads the business fresh when the view opens, so the form reflects the persisted state
  // rather than whatever BusinessGuard loaded earlier in the session.
  const fetchBusiness = useCallback(() => {
    getMyBusiness(authClient)
      .then((fresh) => {
        setBusiness(fresh);
        setValues(toFormValues(fresh));
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

  function updateField(field: FormField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaved(false);

    const errors = validate(values);
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
        phone: optional(values.phone),
        website: optional(values.website),
        logoUrl: optional(values.logoUrl),
      });
      setBusiness(updated);
      setValues(toFormValues(updated));
      setSaved(true);
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
            <p>No se pudo cargar tu negocio.</p>
            <Button type="button" onClick={retry}>
              Reintentar
            </Button>
          </div>
        )}
        {loadState.status === 'ready' && (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {generalError && <p className={`${formStyles.generalError} ${styles.fullRow}`}>{generalError}</p>}
            {saved && <p className={`${styles.success} ${styles.fullRow}`}>Los cambios se guardaron correctamente.</p>}
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
            <TextField
              id="phone"
              label="Teléfono (opcional)"
              type="tel"
              placeholder="+506 2222-3344"
              autoComplete="tel"
              maxLength={BUSINESS_PHONE_MAX_LENGTH}
              value={values.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              error={fieldErrors.phone}
            />
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

      {/* Ubicación stays a placeholder until the location endpoint exists in contracts/spot-api.yaml. */}
      <div className={styles.sideColumn}>
        <article className={styles.card}>
          <h2 className={styles.cardTitle}>Ubicación</h2>
          <p className={styles.placeholder}>Próximamente vas a poder indicar dónde se encuentra tu negocio.</p>
        </article>
        <ContactsCard businessId={business.id} />
      </div>
    </div>
  );
}
