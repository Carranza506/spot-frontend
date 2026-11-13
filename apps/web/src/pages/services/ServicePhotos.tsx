import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, SERVICE_PHOTO_TYPES, validateServicePhoto, type components } from '@spot/shared';
import { useFeedback } from '../../components/feedback/feedbackContext';
import formStyles from '../AuthForm.module.css';
import { servicesApi } from './servicesApi';
import styles from './Services.module.css';

type Photo = components['schemas']['Photo'];

const NETWORK_ERROR = 'No se pudo conectar con el servidor. Intentá de nuevo.';

type ListState = { status: 'loading' } | { status: 'ready'; photos: Photo[] } | { status: 'error' };

/** Where a PhotoGallery reads and writes its photos: a service's or the business's own. */
export interface PhotoGalleryApi {
  list(): Promise<Photo[]>;
  upload(file: File, displayOrder: number): Promise<Photo>;
  remove(photoId: string): Promise<void>;
}

/** A service's photo gallery. */
export function ServicePhotos({ serviceId }: { serviceId: string }) {
  const api = useMemo<PhotoGalleryApi>(
    () => ({
      list: () => servicesApi.listPhotos(serviceId),
      upload: (file, displayOrder) => servicesApi.uploadPhoto(serviceId, file, displayOrder),
      remove: (photoId) => servicesApi.deletePhoto(serviceId, photoId),
    }),
    [serviceId],
  );
  return <PhotoGallery api={api} alt="Foto del servicio" emptyHint="Este servicio todavía no tiene fotos." />;
}

/** Lists, uploads (one file at a time) and deletes photos. `api` must be stable (memoized). */
export function PhotoGallery({ api, alt, emptyHint }: { api: PhotoGalleryApi; alt: string; emptyHint: string }) {
  const navigate = useNavigate();
  const { confirm, showToast } = useFeedback();
  const inputRef = useRef<HTMLInputElement>(null);
  const [list, setList] = useState<ListState>({ status: 'loading' });
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchPhotos = useCallback(() => {
    api
      .list()
      .then((photos) =>
        setList({ status: 'ready', photos: [...photos].sort((a, b) => a.displayOrder - b.displayOrder) }),
      )
      .catch(() => setList({ status: 'error' }));
  }, [api]);

  useEffect(fetchPhotos, [fetchPhotos]);

  function handleError(error: unknown) {
    if (error instanceof ApiError && error.status === 401) navigate('/login', { replace: true });
    else setActionError(error instanceof ApiError ? error.message : NETWORK_ERROR);
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so picking the same file again still fires onChange.
    event.target.value = '';
    if (!file || list.status !== 'ready') return;

    const fileError = validateServicePhoto(file);
    if (fileError) {
      setActionError(fileError);
      return;
    }

    setActionError(null);
    setUploading(true);
    try {
      const nextOrder = list.photos.reduce((max, p) => Math.max(max, p.displayOrder + 1), 0);
      const photo = await api.upload(file, nextOrder);
      setList((current) => (current.status === 'ready' ? { ...current, photos: [...current.photos, photo] } : current));
      showToast('Foto agregada.');
    } catch (error) {
      handleError(error);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(photo: Photo) {
    if (!(await confirm({ title: 'Eliminar foto', message: '¿Eliminar esta foto?', confirmLabel: 'Eliminar', danger: true }))) return;
    setActionError(null);
    setDeletingId(photo.id);
    try {
      await api.remove(photo.id);
      setList((current) =>
        current.status === 'ready' ? { ...current, photos: current.photos.filter((p) => p.id !== photo.id) } : current,
      );
      showToast('Foto eliminada.');
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) fetchPhotos();
      else handleError(error);
    } finally {
      setDeletingId(null);
    }
  }

  if (list.status === 'loading') return <p className={styles.photosMessage}>Cargando fotos…</p>;
  if (list.status === 'error') {
    return (
      <div className={styles.photosMessage}>
        <p className={formStyles.generalError}>No se pudieron cargar las fotos.</p>
        <button
          type="button"
          className={styles.textButton}
          onClick={() => {
            setList({ status: 'loading' });
            fetchPhotos();
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  const busy = uploading || deletingId !== null;

  return (
    <div className={styles.photos}>
      {actionError && <p className={formStyles.generalError}>{actionError}</p>}
      <ul className={styles.photoGrid}>
        {list.photos.map((photo) => (
          <li key={photo.id} className={styles.photoItem}>
            <img src={photo.url} alt={alt} className={styles.photo} />
            <button
              type="button"
              className={styles.photoDelete}
              onClick={() => handleDelete(photo)}
              disabled={busy}
              aria-label="Eliminar foto"
            >
              {deletingId === photo.id ? '…' : '×'}
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            className={styles.photoAdd}
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {uploading ? 'Subiendo…' : '+ Agregar foto'}
          </button>
        </li>
      </ul>
      {list.photos.length === 0 && !uploading && (
        <p className={styles.photosHint}>{emptyHint} JPG, PNG o WebP de hasta 5 MB.</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={SERVICE_PHOTO_TYPES.join(',')}
        className={styles.hiddenInput}
        onChange={handleFile}
        tabIndex={-1}
      />
    </div>
  );
}
