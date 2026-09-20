import { useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError, color, login, mapAuthApiError, validateEmail, validatePassword, type components } from '@spot/shared';
import { authClient } from '@/api/client';

type User = components['schemas']['User'];

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);

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
      const loggedInUser = await login(authClient, { email, password });
      setUser(loggedInUser);
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

  if (user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.title}>Bienvenida/o</Text>
          <Text style={styles.welcomeName}>
            {user.firstName} {user.lastName}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Iniciar sesión</Text>

        {generalError && <Text style={styles.generalError}>{generalError}</Text>}

        <View style={styles.field}>
          <Text style={styles.label}>Correo</Text>
          <TextInput
            style={styles.input}
            placeholder="negocio@correo.com"
            placeholderTextColor={color.placeholder}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          {fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="Mínimo 8 caracteres"
            placeholderTextColor={color.placeholder}
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
          />
          {fieldErrors.password && <Text style={styles.fieldError}>{fieldErrors.password}</Text>}
        </View>

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color={color.onPanelDark} /> : <Text style={styles.buttonText}>Entrar</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: color.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: color.textPrimary,
    marginBottom: 8,
  },
  welcomeName: {
    fontSize: 18,
    color: color.textSecondary,
  },
  field: {
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: color.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: color.textPrimary,
    backgroundColor: color.surface,
  },
  fieldError: {
    fontSize: 13,
    color: color.danger,
  },
  generalError: {
    fontSize: 14,
    color: color.danger,
    marginBottom: 8,
  },
  button: {
    backgroundColor: color.accentTeal,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: color.onPanelDark,
    fontSize: 16,
    fontWeight: '700',
  },
});
