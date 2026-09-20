import { createApiClient, type ApiClient, type ApiFetchOptions, type AuthClient, type TokenStorage } from '@spot/shared';
import { clearTokens, getTokens, setTokens } from './auth-storage';

function getBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!baseUrl) {
    throw new Error('VITE_API_BASE_URL is not set. Copy apps/web/.env.example to apps/web/.env and set it.');
  }
  return baseUrl;
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

export const authStorage: TokenStorage = { getTokens, setTokens, clearTokens };

/** apiFetch + token storage bundled for the shared auth helpers (login/register/logout/getOwnProfile). */
export const authClient: AuthClient = { apiFetch, storage: authStorage };

export type { ApiFetchOptions } from '@spot/shared';
