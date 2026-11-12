import { useRef, useState } from 'react';
import { Text, type TextInputInstance } from 'react-native';
import { Link } from 'expo-router';
import { ApiError, login, logout, mapAuthApiError, validateEmail, validatePassword } from '@spot/shared';
import { authClient } from '@/api/client';
import { WRONG_ROLE_MESSAGE, forgetWrongRole, rememberWrongRole, takeWrongRole } from '@/auth/wrongRole';
import { takeReturnTo } from '@/auth/returnTo';
import { guestOnly } from '@/auth/sessionGates';
import { AuthScreen } from '@/components/AuthScreen';
import { ErrorMessage } from '@/components/ErrorMessage';
import { TextField } from '@/components/TextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { authFormStyles } from '@/components/authFormStyles';
import { useFavorites } from '@/favorites/FavoritesProvider';
import { resetTo } from '@/navigation/resetTo';

function LoginScreen() {
  const favorites = useFavorites();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const passwordRef = useRef<TextInputInstance>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // Lazy: a session cleared for a non-client account remounts this screen, and the reason comes with it.
  const [generalError, setGeneralError] = useState<string | null>(takeWrongRole);
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
    // Whatever stopped an earlier account must not be shown to the one trying now.
    forgetWrongRole();
    setSubmitting(true);
    try {
      const user = await login(authClient, { email, password });
      // Another account may have been signed in on this screen: it must not see their favorites.
      favorites.reset();
      // This is the consumer app: a business or admin account has nothing to do past this screen.
      if (user.role !== 'CLIENT') {
        // Remembered for the remount, and set here for the case where there isn't one.
        rememberWrongRole();
        await logout(authClient);
        setGeneralError(WRONG_ROLE_MESSAGE);
        return;
      }
      // Back to the screen that asked for a session, if any (with the same service, for a booking).
      resetTo(takeReturnTo() ?? '/home');
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
      {generalError && <ErrorMessage style={authFormStyles.generalError}>{generalError}</ErrorMessage>}

      <TextField
        label="Correo"
        placeholder="vos@correo.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
        value={email}
        onChangeText={setEmail}
        error={fieldErrors.email}
      />
      <TextField
        label="Contraseña"
        placeholder="Mínimo 8 caracteres"
        secureTextEntry
        autoComplete="password"
        ref={passwordRef}
        returnKeyType="go"
        onSubmitEditing={() => {
          if (!submitting) void handleSubmit();
        }}
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

export default guestOnly(LoginScreen);
