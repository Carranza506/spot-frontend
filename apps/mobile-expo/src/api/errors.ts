import { ApiError } from '@spot/shared';

export const NETWORK_ERROR = 'No se pudo conectar con el servidor. Intentá de nuevo.';

/** The session ended (or its refresh failed): the screen sends the user back to login. */
export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}
