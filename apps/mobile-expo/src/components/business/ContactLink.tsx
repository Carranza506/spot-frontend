import { Linking, Pressable, StyleSheet, Text } from 'react-native';
import { color, validateEmail, validateHttpUrl, type components } from '@spot/shared';
import { phoneUrl, whatsappUrl } from './businessInfo';
import { font } from '@/theme/fonts';

type BusinessContact = components['schemas']['BusinessContact'];

/** null unless it's a plain address: encoding stops "a@b.cr?bcc=…" from adding headers to the email. */
export function emailUrl(email: string): string | null {
  const address = email.trim();
  return validateEmail(address) === null ? `mailto:${encodeURIComponent(address).replace('%40', '@')}` : null;
}

/** Business-provided data: only real http(s) links are opened, never other schemes. */
export function httpUrl(value: string): string | null {
  const url = value.trim();
  return url && validateHttpUrl(url) === null ? url : null;
}

/** The link a contact opens, or null when no safe one can be built (an "@handle", say): shown as text. */
export function contactUrl({ type, value }: Pick<BusinessContact, 'type' | 'value'>): string | null {
  switch (type) {
    case 'PHONE':
      return phoneUrl(value);
    case 'WHATSAPP':
      return whatsappUrl(value);
    case 'EMAIL':
      return emailUrl(value);
    default:
      return httpUrl(value);
  }
}

/** A "label ... value" row of the business detail; tapping it opens `url`, if there is one. */
export function ContactLink({ label, value, url }: { label: string; value: string; url: string | null }) {
  return (
    <Pressable
      onPress={() => url && Linking.openURL(url).catch(() => undefined)}
      disabled={!url}
      accessibilityRole={url ? 'link' : 'text'}
      accessibilityLabel={`${label}: ${value}`}
      style={styles.row}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, !url && styles.plainValue]} numberOfLines={1}>
        {value}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  label: {
    fontSize: 14,
    fontFamily: font.regular,
    color: color.textSecondary,
  },
  value: {
    flexShrink: 1,
    fontSize: 14,
    fontFamily: font.semibold,
    color: color.accentTeal,
  },
  // Not tappable, so not in the link color.
  plainValue: {
    color: color.textPrimary,
  },
});
