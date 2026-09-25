import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ApiError,
  createBusinessContact,
  deleteBusinessContact,
  listBusinessContacts,
  mapBusinessContactApiError,
  validateRequired,
  type components,
} from '@spot/shared';
import { authClient } from '../../api/client';
import { Button } from '../../components/Button';
import { SelectField } from '../../components/SelectField';
import { TextField } from '../../components/TextField';
import formStyles from '../AuthForm.module.css';
import pageStyles from '../BusinessProfilePage.module.css';
import styles from './ContactsCard.module.css';

type BusinessContact = components['schemas']['BusinessContact'];
type ContactType = components['schemas']['ContactType'];

const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  PHONE: 'Teléfono',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Correo',
  WEBSITE: 'Sitio web',
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  OTHER: 'Otro',
};

// Types offered when adding a contact. EMAIL stays valid in the API (and labelled above, so
// existing EMAIL contacts still render), but Business.email in "Datos del negocio" covers it.
const CREATABLE_CONTACT_TYPES = (Object.keys(CONTACT_TYPE_LABELS) as ContactType[]).filter((t) => t !== 'EMAIL');

// The contract's max pageSize; a business has far fewer contacts, so one page is the whole list.
const CONTACTS_PAGE_SIZE = 100;

const NETWORK_ERROR = 'No se pudo conectar con el servidor. Intentá de nuevo.';

type ListState = { status: 'loading' } | { status: 'ready'; contacts: BusinessContact[] } | { status: 'error' };

interface ContactsCardProps {
  businessId: string;
}

export function ContactsCard({ businessId }: ContactsCardProps) {
  const navigate = useNavigate();
  const [list, setList] = useState<ListState>({ status: 'loading' });
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [type, setType] = useState<ContactType>('PHONE');
  const [value, setValue] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Always re-read after a create/delete: creating a primary contact can change others' isPrimary.
  const fetchContacts = useCallback(() => {
    listBusinessContacts(authClient, businessId, { pageSize: CONTACTS_PAGE_SIZE })
      .then((page) => setList({ status: 'ready', contacts: page.data }))
      .catch(() => setList({ status: 'error' }));
  }, [businessId]);

  useEffect(fetchContacts, [fetchContacts]);

  function retry() {
    setList({ status: 'loading' });
    fetchContacts();
  }

  function openForm() {
    setFormOpen(true);
    setActionError(null);
  }

  function closeForm() {
    setFormOpen(false);
    setType('PHONE');
    setValue('');
    setIsPrimary(false);
    setFieldErrors({});
    setGeneralError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const valueError = validateRequired(value, 'El valor del contacto es requerido.');
    if (valueError) {
      setFieldErrors({ value: valueError });
      setGeneralError(null);
      return;
    }

    setFieldErrors({});
    setGeneralError(null);
    setSubmitting(true);
    try {
      await createBusinessContact(authClient, businessId, { type, value: value.trim(), isPrimary });
      closeForm();
      fetchContacts();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        navigate('/login', { replace: true });
      } else if (error instanceof ApiError) {
        const mapped = mapBusinessContactApiError(error);
        setFieldErrors(mapped.fieldErrors);
        setGeneralError(mapped.generalError ?? null);
      } else {
        setGeneralError(NETWORK_ERROR);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(contact: BusinessContact) {
    if (!window.confirm(`¿Eliminar el contacto ${CONTACT_TYPE_LABELS[contact.type]}: ${contact.value}?`)) return;

    setActionError(null);
    setDeletingId(contact.id);
    try {
      await deleteBusinessContact(authClient, businessId, contact.id);
      fetchContacts();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        navigate('/login', { replace: true });
      } else if (error instanceof ApiError && error.status === 404) {
        // Already gone: the refreshed list reflects that.
        fetchContacts();
      } else {
        setActionError(error instanceof ApiError ? error.message : NETWORK_ERROR);
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <article className={pageStyles.card}>
      <h2 className={pageStyles.cardTitle}>Contactos</h2>

      {list.status === 'loading' && <p className={pageStyles.placeholder}>Cargando…</p>}
      {list.status === 'error' && (
        <div className={styles.stack}>
          <p className={formStyles.generalError}>No se pudieron cargar los contactos.</p>
          <Button type="button" onClick={retry}>
            Reintentar
          </Button>
        </div>
      )}
      {list.status === 'ready' && (
        <div className={styles.stack}>
          {actionError && <p className={formStyles.generalError}>{actionError}</p>}
          {list.contacts.length === 0 ? (
            <p className={pageStyles.placeholder}>Sin contactos todavía.</p>
          ) : (
            <ul className={styles.list}>
              {list.contacts.map((contact) => (
                <li key={contact.id} className={styles.row}>
                  <div className={styles.info}>
                    <span className={styles.type}>
                      {CONTACT_TYPE_LABELS[contact.type]}
                      {contact.isPrimary && <span className={styles.badge}>Principal</span>}
                    </span>
                    <span className={styles.value}>{contact.value}</span>
                  </div>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => handleDelete(contact)}
                    disabled={deletingId !== null}
                  >
                    {deletingId === contact.id ? 'Eliminando…' : 'Eliminar'}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {formOpen ? (
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              {generalError && <p className={formStyles.generalError}>{generalError}</p>}
              <SelectField
                id="contactType"
                label="Tipo"
                value={type}
                onChange={(e) => setType(e.target.value as ContactType)}
                error={fieldErrors.type}
              >
                {CREATABLE_CONTACT_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {CONTACT_TYPE_LABELS[option]}
                  </option>
                ))}
              </SelectField>
              <TextField
                id="contactValue"
                label="Valor"
                placeholder="+506 8888-3344"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                error={fieldErrors.value}
              />
              <label className={styles.checkbox}>
                <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
                Contacto principal
              </label>
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelButton} onClick={closeForm} disabled={submitting}>
                  Cancelar
                </button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Guardando…' : 'Guardar contacto'}
                </Button>
              </div>
            </form>
          ) : (
            <Button type="button" fullWidth onClick={openForm}>
              Agregar contacto
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
