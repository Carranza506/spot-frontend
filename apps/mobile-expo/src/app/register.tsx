import { useState } from 'react';
import { Text } from 'react-native';
import { Link, router } from 'expo-router';
import { ApiError, mapAuthApiError, register, validateEmail, validatePassword, validateRequired } from '@spot/shared';
import { authClient } from '@/api/client';
import { AuthScreen } from '@/components/AuthScreen';
import { TextField } from '@/components/TextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { authFormStyles } from '@/components/authFormStyles';

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const errors: Record<string, string> = {};
    const firstNameError = validateRequired(firstName, 'El nombre es requerido.');
    const lastNameError = validateRequired(lastName, 'El apellido es requerido.');
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    if (firstNameError) errors.firstName = firstNameError;
    if (lastNameError) errors.lastName = lastNameError;
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
      // No `role`: this consumer app only ever creates CLIENT accounts (the contract default).
      await register(authClient, {
        email,
        password,
        firstName,
        lastName,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
      router.replace('/home');
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
    <AuthScreen>
      <Text style={authFormStyles.title}>Crear cuenta</Text>
      {generalError && <Text style={authFormStyles.generalError}>{generalError}</Text>}

      <TextField
        label="Nombre"
        placeholder="Andrea"
        autoComplete="given-name"
        value={firstName}
        onChangeText={setFirstName}
        error={fieldErrors.firstName}
      />
      <TextField
        label="Apellidos"
        placeholder="Morera Zúñiga"
        autoComplete="family-name"
        value={lastName}
        onChangeText={setLastName}
        error={fieldErrors.lastName}
      />
      <TextField
        label="Teléfono"
        placeholder="+506 8888-1234"
        keyboardType="phone-pad"
        autoComplete="tel"
        value={phone}
        onChangeText={setPhone}
        error={fieldErrors.phone}
      />
      <TextField
        label="Correo"
        placeholder="vos@correo.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        error={fieldErrors.email}
      />
      <TextField
        label="Contraseña"
        placeholder="Mínimo 8 caracteres"
        secureTextEntry
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
      />

      <PrimaryButton title="Crear cuenta" onPress={handleSubmit} loading={submitting} />

      <Text style={authFormStyles.footerRow}>
        ¿Ya tenés cuenta?{' '}
        <Link href="/" style={authFormStyles.footerLink}>
          Iniciá sesión
        </Link>
      </Text>
    </AuthScreen>
  );
}
