import type { ApiClient } from '../api/client';
import type { components } from '../api/schema';

type Service = components['schemas']['Service'];
type ServiceCreateRequest = components['schemas']['ServiceCreateRequest'];
type ServiceUpdateRequest = components['schemas']['ServiceUpdateRequest'];
type PaginatedServices = components['schemas']['PaginatedServices'];
type Photo = components['schemas']['Photo'];
type PaginatedPhotos = components['schemas']['PaginatedPhotos'];

export { mapServiceApiError } from './errors';
export {
  SERVICE_NAME_MAX_LENGTH,
  SERVICE_PHOTO_MAX_BYTES,
  SERVICE_PHOTO_TYPES,
  validateServiceDuration,
  validateServicePhoto,
  validateServicePrice,
} from './validators';

export interface BusinessServicesFilter {
  page?: number;
  pageSize?: number;
  /** Omitted lists active and inactive services alike. */
  isActive?: boolean;
}

function servicePath(serviceId: string): string {
  return `/business/services/${encodeURIComponent(serviceId)}`;
}

/** A page of a business's services (public endpoint). */
export function listBusinessServices(
  client: Pick<ApiClient, 'apiFetch'>,
  businessId: string,
  { page = 1, pageSize = 20, isActive }: BusinessServicesFilter = {},
): Promise<PaginatedServices> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (isActive !== undefined) query.set('isActive', String(isActive));
  return client.apiFetch<PaginatedServices>(`/business/businesses/${encodeURIComponent(businessId)}/services?${query}`);
}

/** Adds a service to a business the authenticated BUSINESS account owns. */
export function createService(
  client: Pick<ApiClient, 'apiFetch'>,
  businessId: string,
  data: ServiceCreateRequest,
): Promise<Service> {
  return client.apiFetch<Service>(`/business/businesses/${encodeURIComponent(businessId)}/services`, {
    method: 'POST',
    body: data,
  });
}

/** Omitted fields stay as they are; `isActive: true` reactivates a deactivated service. */
export function updateService(
  client: Pick<ApiClient, 'apiFetch'>,
  serviceId: string,
  data: ServiceUpdateRequest,
): Promise<Service> {
  return client.apiFetch<Service>(servicePath(serviceId), { method: 'PATCH', body: data });
}

/** Soft delete: the API sets isActive=false (204) so past bookings keep their service. */
export function deleteService(client: Pick<ApiClient, 'apiFetch'>, serviceId: string): Promise<void> {
  return client.apiFetch<void>(servicePath(serviceId), { method: 'DELETE' });
}

/** A page of a service's photos (public endpoint). */
export function listServicePhotos(
  client: Pick<ApiClient, 'apiFetch'>,
  serviceId: string,
  { page = 1, pageSize = 20 }: { page?: number; pageSize?: number } = {},
): Promise<PaginatedPhotos> {
  return client.apiFetch<PaginatedPhotos>(`${servicePath(serviceId)}/photos?page=${page}&pageSize=${pageSize}`);
}

/** Uploads one image as multipart/form-data (`file`, optional `displayOrder`). */
export function uploadServicePhoto(
  client: Pick<ApiClient, 'apiFetch'>,
  serviceId: string,
  file: Blob,
  displayOrder?: number,
): Promise<Photo> {
  const form = new FormData();
  form.append('file', file);
  if (displayOrder !== undefined) form.append('displayOrder', String(displayOrder));
  return client.apiFetch<Photo>(`${servicePath(serviceId)}/photos`, { method: 'POST', body: form });
}

export function deleteServicePhoto(
  client: Pick<ApiClient, 'apiFetch'>,
  serviceId: string,
  photoId: string,
): Promise<void> {
  return client.apiFetch<void>(`${servicePath(serviceId)}/photos/${encodeURIComponent(photoId)}`, {
    method: 'DELETE',
  });
}
