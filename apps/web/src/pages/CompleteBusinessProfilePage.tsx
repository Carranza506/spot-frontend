import { useState, type FormEvent, type MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError, createBusiness, logout, mapAuthApiError, validateRequired } from '@spot/shared';
import { authClient } from '../api/client';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import formStyles from './AuthForm.module.css';

/** Values RegisterPage passes along when its createBusiness call failed, to prefill the form. */
interface PrefillState {
  name?: string;
  phone?: string;
}

export function CompleteBusinessProfilePage() {
  const navigate = useNavigate();
  const prefill = (useLocation().state ?? {}) as PrefillState;
  const [businessName, setBusinessName] = useState(prefill.name ?? '');
  const [phone, setPhone] = useState(prefill.phone ?? '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const nameError = validateRequired(businessName, 'El nombre del negocio es requerido.');
    if (nameError) {
      setFieldErrors({ name: nameError });
      setGeneralError(null);
      return;
    }

    setFieldErrors({});
    setGeneralError(null);
    setSubmitting(true);
    try {
      await createBusiness(authClient, {
        name: businessName.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // The account already has its business (1:1), so there is nothing left to complete.
        navigate('/dashboard', { replace: true });
      } else if (error instanceof ApiError && error.status === 401) {
        navigate('/login', { replace: true });
      } else if (error instanceof ApiError) {
        const mapped = mapAuthApiError(error);
        setFieldErrors(mapped.fieldErrors);
        setGeneralError(mapped.generalError ?? null);
      } else {
        setGeneralError('No se pudo conectar con el servidor. Intentá de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    await logout(authClient);
    navigate('/login', { replace: true });
  }

  return (
    <AuthLayout
      heading="Completá el perfil de tu negocio"
      footer={
        <>
          ¿No es tu cuenta?{' '}
          <a href="/login" onClick={handleLogout}>
            Cerrar sesión
          </a>
        </>
      }
    >
      <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
        {generalError && <p className={formStyles.generalError}>{generalError}</p>}
        <TextField
          id="name"
          label="Nombre del negocio"
          placeholder="Salón Bella Vista"
          autoComplete="organization"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          error={fieldErrors.name}
        />
        <TextField
          id="phone"
          label="Teléfono (opcional)"
          type="tel"
          placeholder="+506 2222-3344"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={fieldErrors.phone}
        />
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? 'Guardando…' : 'Guardar y continuar'}
        </Button>
      </form>
    </AuthLayout>
  );
}
