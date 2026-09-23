import type { ApiClient } from '../api/client';
import type { components } from '../api/schema';

type Business = components['schemas']['Business'];
type BusinessCreateRequest = components['schemas']['BusinessCreateRequest'];

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
