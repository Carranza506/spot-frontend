import { ApiError, SERVICE_NAME_MAX_LENGTH, validateServicePhoto, type components } from '@spot/shared';
import type { ServicesApi } from './servicesApi';

type Service = components['schemas']['Service'];
type Photo = components['schemas']['Photo'];

// In-browser stand-in for the service endpoints spot-backend doesn't serve yet: list/update/
// deactivate (#114-#116) and service photos (#65). Create (#113) is live, but it's mocked too so
// created services show up in the mocked list. Enabled with VITE_SERVICES_MOCK=true. Persists per
// business in localStorage (photos downscaled to small JPEG data URLs so they fit) and reproduces
// the contract's 400/404 responses. Delete once those endpoints are live.

const STORAGE_PREFIX = 'spot.servicesMock.';
const LATENCY_MS = 300;
const PHOTO_MAX_SIDE = 480;

interface MockStore {
  services: Service[];
  photos: Record<string, Photo[]>;
}

const SAMPLE_SERVICES: [string, string | null, number, number, boolean][] = [
  ['Corte de cabello', 'Corte clásico o moderno, con lavado.', 6000, 30, true],
  ['Corte y barba', 'Corte de cabello más perfilado y arreglo de barba con toalla caliente.', 9500, 60, true],
  ['Afeitado tradicional', null, 5000, 30, true],
  ['Tinte de barba', 'Coloración para cubrir canas.', 7000, 45, false],
];

function seed(businessId: string): MockStore {
  const now = new Date().toISOString();
  const services = SAMPLE_SERVICES.map(([name, description, price, durationMinutes, isActive]) => ({
    id: crypto.randomUUID(),
    businessId,
    name,
    description,
    price,
    durationMinutes,
    isActive,
    createdAt: now,
    updatedAt: now,
  }));
  return { services, photos: {} };
}

function load(businessId: string): MockStore {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + businessId);
    if (raw) return JSON.parse(raw) as MockStore;
  } catch {
    // Unreadable storage: fall through and reseed.
  }
  const store = seed(businessId);
  save(businessId, store);
  return store;
}

function save(businessId: string, store: MockStore): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + businessId, JSON.stringify(store));
  } catch {
    throw apiError(400, 'BAD_REQUEST', 'El almacenamiento de prueba del navegador está lleno. Eliminá algunas fotos.');
  }
}

/** The business that owns `serviceId`, searching every seeded business in this browser. */
function findOwner(serviceId: string): string {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(STORAGE_PREFIX)) continue;
    const businessId = key.slice(STORAGE_PREFIX.length);
    if (load(businessId).services.some((s) => s.id === serviceId)) return businessId;
  }
  throw apiError(404, 'NOT_FOUND', 'El servicio no existe.');
}

function withLatency<T>(operation: () => T | Promise<T>): Promise<T> {
  return new Promise((resolve) => setTimeout(resolve, LATENCY_MS)).then(operation);
}

function apiError(status: number, code: string, message: string, field?: string): ApiError {
  return new ApiError(status, {
    code,
    message,
    details: field ? { field } : undefined,
    timestamp: new Date().toISOString(),
  });
}

/** Same field rules as ServiceCreateRequest/ServiceUpdateRequest, reported like the API's 400s. */
function validate(data: Partial<Service>): void {
  if (data.name !== undefined && !data.name.trim()) throw apiError(400, 'BAD_REQUEST', 'El nombre es requerido.', 'name');
  if (data.name !== undefined && data.name.length > SERVICE_NAME_MAX_LENGTH) {
    throw apiError(400, 'BAD_REQUEST', `El nombre no puede superar ${SERVICE_NAME_MAX_LENGTH} caracteres.`, 'name');
  }
  if (data.price !== undefined && !(data.price >= 0)) throw apiError(400, 'BAD_REQUEST', 'Precio inválido.', 'price');
  if (data.durationMinutes !== undefined && !(Number.isInteger(data.durationMinutes) && data.durationMinutes >= 1)) {
    throw apiError(400, 'BAD_REQUEST', 'Duración inválida.', 'durationMinutes');
  }
}

/** Downscales an image to a small JPEG data URL, standing in for the URL the API would return. */
async function toDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw apiError(400, 'BAD_REQUEST', 'El archivo no es una imagen válida.', 'file');
  });
  const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.8);
}

function updateStoredService(serviceId: string, changes: Partial<Service>): Service {
  const businessId = findOwner(serviceId);
  const store = load(businessId);
  const current = store.services.find((s) => s.id === serviceId)!;
  const updated: Service = { ...current, ...changes, updatedAt: new Date().toISOString() };
  save(businessId, { ...store, services: store.services.map((s) => (s.id === serviceId ? updated : s)) });
  return updated;
}

export const mockServicesApi: ServicesApi = {
  list: (businessId, { page = 1, pageSize = 20, isActive }) =>
    withLatency(() => {
      const matching = load(businessId)
        .services.filter((s) => isActive === undefined || s.isActive === isActive)
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
      return {
        data: matching.slice((page - 1) * pageSize, page * pageSize),
        pagination: { page, pageSize, total: matching.length, totalPages: Math.ceil(matching.length / pageSize) },
      };
    }),

  create: (businessId, data) =>
    withLatency(() => {
      validate(data);
      const now = new Date().toISOString();
      const service: Service = {
        id: crypto.randomUUID(),
        businessId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        price: data.price,
        durationMinutes: data.durationMinutes,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      const store = load(businessId);
      save(businessId, { ...store, services: [...store.services, service] });
      return service;
    }),

  update: (serviceId, data) =>
    withLatency(() => {
      validate({ ...data, description: data.description ?? undefined });
      return updateStoredService(serviceId, data);
    }),

  deactivate: (serviceId) =>
    withLatency(() => {
      updateStoredService(serviceId, { isActive: false });
    }),

  listPhotos: (serviceId) => withLatency(() => load(findOwner(serviceId)).photos[serviceId] ?? []),

  uploadPhoto: (serviceId, file, displayOrder) =>
    withLatency(async () => {
      const businessId = findOwner(serviceId);
      const fileError = validateServicePhoto(file);
      if (fileError) throw apiError(400, 'BAD_REQUEST', fileError, 'file');
      const photo: Photo = {
        id: crypto.randomUUID(),
        url: await toDataUrl(file),
        displayOrder,
        createdAt: new Date().toISOString(),
      };
      const store = load(businessId);
      save(businessId, { ...store, photos: { ...store.photos, [serviceId]: [...(store.photos[serviceId] ?? []), photo] } });
      return photo;
    }),

  deletePhoto: (serviceId, photoId) =>
    withLatency(() => {
      const businessId = findOwner(serviceId);
      const store = load(businessId);
      const photos = store.photos[serviceId] ?? [];
      if (!photos.some((p) => p.id === photoId)) throw apiError(404, 'NOT_FOUND', 'La foto no existe.');
      save(businessId, { ...store, photos: { ...store.photos, [serviceId]: photos.filter((p) => p.id !== photoId) } });
    }),
};
