import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { color } from '@spot/shared';
import type { AsyncData } from '@/hooks/useAsyncData';

interface SectionProps<T> {
  title: string;
  state: AsyncData<T>;
  errorMessage: string;
  /** Shown instead of `children` when `isEmpty` says the loaded data has nothing to show. */
  emptyMessage: string;
  isEmpty: (data: T) => boolean;
  children: (data: T) => ReactNode;
}

/** A titled block of the business detail screen that loads on its own, so one failing call can't blank the screen. */
export function Section<T>({ title, state, errorMessage, emptyMessage, isEmpty, children }: SectionProps<T>) {
  return (
    <View style={styles.section}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {state.status === 'loading' ? (
        <ActivityIndicator color={color.accentTeal} style={styles.loading} />
      ) : state.status === 'error' ? (
        <Text style={styles.message}>{errorMessage}</Text>
      ) : isEmpty(state.data) ? (
        <Text style={styles.message}>{emptyMessage}</Text>
      ) : (
        children(state.data)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: color.textPrimary,
  },
  loading: {
    alignSelf: 'flex-start',
  },
  message: {
    fontSize: 14,
    color: color.textSecondary,
  },
});
