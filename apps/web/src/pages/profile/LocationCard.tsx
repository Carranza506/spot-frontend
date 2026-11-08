import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ApiError,
  BUSINESS_LOCATION_CITY_MAX_LENGTH,
  BUSINESS_LOCATION_POSTAL_CODE_MAX_LENGTH,
  COSTA_RICA_PROVINCES,
  getBusinessLocation,
  mapBusinessLocationApiError,
  parseCoordinate,
  upsertBusinessLocation,
  validateCoordinate,
  validateRequired,
  type components,
} from '@spot/shared';
import { authClient } from '../../api/client';
import { Button } from '../../components/Button';
import { SelectField } from '../../components/SelectField';
import { TextField } from '../../components/TextField';
import formStyles from '../AuthForm.module.css';
import pageStyles from '../BusinessProfilePage.module.css';
import styles from './ContactsCard.module.css';

type BusinessLocation = components['schemas']['BusinessLocation'];

type FormField = 'address' | 'province' | 'city' | 'postalCode' | 'latitude' | 'longitude';
type FormValues = Record<FormField, string>;

type LoadState = { status: 'loading' } | { status: 'ready' } | { status: 'error' };

const NETWORK_ERROR = 'No se pudo conectar con el servidor. Intentá de nuevo.';
// BusinessLocationUpsertRequest.country's default in the contract; the form doesn't edit it.
const DEFAULT_COUNTRY = 'Costa Rica';
const EMPTY_FORM: FormValues = { address: '', province: '', city: '', postalCode: '', latitude: '', longitude: '' };

function toFormValues(location: BusinessLocation): FormValues {
  return {
    address: location.address,
    province: location.province ?? '',
    city: location.city ?? '',
    postalCode: location.postalCode ?? '',
    latitude: String(location.location.latitude),
    longitude: String(location.location.longitude),
  };
}

function validate(values: FormValues): Partial<Record<FormField, string>> {
  const errors: Partial<Record<FormField, string>> = {};
  const addressError = validateRequired(values.address, 'La dirección es requerida.');
  if (addressError) errors.address = addressError;
  const latitudeError = validateCoordinate(values.latitude, 90);
  if (latitudeError) errors.latitude = latitudeError;
  const longitudeError = validateCoordinate(values.longitude, 180);
  if (longitudeError) errors.longitude = longitudeError;
  return errors;
}

/** Blank optional fields are left out: the PUT replaces the whole location, so they end up empty. */
function optional(value: string): string | undefined {
  return value.trim() || undefined;
}

interface LocationCardProps {
  businessId: string;
}

