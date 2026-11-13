import { createApiClient, type ApiClient, type ApiFetchOptions, type AuthClient, type TokenStorage } from '@spot/shared';
import { clearTokens, getTokens, setTokens } from './auth-storage';
import { emitSessionCleared } from './session-events';

function getBaseUrl(): string {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL is not set. Copy apps/mobile-expo/.env.example to apps/mobile-expo/.env and set it.',
    );
  }
  return baseUrl;
}

// Every place that clears the session (logout, a refresh that failed) goes through this one storage,
// so the app can tell that the account is gone: see session-events.
export const authStorage: TokenStorage = {
  getTokens,
  setTokens,
  clearTokens: async () => {
    await clearTokens();
    emitSessionCleared();
  },
};

let client: ApiClient | null = null;

function getClient(): ApiClient {
  if (!client) {
    client = createApiClient({ baseUrl: getBaseUrl(), storage: authStorage });
  }
  return client;
}

export function apiFetch<T>(path: string, options?: ApiFetchOptions): Promise<T> {
  return getClient().apiFetch<T>(path, options);
}

export const authClient: AuthClient = { apiFetch, storage: authStorage };

export type { ApiFetchOptions } from '@spot/shared';
