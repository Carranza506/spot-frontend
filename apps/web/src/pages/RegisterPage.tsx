import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, mapAuthApiError, register, validateEmail, validatePassword, validateRequired } from '@spot/shared';
import { authClient } from '../api/client';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import formStyles from './AuthForm.module.css';

export function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const errors: Record<string, string> = {};
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const firstNameError = validateRequired(firstName, 'El nombre es requerido.');
    const lastNameError = validateRequired(lastName, 'El apellido es requerido.');
    if (emailError) errors.email = emailError;
    if (passwordError) errors.password = passwordError;
    if (firstNameError) errors.firstName = firstNameError;
    if (lastNameError) errors.lastName = lastNameError;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setGeneralError(null);
      return;
    }

    setFieldErrors({});
    setGeneralError(null);
    setSubmitting(true);
    try {
      await register(authClient, {
        email,
        password,
        firstName,
        lastName,
        role: 'BUSINESS_OWNER',
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
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
          id="firstName"
          label="Nombre"
          placeholder="María José"
          autoComplete="given-name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          error={fieldErrors.firstName}
        />
        <TextField
          id="lastName"
          label="Apellido"
          placeholder="Rodríguez Solís"
          autoComplete="family-name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          error={fieldErrors.lastName}
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
          placeholder="+506 8888-1234"
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
