import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, login, mapAuthApiError, validateEmail, validatePassword } from '@spot/shared';
import { authClient } from '../api/client';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import formStyles from './AuthForm.module.css';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const errors: Record<string, string> = {};
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
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
      await login(authClient, { email, password });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
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

  return (
    <AuthLayout
      heading="Iniciar sesión"
      footer={
        <>
          ¿Registrar un negocio? <Link to="/register">Crear cuenta</Link>
        </>
      }
    >
      <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
        {generalError && <p className={formStyles.generalError}>{generalError}</p>}
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
          id="password"
          label="Contraseña"
          type="password"
          placeholder="Mínimo 8 caracteres"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
        />
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? 'Entrando…' : 'Entrar al panel'}
        </Button>
      </form>
    </AuthLayout>
  );
}
