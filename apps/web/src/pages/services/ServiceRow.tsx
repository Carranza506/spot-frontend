import { useState } from 'react';
import { formatPrice, type components } from '@spot/shared';
import { ServiceForm, type ServiceFormValues } from './ServiceForm';
import { ServicePhotos } from './ServicePhotos';
import styles from './Services.module.css';

type Service = components['schemas']['Service'];

interface ServiceRowProps {
  service: Service;
  /** True while any activate/deactivate is in flight, so two can't race each other. */
  busy: boolean;
  /** True while this row's own activate/deactivate is in flight. */
  pending: boolean;
  onUpdate: (service: Service, values: ServiceFormValues) => Promise<void>;
  onToggleActive: (service: Service) => void;
}

export function ServiceRow({ service, busy, pending, onUpdate, onToggleActive }: ServiceRowProps) {
  const [editing, setEditing] = useState(false);
  const [photosOpen, setPhotosOpen] = useState(false);

  if (editing) {
    return (
      <li className={styles.row}>
        <ServiceForm
          service={service}
          submitLabel="Guardar cambios"
          onCancel={() => setEditing(false)}
          onSubmit={async (values) => {
            await onUpdate(service, values);
            setEditing(false);
          }}
        />
      </li>
    );
  }

  return (
    <li className={styles.row}>
      <div className={styles.summary}>
        <div className={styles.info}>
          <span className={styles.name}>
            {service.name}
            <span className={`${styles.badge} ${service.isActive ? styles.badgeActive : styles.badgeInactive}`}>
              {service.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </span>
          <span className={styles.meta}>
            {service.durationMinutes} min · {formatPrice(service.price)}
          </span>
          {service.description && <span className={styles.description}>{service.description}</span>}
        </div>

        <div className={styles.actions}>
          {pending ? (
            <span className={styles.pendingText}>Guardando…</span>
          ) : (
            <>
              <button type="button" className={styles.textButton} onClick={() => setPhotosOpen((open) => !open)}>
                {photosOpen ? 'Ocultar fotos' : 'Fotos'}
              </button>
              <button type="button" className={styles.textButton} onClick={() => setEditing(true)} disabled={busy}>
                Editar
              </button>
              <button
                type="button"
                className={service.isActive ? styles.dangerButton : styles.textButton}
                onClick={() => onToggleActive(service)}
                disabled={busy}
              >
                {service.isActive ? 'Desactivar' : 'Reactivar'}
              </button>
            </>
          )}
        </div>
      </div>

      {photosOpen && <ServicePhotos serviceId={service.id} />}
    </li>
  );
}
