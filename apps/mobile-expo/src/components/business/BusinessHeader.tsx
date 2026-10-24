import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, validateHttpUrl, type components } from '@spot/shared';

type Business = components['schemas']['Business'];

interface ContactRow {
  label: string;
  value: string;
  url: string;
}

function contactRows({ phone, email, website }: Business): ContactRow[] {
  const rows: ContactRow[] = [];
  if (phone) rows.push({ label: 'Teléfono', value: phone, url: `tel:${phone.replace(/[^\d+]/g, '')}` });
  if (email) rows.push({ label: 'Correo', value: email, url: `mailto:${email}` });
  // Business-provided data: only open real http(s) links, never other schemes.
  if (website && validateHttpUrl(website) === null) rows.push({ label: 'Sitio web', value: website, url: website });
  return rows;
}

export function BusinessHeader({ business }: { business: Business }) {
  return (
    <View style={styles.container}>
      {business.logoUrl && validateHttpUrl(business.logoUrl) === null ? (
        <Image
          source={{ uri: business.logoUrl }}
          style={styles.logo}
          accessibilityLabel={`Logo de ${business.name}`}
        />
      ) : null}
      <Text style={styles.name} accessibilityRole="header">
        {business.name}
      </Text>
      {business.description ? <Text style={styles.description}>{business.description}</Text> : null}

      {contactRows(business).map((row) => (
        <Pressable
          key={row.label}
          onPress={() => Linking.openURL(row.url).catch(() => undefined)}
          accessibilityRole="link"
          accessibilityLabel={`${row.label}: ${row.value}`}
          style={styles.contactRow}
        >
          <Text style={styles.contactLabel}>{row.label}</Text>
          <Text style={styles.contactValue} numberOfLines={1}>
            {row.value}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 20,
    backgroundColor: color.surfaceMuted,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: color.textPrimary,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    color: color.textSecondary,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  contactLabel: {
    fontSize: 14,
    color: color.textSecondary,
  },
  contactValue: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    color: color.accentTeal,
  },
});
