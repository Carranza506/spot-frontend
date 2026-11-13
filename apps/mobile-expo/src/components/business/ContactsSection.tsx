import { CONTACT_TYPE_LABELS, formatPhone, listBusinessContacts } from '@spot/shared';
import { authClient } from '@/api/client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { ContactLink, contactUrl } from './ContactLink';
import { Section } from './Section';

// The contract's max pageSize; a business has far fewer contacts, so one page is the whole list.
const CONTACTS_PAGE_SIZE = 100;

export function ContactsSection({ businessId }: { businessId: string }) {
  const [state] = useAsyncData(
    () => listBusinessContacts(authClient, businessId, { pageSize: CONTACTS_PAGE_SIZE }),
    [businessId],
  );

  return (
    <Section
      title="Contacto"
      state={state}
      errorMessage="No se pudieron cargar los contactos."
      emptyMessage="Este negocio todavía no agregó otros contactos."
      isEmpty={(page) => page.data.length === 0}
    >
      {(page) =>
        // The primary contact first; sort is stable, so the rest keep the API's order.
        [...page.data]
          .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
          .map((contact) => (
            <ContactLink
              key={contact.id}
              label={CONTACT_TYPE_LABELS[contact.type]}
              value={contact.type === 'PHONE' || contact.type === 'WHATSAPP' ? formatPhone(contact.value) : contact.value}
              url={contactUrl(contact)}
            />
          ))
      }
    </Section>
  );
}
