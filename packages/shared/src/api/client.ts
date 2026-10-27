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
  '/business/billing/plans',
];

// Authenticated literal paths that would otherwise match a public template above
// (e.g. `/business/businesses/me` vs `/business/businesses/{businessId}`).
const AUTHENTICATED_GET_PATHS = new Set(['/business/businesses/me']);

export function isPublicApiPath(method: string, path: string): boolean {
  const pathname = path.split('?')[0];
  if (method === 'POST') return PUBLIC_POST_PATHS.has(pathname);
  if (method !== 'GET') return false;
  if (AUTHENTICATED_GET_PATHS.has(pathname)) return false;
  return PUBLIC_GET_PATH_TEMPLATES.some((template) => matchesTemplate(template, pathname));
}

function matchesTemplate(template: string, pathname: string): boolean {
  const templateSegments = template.split('/');
  const pathSegments = pathname.split('/');
  if (templateSegments.length !== pathSegments.length) return false;
  return templateSegments.every((segment, i) => segment.startsWith('{') || segment === pathSegments[i]);
}

// An access token that expires within this long is renewed before an `optionalAuth` call.
const REFRESH_LEEWAY_MS = 10_000;

/**
 * The `exp` claim of a JWT in milliseconds since the epoch, or null when it can't be read. It only
 * decides when to ask for a new token; it never makes the token trusted (the server does that).
 */
function readJwtExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload || typeof atob !== 'function') return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const exp = (JSON.parse(atob(base64)) as { exp?: unknown }).exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: unknown;
  headers?: Record<string, string>;
  /**
   * Attach the session's token (if any) even on a public endpoint. For owner-aware public reads,
   * where a token is optional and only widens what the owner sees (e.g. inactive services).
   * An expired token is renewed first, and a 401 is retried after a refresh, but a failed refresh
   * never clears the session on such a call.
   */
  optionalAuth?: boolean;
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

  async function sendRequest(
    path: string,
    method: string,
    { optionalAuth, ...options }: ApiFetchOptions,
  ): Promise<Response> {
    const headers = new Headers(options.headers);
    // multipart/form-data uploads (photos) go as-is: fetch sets the Content-Type with its boundary.
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (options.body !== undefined && !isFormData && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (optionalAuth || !isPublicApiPath(method, path)) {
      const tokens = await storage.getTokens();
      if (tokens) {
        headers.set('Authorization', `Bearer ${tokens.accessToken}`);
      }
    }

    let body: string | FormData | undefined;
    if (isFormData) {
      body = options.body as FormData;
    } else if (options.body !== undefined) {
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

  /**
   * Renews the session. When the refresh fails the stored session is cleared, unless
   * `clearOnFailure` is false: a public call that merely carries an optional token must never log
   * the user out because of a failed refresh.
   */
  async function tryRefreshSession(clearOnFailure = true): Promise<boolean> {
    const tokens = await storage.getTokens();
    if (!tokens) return false;
    try {
      const newTokens = await requestTokenRefresh(tokens.refreshToken);
      await storage.setTokens(newTokens);
      return true;
    } catch {
      if (clearOnFailure) await storage.clearTokens();
      return false;
    }
  }

  /**
   * Before an `optionalAuth` call, renews an access token whose `exp` has passed. A public
   * endpoint reads an expired token as "anonymous" and answers 200 with the public view, so no 401
   * would ever make the client refresh and the owner would silently get the wrong data.
   */
  async function refreshIfExpired(): Promise<void> {
    const tokens = await storage.getTokens();
    if (!tokens) return;
    const expiresAt = readJwtExpiry(tokens.accessToken);
    if (expiresAt === null || expiresAt - REFRESH_LEEWAY_MS > Date.now()) return;
    // A failed refresh keeps the session: the call goes out as it is (the public view), and the
    // next authenticated call decides whether the session is really over.
    await tryRefreshSession(false);
  }

  async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
    const method = (options.method ?? 'GET').toUpperCase();
    const isPublic = isPublicApiPath(method, path);
    const optionalAuth = options.optionalAuth === true && isPublic;
    if (optionalAuth) await refreshIfExpired();
    const response = await sendRequest(path, method, options);

    if (response.status === 401 && !isPublic) {
      const refreshed = await tryRefreshSession();
      if (refreshed) {
        const retryResponse = await sendRequest(path, method, options);
        return handleResponse<T>(retryResponse);
      }
    } else if (response.status === 401 && optionalAuth && (await tryRefreshSession(false))) {
      // The public call carried a token and was refused: same as an authenticated call, retried once.
      const retryResponse = await sendRequest(path, method, options);
      return handleResponse<T>(retryResponse);
    }

    return handleResponse<T>(response);
  }

  return { apiFetch };
}
