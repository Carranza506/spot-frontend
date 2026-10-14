import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, SERVICE_PHOTO_TYPES, validateServicePhoto, type components } from '@spot/shared';
import formStyles from '../AuthForm.module.css';
import { servicesApi } from './servicesApi';
import styles from './Services.module.css';

type Photo = components['schemas']['Photo'];

const NETWORK_ERROR = 'No se pudo conectar con el servidor. Intentá de nuevo.';

type ListState = { status: 'loading' } | { status: 'ready'; photos: Photo[] } | { status: 'error' };

/** A service's photo gallery: lists, uploads (one file at a time) and deletes photos. */
export function ServicePhotos({ serviceId }: { serviceId: string }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [list, setList] = useState<ListState>({ status: 'loading' });
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchPhotos = useCallback(() => {
    servicesApi
      .listPhotos(serviceId)
      .then((photos) =>
        setList({ status: 'ready', photos: [...photos].sort((a, b) => a.displayOrder - b.displayOrder) }),
      )
      .catch(() => setList({ status: 'error' }));
  }, [serviceId]);

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
      const photo = await servicesApi.uploadPhoto(serviceId, file, nextOrder);
      setList((current) => (current.status === 'ready' ? { ...current, photos: [...current.photos, photo] } : current));
    } catch (error) {
      handleError(error);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(photo: Photo) {
    if (!window.confirm('¿Eliminar esta foto?')) return;
    setActionError(null);
    setDeletingId(photo.id);
    try {
      await servicesApi.deletePhoto(serviceId, photo.id);
      setList((current) =>
        current.status === 'ready' ? { ...current, photos: current.photos.filter((p) => p.id !== photo.id) } : current,
      );
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
        <span>No se pudieron cargar las fotos.</span>
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
            <img src={photo.url} alt="Foto del servicio" className={styles.photo} />
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
        <p className={styles.photosHint}>Este servicio todavía no tiene fotos. JPG, PNG o WebP de hasta 5 MB.</p>
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
