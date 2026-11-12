import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ApiError,
  color,
  getOwnProfile,
  mapAuthApiError,
  splitPhone,
  toE164,
  updateOwnProfile,
  validatePhone,
  validateRequired,
  type components,
} from '@spot/shared';
import { authClient } from '@/api/client';
import { ErrorMessage } from '@/components/ErrorMessage';
import { PhoneField, type PhoneValue } from '@/components/PhoneField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { resetTo } from '@/navigation/resetTo';

type User = components['schemas']['User'];

const NETWORK_ERROR = 'No se pudo conectar con el servidor. Intentá de nuevo.';

type Form = { firstName: string; lastName: string; phone: PhoneValue };

const toForm = (user: User): Form => ({
  firstName: user.firstName ?? '',
  lastName: user.lastName ?? '',
  phone: splitPhone(user.phone),
});

/** Perfil (M7): the account's name and phone. */
export default function ProfileScreen() {
  const [user, setUser] = useState<User | 'loading' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    getOwnProfile(authClient)
      .then((profile) => !ignore && setUser(profile))
      .catch((error: unknown) => {
        if (ignore) return;
        if (error instanceof ApiError && error.status === 401) resetTo('/');
        else setUser('error');
      });
    return () => {
      ignore = true;
    };
  }, [attempt]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
          hitSlop={8}
          accessibilityRole="button"
        >
          <Text style={styles.back}>‹ Volver</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          Perfil
        </Text>

        {user === 'loading' ? (
          <ActivityIndicator style={styles.center} color={color.accentTeal} />
        ) : user === 'error' ? (
          <View style={styles.center}>
            <ErrorMessage>No se pudieron cargar tus datos.</ErrorMessage>
            <PrimaryButton
              title="Reintentar"
              onPress={() => {
                setUser('loading');
                setAttempt((n) => n + 1);
              }}
            />
          </View>
        ) : (
          <ProfileForm user={user} onSaved={setUser} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileForm({ user, onSaved }: { user: User; onSaved: (user: User) => void }) {
  const showToast = useToast();
  const [form, setForm] = useState<Form>(() => toForm(user));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const errors: Record<string, string> = {};
    // A CLIENT can't clear its name (400), so both are required here.
    const firstNameError = validateRequired(form.firstName, 'El nombre es requerido.');
    const lastNameError = validateRequired(form.lastName, 'El apellido es requerido.');
    const phoneError = validatePhone(form.phone.national, form.phone.country);
    if (firstNameError) errors.firstName = firstNameError;
    if (lastNameError) errors.lastName = lastNameError;
    if (phoneError) errors.phone = phoneError;
    setFieldErrors(errors);
    setGeneralError(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const updated = await updateOwnProfile(authClient, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        // null clears it.
        phone: toE164(form.phone.national, form.phone.country),
      });
      onSaved(updated);
      setForm(toForm(updated));
      showToast('Perfil actualizado.');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        resetTo('/');
        return;
      }
      if (error instanceof ApiError) {
        const mapped = mapAuthApiError(error);
        setFieldErrors(mapped.fieldErrors);
        setGeneralError(mapped.generalError ?? null);
      } else {
        setGeneralError(NETWORK_ERROR);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Tus datos</Text>
      {generalError && <ErrorMessage style={styles.generalError}>{generalError}</ErrorMessage>}
      <TextField label="Correo" value={user.email} editable={false} style={styles.readOnly} />
      <TextField
        label="Nombre"
        autoComplete="given-name"
        value={form.firstName}
        onChangeText={(firstName) => setForm({ ...form, firstName })}
        error={fieldErrors.firstName}
      />
      <TextField
        label="Apellidos"
        autoComplete="family-name"
        value={form.lastName}
        onChangeText={(lastName) => setForm({ ...form, lastName })}
        error={fieldErrors.lastName}
      />
      <PhoneField
        label="Teléfono (opcional)"
        value={form.phone}
        onChange={(phone) => setForm({ ...form, phone })}
        error={fieldErrors.phone}
      />
      <PrimaryButton title="Guardar cambios" onPress={handleSubmit} loading={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: color.background,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  back: {
    fontSize: 16,
    fontWeight: '600',
    color: color.accentTeal,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: color.textPrimary,
  },
  center: {
    marginTop: 32,
    gap: 12,
    alignItems: 'center',
  },
  card: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: color.textPrimary,
    marginBottom: 16,
  },
  generalError: {
    marginBottom: 12,
  },
  readOnly: {
    color: color.textSecondary,
    backgroundColor: color.surfaceMuted,
  },
});
