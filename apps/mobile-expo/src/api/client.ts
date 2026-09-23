import { createApiClient, type ApiClient, type ApiFetchOptions, type AuthClient, type TokenStorage } from '@spot/shared';
import { clearTokens, getTokens, setTokens } from './auth-storage';

function getBaseUrl(): string {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL is not set. Copy apps/mobile-expo/.env.example to apps/mobile-expo/.env and set it.',
    );
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

export const authClient: AuthClient = { apiFetch, storage: authStorage };

export type { ApiFetchOptions } from '@spot/shared';
