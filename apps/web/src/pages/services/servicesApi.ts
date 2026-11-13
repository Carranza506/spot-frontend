import {
  createService,
  deleteService,
  deleteServicePhoto,
  listBusinessServices,
  listServicePhotos,
  updateService,
  uploadServicePhoto,
  type BusinessServicesFilter,
  type components,
} from '@spot/shared';
import { authClient } from '../../api/client';

type Service = components['schemas']['Service'];
type ServiceCreateRequest = components['schemas']['ServiceCreateRequest'];
type ServiceUpdateRequest = components['schemas']['ServiceUpdateRequest'];
type PaginatedServices = components['schemas']['PaginatedServices'];
type Photo = components['schemas']['Photo'];

/** What the Servicios view needs from the service and service-photo endpoints. */
export interface ServicesApi {
  list(businessId: string, filter: BusinessServicesFilter): Promise<PaginatedServices>;
  create(businessId: string, data: ServiceCreateRequest): Promise<Service>;
  update(serviceId: string, data: ServiceUpdateRequest): Promise<Service>;
  deactivate(serviceId: string): Promise<void>;
  listPhotos(serviceId: string): Promise<Photo[]>;
  uploadPhoto(serviceId: string, file: File, displayOrder: number): Promise<Photo>;
  deletePhoto(serviceId: string, photoId: string): Promise<void>;
}

// The contract's max pageSize; a service has a handful of photos, so one page is all of them.
const PHOTOS_PAGE_SIZE = 100;

export const servicesApi: ServicesApi = {
  list: (businessId, filter) => listBusinessServices(authClient, businessId, filter),
  create: (businessId, data) => createService(authClient, businessId, data),
  update: (serviceId, data) => updateService(authClient, serviceId, data),
  deactivate: (serviceId) => deleteService(authClient, serviceId),
  listPhotos: (serviceId) =>
    listServicePhotos(authClient, serviceId, { pageSize: PHOTOS_PAGE_SIZE }).then((page) => page.data),
  uploadPhoto: (serviceId, file, displayOrder) => uploadServicePhoto(authClient, serviceId, file, displayOrder),
  deletePhoto: (serviceId, photoId) => deleteServicePhoto(authClient, serviceId, photoId),
};
