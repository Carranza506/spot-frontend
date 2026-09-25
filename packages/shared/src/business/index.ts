import type { ApiClient } from '../api/client';
import type { components } from '../api/schema';

type Business = components['schemas']['Business'];
type BusinessCreateRequest = components['schemas']['BusinessCreateRequest'];
type BusinessUpdateRequest = components['schemas']['BusinessUpdateRequest'];
type BusinessContact = components['schemas']['BusinessContact'];
type BusinessContactCreateRequest = components['schemas']['BusinessContactCreateRequest'];
type PaginatedBusinessContacts = components['schemas']['PaginatedBusinessContacts'];

export { mapBusinessApiError, mapBusinessContactApiError } from './errors';
export {
  BUSINESS_NAME_MAX_LENGTH,
  BUSINESS_LEGAL_NAME_MAX_LENGTH,
  BUSINESS_PHONE_MAX_LENGTH,
  validateHttpUrl,
} from './validators';

/** Creates the business profile for the authenticated BUSINESS account (1:1, 409 if it already has one). */
export function createBusiness(client: Pick<ApiClient, 'apiFetch'>, data: BusinessCreateRequest): Promise<Business> {
  return client.apiFetch<Business>('/business/businesses', {
    method: 'POST',
    body: data,
  });
}

/** The authenticated BUSINESS account's own business; throws ApiError 404 if it has none yet. */
export function getMyBusiness(client: Pick<ApiClient, 'apiFetch'>): Promise<Business> {
  return client.apiFetch<Business>('/business/businesses/me');
}

/** Updates the authenticated BUSINESS account's own business: omitted fields stay as they are, `null` clears one. */
export function updateOwnBusiness(client: Pick<ApiClient, 'apiFetch'>, data: BusinessUpdateRequest): Promise<Business> {
  return client.apiFetch<Business>('/business/businesses/me', {
    method: 'PATCH',
    body: data,
  });
}

function contactsPath(businessId: string): string {
  return `/business/businesses/${encodeURIComponent(businessId)}/contacts`;
}

/** A page of a business's contacts (public endpoint); `pageSize` is 1-100 per the contract's PageSizeParam. */
export function listBusinessContacts(
  client: Pick<ApiClient, 'apiFetch'>,
  businessId: string,
  { page = 1, pageSize = 20 }: { page?: number; pageSize?: number } = {},
): Promise<PaginatedBusinessContacts> {
  return client.apiFetch<PaginatedBusinessContacts>(`${contactsPath(businessId)}?page=${page}&pageSize=${pageSize}`);
}

/** Adds a contact to a business the authenticated BUSINESS account owns. */
export function createBusinessContact(
  client: Pick<ApiClient, 'apiFetch'>,
  businessId: string,
  data: BusinessContactCreateRequest,
): Promise<BusinessContact> {
  return client.apiFetch<BusinessContact>(contactsPath(businessId), {
    method: 'POST',
    body: data,
  });
}

/** Removes a contact from a business the authenticated BUSINESS account owns (204). */
export function deleteBusinessContact(
  client: Pick<ApiClient, 'apiFetch'>,
  businessId: string,
  contactId: string,
): Promise<void> {
  return client.apiFetch<void>(`${contactsPath(businessId)}/${encodeURIComponent(contactId)}`, {
    method: 'DELETE',
  });
}
