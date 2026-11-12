import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PHONE_COUNTRIES, color, validatePhone, type CountryCode } from '@spot/shared';

export interface PhoneValue {
  country: CountryCode;
  /** The number without the country code, as typed. */
  national: string;
}

interface PhoneFieldProps {
  label: string;
  value: PhoneValue;
  onChange: (value: PhoneValue) => void;
  /** From the form's submit or the API; shown instead of the field's own check. */
  error?: string;
}

/**
 * A country button (with its code, e.g. "+506") that opens the country list, and the number without
 * the code. The number is checked for the selected country once the field is left, and live from
 * then on; send it with toE164(). Same look as TextField.
 */
export function PhoneField({ label, value, onChange, error }: PhoneFieldProps) {
  const [touched, setTouched] = useState(false);
  const [picking, setPicking] = useState(false);
  const selected = PHONE_COUNTRIES.find((country) => country.code === value.country) ?? PHONE_COUNTRIES[0];
  const shownError = error ?? (touched ? (validatePhone(value.national, value.country) ?? undefined) : undefined);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          onPress={() => setPicking(true)}
          accessibilityRole="button"
          accessibilityLabel={`País: ${selected.name} ${selected.dialCode}. Cambiar`}
          style={[styles.input, styles.country]}
        >
          <Text style={styles.countryText}>
            {selected.code} {selected.dialCode} ▾
          </Text>
        </Pressable>
        <TextInput
          style={[styles.input, styles.number, shownError ? styles.inputError : null]}
          placeholderTextColor={color.placeholder}
          keyboardType="phone-pad"
          autoComplete="tel"
          accessibilityLabel={label}
          value={value.national}
          onChangeText={(national) => onChange({ ...value, national })}
          onBlur={() => setTouched(true)}
        />
      </View>
      {shownError && <Text style={styles.error}>{shownError}</Text>}

      <Modal visible={picking} transparent animationType="fade" onRequestClose={() => setPicking(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPicking(false)} accessibilityLabel="Cerrar">
          {/* A Pressable without onPress keeps taps on the sheet from closing it. */}
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle} accessibilityRole="header">
              País
            </Text>
            <FlatList
              data={PHONE_COUNTRIES}
              keyExtractor={(country) => country.code}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange({ ...value, country: item.code });
                    setPicking(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: item.code === value.country }}
                  style={[styles.option, item.code === value.country && styles.optionSelected]}
                >
                  <Text style={styles.optionName}>{item.name}</Text>
                  <Text style={styles.optionCode}>{item.dialCode}</Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: color.textSecondary,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: color.textPrimary,
    backgroundColor: color.surface,
  },
  country: {
    justifyContent: 'center',
  },
  countryText: {
    fontSize: 16,
    fontWeight: '600',
    color: color.textPrimary,
  },
  number: {
    flex: 1,
    minWidth: 0,
  },
  inputError: {
    borderColor: color.danger,
  },
  error: {
    marginTop: 6,
    fontSize: 13,
    color: color.danger,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    maxHeight: '70%',
    paddingTop: 20,
    paddingBottom: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: color.background,
  },
  sheetTitle: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    fontSize: 18,
    fontWeight: '700',
    color: color.textPrimary,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  optionSelected: {
    backgroundColor: color.surfaceMuted,
  },
  optionName: {
    fontSize: 16,
    color: color.textPrimary,
  },
  optionCode: {
    fontSize: 16,
    fontWeight: '600',
    color: color.textSecondary,
  },
});
