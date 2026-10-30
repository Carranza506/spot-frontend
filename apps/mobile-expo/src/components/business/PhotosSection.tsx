import { Image, ScrollView, StyleSheet } from 'react-native';
import { color, listBusinessPhotos, validateHttpUrl } from '@spot/shared';
import { authClient } from '@/api/client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { Section } from './Section';

export function PhotosSection({ businessId, businessName }: { businessId: string; businessName: string }) {
  // The contract caps a business at 20 photos, so the first page of 20 is all of them.
  const [state] = useAsyncData(() => listBusinessPhotos(authClient, businessId, { pageSize: 20 }), [businessId]);

  return (
    <Section
      title="Fotos"
      state={state}
      errorMessage="No se pudieron cargar las fotos."
      emptyMessage="Este negocio todavía no tiene fotos."
      // Checked on the photos that will actually show, so invalid URLs can't leave a blank gallery.
      isEmpty={(page) => !page.data.some((photo) => validateHttpUrl(photo.url) === null)}
    >
      {(page) => (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {page.data
            .filter((photo) => validateHttpUrl(photo.url) === null)
            .map((photo, index) => (
              <Image
                key={photo.id}
                source={{ uri: photo.url }}
                style={styles.photo}
                accessibilityLabel={`Foto ${index + 1} de ${businessName}`}
              />
            ))}
        </ScrollView>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 12,
  },
  photo: {
    width: 220,
    height: 160,
    borderRadius: 14,
    backgroundColor: color.surfaceMuted,
  },
});
