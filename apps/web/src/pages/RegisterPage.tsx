import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ApiError,
  createBusiness,
  mapAuthApiError,
  register,
  validateEmail,
  validatePassword,
  validateRequired,
} from '@spot/shared';
import { authClient } from '../api/client';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import formStyles from './AuthForm.module.css';

export function RegisterPage() {
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const errors: Record<string, string> = {};
    const nameError = validateRequired(businessName, 'El nombre del negocio es requerido.');
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    if (nameError) errors.name = nameError;
    if (emailError) errors.email = emailError;
    if (passwordError) errors.password = passwordError;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setGeneralError(null);
      return;
    }

    setFieldErrors({});
    setGeneralError(null);
    setSubmitting(true);
    try {
      await register(authClient, { email, password, role: 'BUSINESS' });
    } catch (error) {
      if (error instanceof ApiError) {
        const mapped = mapAuthApiError(error);
        setFieldErrors(mapped.fieldErrors);
        setGeneralError(mapped.generalError ?? null);
      } else {
        setGeneralError('No se pudo conectar con el servidor. Intentá de nuevo.');
      }
      setSubmitting(false);
      return;
    }

    // The account and its session already exist at this point, so a failure here must
    // not leave the user on a form whose resubmit would 409 on the email: they finish
    // the business profile from the complete-profile page instead.
    const business = { name: businessName.trim(), ...(phone.trim() ? { phone: phone.trim() } : {}) };
    try {
      await createBusiness(authClient, business);
      navigate('/dashboard', { replace: true });
    } catch {
      navigate('/complete-profile', { replace: true, state: business });
    }
  }

  return (
    <AuthLayout
      heading="Crear cuenta"
      footer={
        <>
          ¿Ya tenés una cuenta? <Link to="/login">Iniciar sesión</Link>
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
          id="email"
          label="Correo"
          type="email"
          placeholder="negocio@correo.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
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
        <TextField
          id="password"
          label="Contraseña"
          type="password"
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
        />
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
        </Button>
      </form>
    </AuthLayout>
  );
}
