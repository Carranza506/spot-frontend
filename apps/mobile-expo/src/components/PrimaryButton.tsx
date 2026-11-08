import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { color } from '@spot/shared';

interface PrimaryButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  /** A shorter button, for a row of actions inside a card. */
  compact?: boolean;
}

export function PrimaryButton({ title, loading, variant = 'primary', compact, disabled, ...props }: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      {...props}
      role="button"
      aria-busy={!!loading}
      aria-disabled={!!isDisabled}
      // The visible title is the name; while loading it is replaced by a spinner, so say what is going on.
      accessibilityLabel={loading ? `${title}, cargando` : undefined}
      style={[styles.button, styles[variant], compact && styles.compact, isDisabled && styles.disabled]}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? color.textPrimary : color.onPanelDark} />
      ) : (
        <Text style={[styles.text, variant === 'secondary' && styles.secondaryText, compact && styles.compactText]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primary: {
    backgroundColor: color.accentTeal,
  },
  secondary: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  danger: {
    backgroundColor: color.dangerSolid,
  },
  compact: {
    minHeight: 44,
    paddingVertical: 0,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginTop: 0,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: color.onPanelDark,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryText: {
    color: color.textPrimary,
  },
  compactText: {
    fontSize: 14,
  },
});
