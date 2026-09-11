import { API_BASE_URL } from '@env';
import { createApiClient, type ApiClient, type ApiFetchOptions } from '@spot/shared';
import { clearTokens, getTokens, setTokens } from './auth-storage';

function getBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new Error('API_BASE_URL is not set. Copy apps/mobile/.env.example to apps/mobile/.env and set it.');
  }
  return API_BASE_URL;
}

let client: ApiClient | null = null;

function getClient(): ApiClient {
  if (!client) {
    client = createApiClient({
      baseUrl: getBaseUrl(),
      storage: { getTokens, setTokens, clearTokens },
    });
  }
  return client;
}

export function apiFetch<T>(path: string, options?: ApiFetchOptions): Promise<T> {
  return getClient().apiFetch<T>(path, options);
}

export type { ApiFetchOptions } from '@spot/shared';
