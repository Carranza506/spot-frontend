import { ApiError, parseErrorResponse } from './errors';
import type { components } from './schema';

type AuthTokens = components['schemas']['AuthTokens'];
type RefreshRequest = components['schemas']['RefreshRequest'];

/**
 * Endpoints the API Gateway routes without a JWT (see contracts/spot-api.yaml,
 * the top-level `security: []` overrides). Kept as path templates so they read
 * the same way as the OpenAPI `paths` keys they mirror.
 */
const PUBLIC_POST_PATHS = new Set(['/auth/login', '/auth/register', '/auth/refresh', '/auth/google']);

// Must stay in sync with the per-path `security: []` overrides for GET
// operations in contracts/spot-api.yaml, so future public endpoints aren't missed.
const PUBLIC_GET_PATH_TEMPLATES = [
  '/business/categories',
  '/business/businesses',
  '/business/businesses/{businessId}',
  '/business/businesses/{businessId}/location',
  '/business/businesses/{businessId}/contacts',
  '/business/businesses/{businessId}/hours',
  '/business/businesses/{businessId}/schedule-exceptions',
  '/business/businesses/{businessId}/categories',
  '/business/businesses/{businessId}/services',
  '/business/services/{serviceId}',
  '/business/businesses/{businessId}/photos',
  '/business/services/{serviceId}/photos',
  '/booking/businesses/{businessId}/availability',
  '/booking/businesses/{businessId}/reviews',
];

export function isPublicApiPath(method: string, path: string): boolean {
  const pathname = path.split('?')[0];
  if (method === 'POST') return PUBLIC_POST_PATHS.has(pathname);
  if (method !== 'GET') return false;
  return PUBLIC_GET_PATH_TEMPLATES.some((template) => matchesTemplate(template, pathname));
}

function matchesTemplate(template: string, pathname: string): boolean {
  const templateSegments = template.split('/');
  const pathSegments = pathname.split('/');
  if (templateSegments.length !== pathSegments.length) return false;
  return templateSegments.every((segment, i) => segment.startsWith('{') || segment === pathSegments[i]);
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: unknown;
  headers?: Record<string, string>;
}

/** Minimal shape the client needs from a stored session — platform storage may keep more. */
export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Persistence for the current session's tokens, injected per platform (localStorage on
 * web, AsyncStorage/SecureStore on mobile). Methods may be sync or async since mobile
 * storage APIs are inherently async while web's localStorage is not — every call site
 * awaits the result, which works for either.
 */
export interface TokenStorage {
  getTokens(): StoredTokens | null | Promise<StoredTokens | null>;
  setTokens(tokens: AuthTokens): void | Promise<void>;
  clearTokens(): void | Promise<void>;
}

export interface ApiClientConfig {
  baseUrl: string;
  storage: TokenStorage;
}

export interface ApiClient {
  apiFetch: <T>(path: string, options?: ApiFetchOptions) => Promise<T>;
}

/**
 * Builds a fetch-based API client wired to a given base URL and token storage.
 * Attaches the JWT automatically (skipping public endpoints), refreshes an
 * expired session on 401 and retries the original request exactly once, and
 * throws ApiError for every non-2xx response.
 */
export function createApiClient({ baseUrl, storage }: ApiClientConfig): ApiClient {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');

  function buildUrl(path: string): string {
    return `${normalizedBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  async function sendRequest(path: string, method: string, options: ApiFetchOptions): Promise<Response> {
    const headers = new Headers(options.headers);
    if (options.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (!isPublicApiPath(method, path)) {
      const tokens = await storage.getTokens();
      if (tokens) {
        headers.set('Authorization', `Bearer ${tokens.accessToken}`);
      }
    }

    let body: string | undefined;
    if (options.body !== undefined) {
      try {
        body = JSON.stringify(options.body);
      } catch {
        throw new ApiError(0, {
          code: 'SERIALIZATION_ERROR',
          message: 'Failed to serialize request body.',
          timestamp: new Date().toISOString(),
        });
      }
    }

    return fetch(buildUrl(path), {
      ...options,
      method,
      headers,
      body,
    });
  }

  async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      throw await parseErrorResponse(response);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  // Refresh tokens rotate server-side on every use (a used refresh token is revoked),
  // so concurrent 401s must share a single in-flight refresh instead of each firing
  // their own /auth/refresh call — otherwise all but the first would fail.
  let refreshInFlight: Promise<AuthTokens> | null = null;

  function requestTokenRefresh(refreshToken: string): Promise<AuthTokens> {
    if (!refreshInFlight) {
      refreshInFlight = performRefresh(refreshToken).finally(() => {
        refreshInFlight = null;
      });
    }
    return refreshInFlight;
  }

  async function performRefresh(refreshToken: string): Promise<AuthTokens> {
    const body: RefreshRequest = { refreshToken };
    const response = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return handleResponse<AuthTokens>(response);
  }

  async function tryRefreshSession(): Promise<boolean> {
    const tokens = await storage.getTokens();
    if (!tokens) return false;
    try {
      const newTokens = await requestTokenRefresh(tokens.refreshToken);
      await storage.setTokens(newTokens);
      return true;
    } catch {
      await storage.clearTokens();
      return false;
    }
  }

  async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
    const method = (options.method ?? 'GET').toUpperCase();
    const response = await sendRequest(path, method, options);

    if (response.status === 401 && !isPublicApiPath(method, path)) {
      const refreshed = await tryRefreshSession();
      if (refreshed) {
        const retryResponse = await sendRequest(path, method, options);
        return handleResponse<T>(retryResponse);
      }
    }

    return handleResponse<T>(response);
  }

  return { apiFetch };
}
