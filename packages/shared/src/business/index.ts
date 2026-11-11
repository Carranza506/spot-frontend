import type { ApiClient } from '../api/client';
import type { components } from '../api/schema';

type Business = components['schemas']['Business'];
type BusinessCreateRequest = components['schemas']['BusinessCreateRequest'];
type BusinessUpdateRequest = components['schemas']['BusinessUpdateRequest'];
type BusinessContact = components['schemas']['BusinessContact'];
type BusinessContactCreateRequest = components['schemas']['BusinessContactCreateRequest'];
type PaginatedBusinessContacts = components['schemas']['PaginatedBusinessContacts'];
type PaginatedPhotos = components['schemas']['PaginatedPhotos'];
type BusinessLocation = components['schemas']['BusinessLocation'];
type BusinessLocationUpsertRequest = components['schemas']['BusinessLocationUpsertRequest'];
type Category = components['schemas']['Category'];
type ContactType = components['schemas']['ContactType'];
type PaginatedCategories = components['schemas']['PaginatedCategories'];

export { mapBusinessApiError, mapBusinessContactApiError, mapBusinessLocationApiError } from './errors';
export {
  BUSINESS_NAME_MAX_LENGTH,
  BUSINESS_LEGAL_NAME_MAX_LENGTH,
  BUSINESS_PHONE_MAX_LENGTH,
  BUSINESS_LOCATION_CITY_MAX_LENGTH,
  BUSINESS_LOCATION_PROVINCE_MAX_LENGTH,
  BUSINESS_LOCATION_POSTAL_CODE_MAX_LENGTH,
  COSTA_RICA_PROVINCES,
  parseCoordinate,
  validateCoordinate,
  validateHttpUrl,
} from './validators';

/** How each contact type is shown to people, in Spanish. */
export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  PHONE: 'Teléfono',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Correo',
  WEBSITE: 'Sitio web',
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  OTHER: 'Otro',
};

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

/** Any active business by id (public endpoint); throws ApiError 404 if it doesn't exist or is inactive. */
export function getBusiness(client: Pick<ApiClient, 'apiFetch'>, businessId: string): Promise<Business> {
  return client.apiFetch<Business>(`/business/businesses/${encodeURIComponent(businessId)}`);
}

/** A page of a business's photos (public endpoint), ordered by displayOrder. */
export function listBusinessPhotos(
  client: Pick<ApiClient, 'apiFetch'>,
  businessId: string,
  { page = 1, pageSize = 20 }: { page?: number; pageSize?: number } = {},
): Promise<PaginatedPhotos> {
  return client.apiFetch<PaginatedPhotos>(
    `/business/businesses/${encodeURIComponent(businessId)}/photos?page=${page}&pageSize=${pageSize}`,
  );
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

function businessPath(businessId: string): string {
  return `/business/businesses/${encodeURIComponent(businessId)}`;
}

/** A business's location (public endpoint); throws ApiError 404 if it has none yet. */
export function getBusinessLocation(client: Pick<ApiClient, 'apiFetch'>, businessId: string): Promise<BusinessLocation> {
  return client.apiFetch<BusinessLocation>(`${businessPath(businessId)}/location`);
}

/** Creates or replaces the location of a business the authenticated BUSINESS account owns (one per business). */
export function upsertBusinessLocation(
  client: Pick<ApiClient, 'apiFetch'>,
  businessId: string,
  data: BusinessLocationUpsertRequest,
): Promise<BusinessLocation> {
  return client.apiFetch<BusinessLocation>(`${businessPath(businessId)}/location`, {
    method: 'PUT',
    body: data,
  });
}

/** A page of the categories assigned to a business (public endpoint). */
export function listBusinessCategories(
  client: Pick<ApiClient, 'apiFetch'>,
  businessId: string,
  { page = 1, pageSize = 100 }: { page?: number; pageSize?: number } = {},
): Promise<PaginatedCategories> {
  return client.apiFetch<PaginatedCategories>(`${businessPath(businessId)}/categories?page=${page}&pageSize=${pageSize}`);
}

/** Replaces the whole set of a business's categories (at least one); returns the new set. */
export async function replaceBusinessCategories(
  client: Pick<ApiClient, 'apiFetch'>,
  businessId: string,
  categoryIds: string[],
): Promise<Category[]> {
  const result = await client.apiFetch<{ data?: Category[] }>(`${businessPath(businessId)}/categories`, {
    method: 'PUT',
    body: { categoryIds },
  });
  return result.data ?? [];
}
