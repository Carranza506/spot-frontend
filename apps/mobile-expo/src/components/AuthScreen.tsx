import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@spot/shared';
import { Logo } from './Logo';

// Sampled from the mockup; not part of the shared token set.
const TAGLINE_COLOR = '#bcc2c1';

interface AuthScreenProps {
  children: ReactNode;
}

/** Dark background + logo + tagline + white rounded card, shared by login and register. */
export function AuthScreen({ children }: AuthScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Logo />
          <Text style={styles.tagline}>Reservá servicios de belleza y cuidado personal.</Text>
          <View style={styles.card}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: color.panelDark,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },
  tagline: {
    marginTop: 16,
    fontSize: 16,
    lineHeight: 22,
    color: TAGLINE_COLOR,
  },
  card: {
    marginTop: 32,
    backgroundColor: color.surface,
    borderRadius: 28,
    padding: 28,
  },
});
