import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ApiError,
  changePassword,
  getOwnProfile,
  logout,
  splitPhone,
  toE164,
  updateOwnProfile,
  validatePassword,
  validatePhone,
} from '@spot/shared';
import { authClient } from '../api/client';
import { Button } from '../components/Button';
import { useFeedback } from '../components/feedback/feedbackContext';
import { PhoneField, type PhoneValue } from '../components/PhoneField';
import { TextField } from '../components/TextField';
import formStyles from './AuthForm.module.css';
import styles from './BusinessProfilePage.module.css';

const NETWORK_ERROR = 'No se pudo conectar con el servidor. Intentá de nuevo.';

type Field = 'currentPassword' | 'newPassword' | 'confirmPassword';

/** Mi cuenta (W9): the account's own settings, apart from the business's. */
export function AccountPage() {
  // Stacked, not Perfil's two columns: the password form needs the full width.
  return (
    <div className={styles.sideColumn}>
      <ProfileCard />
      <PasswordCard />
    </div>
  );
}

type Profile = { email: string; phone: PhoneValue };

/** The account's email (read only) and phone. Its name is the business's, edited in Perfil. */
function ProfileCard() {
  const navigate = useNavigate();
  const { showToast } = useFeedback();
  const [profile, setProfile] = useState<Profile | 'loading' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;
    getOwnProfile(authClient)
      .then((user) => !ignore && setProfile({ email: user.email, phone: splitPhone(user.phone) }))
      .catch((error: unknown) => {
        if (ignore) return;
        if (error instanceof ApiError && error.status === 401) navigate('/login', { replace: true });
        else setProfile('error');
      });
    return () => {
      ignore = true;
    };
  }, [navigate, reloadKey]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (typeof profile !== 'object') return;
    const error = validatePhone(profile.phone.national, profile.phone.country);
    setPhoneError(error);
    setGeneralError(null);
    if (error) return;

    setSubmitting(true);
    try {
      const user = await updateOwnProfile(authClient, { phone: toE164(profile.phone.national, profile.phone.country) });
      setProfile({ email: user.email, phone: splitPhone(user.phone) });
      showToast('Datos de la cuenta actualizados.');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) navigate('/login', { replace: true });
      else if (error instanceof ApiError && error.status === 400) setPhoneError(error.message);
      else setGeneralError(error instanceof ApiError ? error.message : NETWORK_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className={styles.card}>
      <h2 className={styles.cardTitle}>Datos de la cuenta</h2>
      {profile === 'loading' && <div className={styles.message}>Cargando…</div>}
      {profile === 'error' && (
        <div className={styles.message}>
          <p className={formStyles.generalError}>No se pudieron cargar los datos de tu cuenta.</p>
          <Button
            type="button"
            onClick={() => {
              setProfile('loading');
              setReloadKey((key) => key + 1);
            }}
          >
            Reintentar
          </Button>
        </div>
      )}
      {typeof profile === 'object' && (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {generalError && <p className={`${formStyles.generalError} ${styles.fullRow}`}>{generalError}</p>}
          <TextField id="email" label="Correo" type="email" value={profile.email} readOnly disabled />
          <PhoneField
            id="accountPhone"
            label="Teléfono (opcional)"
            value={profile.phone}
            onChange={(phone) => setProfile({ ...profile, phone })}
            error={phoneError}
          />
          <div className={`${styles.actions} ${styles.fullRow}`}>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      )}
    </article>
  );
}

function PasswordCard() {
  const navigate = useNavigate();
  const { showToast } = useFeedback();
  const [values, setValues] = useState<Record<Field, string>>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (field: Field) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors: Partial<Record<Field, string>> = {};
    if (!values.currentPassword) errors.currentPassword = 'Ingresá tu contraseña actual.';
    const newError = validatePassword(values.newPassword);
    if (newError) errors.newPassword = newError;
    else if (values.newPassword === values.currentPassword)
      errors.newPassword = 'La nueva contraseña tiene que ser distinta de la actual.';
    if (values.confirmPassword !== values.newPassword) errors.confirmPassword = 'Las contraseñas no coinciden.';

    setFieldErrors(errors);
    setGeneralError(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await changePassword(authClient, {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
    } catch (error) {
      setSubmitting(false);
      if (error instanceof ApiError && error.status === 401) {
        navigate('/login', { replace: true });
      } else if (error instanceof ApiError && error.status === 422) {
        setFieldErrors({ currentPassword: error.message });
      } else {
        setGeneralError(error instanceof ApiError ? error.message : NETWORK_ERROR);
      }
      return;
    }

    // The backend revoked every refresh token, this one included: end the session here too. The
    // logout call itself may fail on the revoked token; the tokens are cleared either way.
    await logout(authClient).catch(() => undefined);
    showToast('Contraseña cambiada. Iniciá sesión con la nueva.');
    navigate('/login', { replace: true });
  }

  return (
    <article className={styles.card}>
      <h2 className={styles.cardTitle}>Cambiar contraseña</h2>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {generalError && <p className={`${formStyles.generalError} ${styles.fullRow}`}>{generalError}</p>}
        <div className={styles.fullRow}>
          <TextField
            id="currentPassword"
            label="Contraseña actual"
            type="password"
            autoComplete="current-password"
            value={values.currentPassword}
            onChange={set('currentPassword')}
            error={fieldErrors.currentPassword}
          />
        </div>
        <TextField
          id="newPassword"
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          value={values.newPassword}
          onChange={set('newPassword')}
          error={fieldErrors.newPassword}
        />
        <TextField
          id="confirmPassword"
          label="Confirmar nueva contraseña"
          type="password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={set('confirmPassword')}
          error={fieldErrors.confirmPassword}
        />
        <p className={`${styles.placeholder} ${styles.fullRow}`}>
          Al cambiarla se cierra la sesión en todos tus dispositivos, incluido este.
        </p>
        <div className={`${styles.actions} ${styles.fullRow}`}>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Guardando…' : 'Cambiar contraseña'}
          </Button>
        </div>
      </form>
    </article>
  );
}
