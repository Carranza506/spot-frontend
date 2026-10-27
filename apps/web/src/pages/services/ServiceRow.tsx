import { useState } from 'react';
import type { components } from '@spot/shared';
import { formatPrice } from '../bookings/format';
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
  const photosHintId = `service-photos-hint-${service.id}`;

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
          {!service.isActive && (
            <span id={photosHintId} className={styles.meta}>
              Reactivá el servicio para ver y gestionar sus fotos.
            </span>
          )}
        </div>

        <div className={styles.actions}>
          {pending ? (
            <span className={styles.pendingText}>Guardando…</span>
          ) : (
            <>
              {/* The API lists photos only for active services (owner included), so an inactive one can't open its gallery. */}
              {/* aria-disabled, not disabled: it stays in the tab order, and the visible hint above says why. */}
              <button
                type="button"
                className={styles.textButton}
                onClick={() => {
                  if (service.isActive) setPhotosOpen((open) => !open);
                }}
                aria-disabled={!service.isActive}
                aria-expanded={service.isActive && photosOpen}
                aria-describedby={service.isActive ? undefined : photosHintId}
              >
                {photosOpen && service.isActive ? 'Ocultar fotos' : 'Fotos'}
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

      {photosOpen && service.isActive && <ServicePhotos serviceId={service.id} />}
    </li>
  );
}