/** Ubicación of the business profile: address, province/city and the map point the search uses. */
export function LocationCard({ businessId }: LocationCardProps) {
  const navigate = useNavigate();
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  // Kept so a save sends back the country the business already has.
  const [country, setCountry] = useState<string | undefined>(undefined);
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  const fetchLocation = useCallback(() => {
    getBusinessLocation(authClient, businessId)
      .then((location) => {
        setValues(toFormValues(location));
        setCountry(location.country);
        setLoadState({ status: 'ready' });
      })
      .catch((error: unknown) => {
        // 404: no location yet, so the form starts empty.
        if (error instanceof ApiError && error.status === 404) setLoadState({ status: 'ready' });
        else setLoadState({ status: 'error' });
      });
  }, [businessId]);

  useEffect(fetchLocation, [fetchLocation]);

  function retry() {
    setLoadState({ status: 'loading' });
    fetchLocation();
  }

  function updateField(field: FormField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }

  function fillCurrentPosition() {
    if (!('geolocation' in navigator)) {
      setGeneralError('Tu navegador no permite obtener la ubicación. Ingresá las coordenadas a mano.');
      return;
    }
    setGeneralError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValues((current) => ({
          ...current,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setFieldErrors((current) => {
          const next = { ...current };
          delete next.latitude;
          delete next.longitude;
          return next;
        });
        setSaved(false);
        setLocating(false);
      },
      () => {
        setGeneralError('No se pudo obtener tu ubicación. Revisá el permiso del navegador o ingresá las coordenadas a mano.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
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
      const updated = await upsertBusinessLocation(authClient, businessId, {
        address: values.address.trim(),
        province: optional(values.province),
        city: optional(values.city),
        postalCode: optional(values.postalCode),
        country: country ?? DEFAULT_COUNTRY,
        location: { latitude: parseCoordinate(values.latitude), longitude: parseCoordinate(values.longitude) },
      });
      setValues(toFormValues(updated));
      setCountry(updated.country);
      setSaved(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        navigate('/login', { replace: true });
      } else if (error instanceof ApiError) {
        const mapped = mapBusinessLocationApiError(error);
        setFieldErrors(mapped.fieldErrors);
        setGeneralError(mapped.generalError ?? null);
      } else {
        setGeneralError(NETWORK_ERROR);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const hasPoint = !validateCoordinate(values.latitude, 90) && !validateCoordinate(values.longitude, 180);
  // A province saved before this list existed (or by another client) stays selectable.
  const provinces: readonly string[] =
    values.province && !(COSTA_RICA_PROVINCES as readonly string[]).includes(values.province)
      ? [...COSTA_RICA_PROVINCES, values.province]
      : COSTA_RICA_PROVINCES;

  return (
    <article className={pageStyles.card}>
      <h2 className={pageStyles.cardTitle}>Ubicación</h2>

      {loadState.status === 'loading' && <p className={pageStyles.placeholder}>Cargando…</p>}
      {loadState.status === 'error' && (
        <div className={styles.stack}>
          <p className={formStyles.generalError}>No se pudo cargar la ubicación.</p>
          <Button type="button" onClick={retry}>
            Reintentar
          </Button>
        </div>
      )}
      {loadState.status === 'ready' && (
        <form className={styles.stack} onSubmit={handleSubmit} noValidate>
          <p className={pageStyles.placeholder}>
            Con la ubicación, los clientes encuentran tu negocio por provincia, ciudad y “Cerca de mí”.
          </p>
          {generalError && <p className={formStyles.generalError}>{generalError}</p>}
          {saved && <p className={pageStyles.success}>La ubicación se guardó correctamente.</p>}
          <TextField
            id="address"
            label="Dirección"
            placeholder="200 m norte de la iglesia, San José Centro"
            autoComplete="street-address"
            value={values.address}
            onChange={(e) => updateField('address', e.target.value)}
            error={fieldErrors.address}
          />
          <SelectField
            id="province"
            label="Provincia (opcional)"
            value={values.province}
            onChange={(e) => updateField('province', e.target.value)}
            error={fieldErrors.province}
          >
            <option value="">Sin especificar</option>
            {provinces.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </SelectField>
          <TextField
            id="city"
            label="Ciudad (opcional)"
            placeholder="San José"
            autoComplete="address-level2"
            maxLength={BUSINESS_LOCATION_CITY_MAX_LENGTH}
            value={values.city}
            onChange={(e) => updateField('city', e.target.value)}
            error={fieldErrors.city}
          />
          <TextField
            id="postalCode"
            label="Código postal (opcional)"
            placeholder="10101"
            autoComplete="postal-code"
            maxLength={BUSINESS_LOCATION_POSTAL_CODE_MAX_LENGTH}
            value={values.postalCode}
            onChange={(e) => updateField('postalCode', e.target.value)}
            error={fieldErrors.postalCode}
          />
          <TextField
            id="latitude"
            label="Latitud"
            inputMode="decimal"
            placeholder="9.9325"
            value={values.latitude}
            onChange={(e) => updateField('latitude', e.target.value)}
            error={fieldErrors.latitude}
          />
          <TextField
            id="longitude"
            label="Longitud"
            inputMode="decimal"
            placeholder="-84.0795"
            value={values.longitude}
            onChange={(e) => updateField('longitude', e.target.value)}
            error={fieldErrors.longitude}
          />
          <div className={styles.formActions}>
            {hasPoint && (
              <a
                className={styles.cancelButton}
                href={`https://www.google.com/maps?q=${parseCoordinate(values.latitude)},${parseCoordinate(values.longitude)}`}
                target="_blank"
                rel="noreferrer"
              >
                Ver en el mapa
              </a>
            )}
            <button
              type="button"
              className={styles.cancelButton}
              onClick={fillCurrentPosition}
              disabled={locating || submitting}
            >
              {locating ? 'Obteniendo ubicación…' : 'Usar mi ubicación actual'}
            </button>
          </div>
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? 'Guardando…' : 'Guardar ubicación'}
          </Button>
        </form>
      )}
    </article>
  );
}
