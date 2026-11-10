import { Image, StyleSheet, Text, View } from 'react-native';
import { color, validateHttpUrl, type components } from '@spot/shared';
import { phoneUrl } from './businessInfo';
import { ContactLink, emailUrl, httpUrl } from './ContactLink';

type Business = components['schemas']['Business'];

interface ContactRow {
  label: string;
  value: string;
  /** null: shown as text only, since no safe link can be built from it. */
  url: string | null;
}

function contactRows({ phone, email, website }: Business): ContactRow[] {
  const rows: ContactRow[] = [];
  if (phone) rows.push({ label: 'Teléfono', value: phone, url: phoneUrl(phone) });
  if (email) rows.push({ label: 'Correo', value: email, url: emailUrl(email) });
  const site = website ? httpUrl(website) : null;
  if (site) rows.push({ label: 'Sitio web', value: site, url: site });
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
        <ContactLink key={row.label} {...row} />
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
});
