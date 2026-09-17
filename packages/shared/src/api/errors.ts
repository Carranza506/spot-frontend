import type { components } from './schema';

type ErrorSchema = components['schemas']['Error'];

/** Thrown for every non-2xx `apiFetch` response, shaped by the API's `Error` schema. */
export class ApiError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;
  readonly timestamp: string;
  readonly status: number;

  constructor(status: number, body: ErrorSchema) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.details = body.details;
    this.timestamp = body.timestamp;
  }
}

/**
 * Builds an ApiError from a non-2xx Response. If the body isn't valid JSON or
 * doesn't match the Error schema (e.g. a proxy/HTML error page), falls back to
 * a synthetic Error payload so callers only ever have to handle ApiError.
 */
export async function parseErrorResponse(response: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  if (isErrorSchema(body)) {
    return new ApiError(response.status, body);
  }

  return new ApiError(response.status, {
    code: 'UNKNOWN_ERROR',
    message: response.statusText || 'An unexpected error occurred.',
    timestamp: new Date().toISOString(),
  });
}

function isErrorSchema(value: unknown): value is ErrorSchema {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ErrorSchema).code === 'string' &&
    typeof (value as ErrorSchema).message === 'string' &&
    typeof (value as ErrorSchema).timestamp === 'string'
  );
}
