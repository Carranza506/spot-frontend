import { StyleSheet, Text, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import type { Ref } from 'react';
import { color } from '@spot/shared';
import { font } from '@/theme/fonts';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  // React 19 passes ref as a prop: lets a form move the focus to the next field.
  ref?: Ref<TextInputInstance>;
}

export function TextField({ label, error, style, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={[styles.input, style]} placeholderTextColor={color.placeholder} {...inputProps} />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontFamily: font.semibold,
    color: color.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: font.regular,
    color: color.textPrimary,
    backgroundColor: color.surface,
  },
  error: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: font.regular,
    color: color.danger,
  },
});
