import { useMemo } from 'react';
import { deleteBusinessPhoto, listBusinessPhotos, uploadBusinessPhoto } from '@spot/shared';
import { authClient } from '../../api/client';
import pageStyles from '../BusinessProfilePage.module.css';
import { PhotoGallery, type PhotoGalleryApi } from '../services/ServicePhotos';

// The contract's max pageSize; a business has at most 20 photos, so one page is all of them.
const PHOTOS_PAGE_SIZE = 100;

/** The business's own photos (W4), with the same gallery as each service's. */
export function BusinessPhotosCard({ businessId }: { businessId: string }) {
  const api = useMemo<PhotoGalleryApi>(
    () => ({
      list: () => listBusinessPhotos(authClient, businessId, { pageSize: PHOTOS_PAGE_SIZE }).then((page) => page.data),
      upload: (file, displayOrder) => uploadBusinessPhoto(authClient, businessId, file, displayOrder),
      remove: (photoId) => deleteBusinessPhoto(authClient, businessId, photoId),
    }),
    [businessId],
  );

  return (
    <article className={pageStyles.card}>
      <h2 className={pageStyles.cardTitle}>Fotos del negocio</h2>
      <PhotoGallery api={api} alt="Foto del negocio" emptyHint="Tu negocio todavía no tiene fotos." />
    </article>
  );
}
