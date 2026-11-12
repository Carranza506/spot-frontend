import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ApiError,
  CONTACT_TYPE_LABELS,
  createBusinessContact,
  deleteBusinessContact,
  formatPhone,
  listBusinessContacts,
  mapBusinessContactApiError,
  splitPhone,
  toE164,
  updateBusinessContact,
  validatePhone,
  validateRequired,
  type components,
} from '@spot/shared';
import { authClient } from '../../api/client';
import { ActionButtons } from '../../components/ActionButtons';
import { Button } from '../../components/Button';
import { PhoneField } from '../../components/PhoneField';
import { SelectField } from '../../components/SelectField';
import { TextField } from '../../components/TextField';
import { useFeedback } from '../../components/feedback/feedbackContext';
import formStyles from '../AuthForm.module.css';
import pageStyles from '../BusinessProfilePage.module.css';
import styles from './ContactsCard.module.css';

type BusinessContact = components['schemas']['BusinessContact'];
type ContactType = components['schemas']['ContactType'];

// Types offered when adding a contact. EMAIL stays valid in the API (and labelled above, so
// existing EMAIL contacts still render), but Business.email in "Datos del negocio" covers it.
const CREATABLE_CONTACT_TYPES = (Object.keys(CONTACT_TYPE_LABELS) as ContactType[]).filter((t) => t !== 'EMAIL');

// The contract's max pageSize; a business has far fewer contacts, so one page is the whole list.
const CONTACTS_PAGE_SIZE = 100;

const NETWORK_ERROR = 'No se pudo conectar con el servidor. Intentá de nuevo.';

const isPhoneType = (type: ContactType) => type === 'PHONE' || type === 'WHATSAPP';

type ListState = { status: 'loading' } | { status: 'ready'; contacts: BusinessContact[] } | { status: 'error' };

interface ContactsCardProps {
  businessId: string;
}

export function ContactsCard({ businessId }: ContactsCardProps) {
  const navigate = useNavigate();
  const { confirm, showToast } = useFeedback();
  const [list, setList] = useState<ListState>({ status: 'loading' });
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  // The contact being edited, or null when the form adds a new one.
  const [editing, setEditing] = useState<BusinessContact | null>(null);
  const [type, setType] = useState<ContactType>('PHONE');
  const [value, setValue] = useState('');
  const [phone, setPhone] = useState(() => splitPhone(null));
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

  function openForm(contact: BusinessContact | null = null) {
    closeForm();
    setFormOpen(true);
    setActionError(null);
    if (contact) {
      setEditing(contact);
      setType(contact.type);
      setValue(contact.value);
      // A phone is edited in the country picker (#90): its stored E.164 split back into country and number.
      setPhone(splitPhone(isPhoneType(contact.type) ? contact.value : null));
      setIsPrimary(contact.isPrimary);
    }
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setType('PHONE');
    setValue('');
    setPhone(splitPhone(null));
    setIsPrimary(false);
    setFieldErrors({});
    setGeneralError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const phoneType = isPhoneType(type);
    const raw = phoneType ? phone.national : value;
    const valueError =
      validateRequired(raw, 'El valor del contacto es requerido.') ??
      (phoneType ? validatePhone(phone.national, phone.country) : null);
    if (valueError) {
      setFieldErrors({ value: valueError });
      setGeneralError(null);
      return;
    }
    const contactValue = phoneType ? toE164(phone.national, phone.country)! : value.trim();

    setFieldErrors({});
    setGeneralError(null);
    setSubmitting(true);
    try {
      const data = { type, value: contactValue, isPrimary };
      if (editing) await updateBusinessContact(authClient, businessId, editing.id, data);
      else await createBusinessContact(authClient, businessId, data);
      closeForm();
      fetchContacts();
      showToast(editing ? 'Contacto actualizado.' : 'Contacto agregado.');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        navigate('/login', { replace: true });
      } else if (editing && error instanceof ApiError && error.status === 404) {
        // Deleted meanwhile (e.g. from another tab): the refreshed list reflects that.
        closeForm();
        fetchContacts();
        setActionError(error.message);
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
    const confirmed = await confirm({
      title: 'Eliminar contacto',
      message: `¿Eliminar el contacto ${CONTACT_TYPE_LABELS[contact.type]}: ${isPhoneType(contact.type) ? formatPhone(contact.value) : contact.value}?`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!confirmed) return;

    setActionError(null);
    setDeletingId(contact.id);
    try {
      await deleteBusinessContact(authClient, businessId, contact.id);
      fetchContacts();
      showToast('Contacto eliminado.');
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
                    <span className={styles.value}>
                      {isPhoneType(contact.type) ? formatPhone(contact.value) : contact.value}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.editButton}
                    onClick={() => openForm(contact)}
                    disabled={deletingId !== null || submitting}
                    aria-label={`Editar contacto ${CONTACT_TYPE_LABELS[contact.type]}: ${contact.value}`}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => handleDelete(contact)}
                    disabled={deletingId !== null || submitting}
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
                {/* An existing EMAIL contact keeps EMAIL as an option, so editing it doesn't change its type. */}
                {(editing?.type === 'EMAIL' ? [...CREATABLE_CONTACT_TYPES, 'EMAIL' as const] : CREATABLE_CONTACT_TYPES).map((option) => (
                  <option key={option} value={option}>
                    {CONTACT_TYPE_LABELS[option]}
                  </option>
                ))}
              </SelectField>
              {isPhoneType(type) ? (
                <PhoneField id="contactValue" label="Número" value={phone} onChange={setPhone} error={fieldErrors.value} />
              ) : (
                <TextField
                  id="contactValue"
                  label="Valor"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  error={fieldErrors.value}
                />
              )}
              <label className={styles.checkbox}>
                <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
                Contacto principal
              </label>
              <ActionButtons stacked>
                <Button type="button" variant="secondary" onClick={closeForm} disabled={submitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar contacto'}
                </Button>
              </ActionButtons>
            </form>
          ) : (
            <Button type="button" onClick={() => openForm()}>
              Agregar contacto
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
