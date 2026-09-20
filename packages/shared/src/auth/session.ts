import type { ApiClient, TokenStorage } from '../api/client';
import type { components } from '../api/schema';

// `role` carries a default in the contract, so codegen marks it required; the API
// itself treats it as optional (defaults to CLIENT), so callers may omit it.
type RegisterRequest = Omit<components['schemas']['RegisterRequest'], 'role'> & {
  role?: components['schemas']['RegisterRequest']['role'];
};
type LoginRequest = components['schemas']['LoginRequest'];
type AuthResponse = components['schemas']['AuthResponse'];
type User = components['schemas']['User'];

/** The pieces a platform's ApiClient + TokenStorage provide to run a session. */
export interface AuthClient {
  apiFetch: ApiClient['apiFetch'];
  storage: TokenStorage;
}

export async function login(client: AuthClient, credentials: LoginRequest): Promise<User> {
  const { user, tokens } = await client.apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: credentials,
  });
  await client.storage.setTokens(tokens);
  return user;
}

export async function register(client: AuthClient, data: RegisterRequest): Promise<User> {
  const { user, tokens } = await client.apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: data,
  });
  await client.storage.setTokens(tokens);
  return user;
}

export async function logout(client: AuthClient): Promise<void> {
  const tokens = await client.storage.getTokens();
  try {
    if (tokens) {
      await client.apiFetch('/auth/logout', {
        method: 'POST',
        body: { refreshToken: tokens.refreshToken },
      });
    }
  } finally {
    await client.storage.clearTokens();
  }
}

export function getOwnProfile(client: AuthClient): Promise<User> {
  return client.apiFetch<User>('/auth/me');
}
