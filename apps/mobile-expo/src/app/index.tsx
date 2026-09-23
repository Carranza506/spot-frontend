import { useState } from 'react';
import { Text } from 'react-native';
import { Link, router } from 'expo-router';
import { ApiError, login, mapAuthApiError, validateEmail, validatePassword } from '@spot/shared';
import { authClient } from '@/api/client';
import { AuthScreen } from '@/components/AuthScreen';
import { TextField } from '@/components/TextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { authFormStyles } from '@/components/authFormStyles';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
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
      <Text style={authFormStyles.title}>Iniciar sesión</Text>
      {generalError && <Text style={authFormStyles.generalError}>{generalError}</Text>}

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

      <PrimaryButton title="Entrar" onPress={handleSubmit} loading={submitting} />

      <Text style={authFormStyles.footerRow}>
        ¿Nuevo por aquí?{' '}
        <Link href="/register" style={authFormStyles.footerLink}>
          Registrate
        </Link>
      </Text>
    </AuthScreen>
  );
}
