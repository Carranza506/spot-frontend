import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { color } from '@spot/shared';

interface PrimaryButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  loading?: boolean;
}

export function PrimaryButton({ title, loading, disabled, ...props }: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      {...props}
      role="button"
      aria-busy={!!loading}
      aria-disabled={!!isDisabled}
      // The visible title is the name; while loading it is replaced by a spinner, so say what is going on.
      accessibilityLabel={loading ? `${title}, cargando` : undefined}
      style={[styles.button, isDisabled && styles.disabled]}
      disabled={isDisabled}
    >
      {loading ? <ActivityIndicator color={color.onPanelDark} /> : <Text style={styles.text}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: color.accentTeal,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: color.onPanelDark,
    fontSize: 16,
    fontWeight: '700',
  },
});
