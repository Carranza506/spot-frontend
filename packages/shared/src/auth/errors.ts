import { ApiError } from '../api/errors';

export interface AuthFormErrors {
  fieldErrors: Record<string, string>;
  generalError?: string;
}

// Fields the login/register forms can submit; used to recognize a `details.field`
// the API points to (see the BadRequest response example in contracts/spot-api.yaml).
const KNOWN_FIELDS = new Set(['email', 'password', 'firstName', 'lastName', 'phone']);

/**
 * Maps an auth ApiError to field-level errors when the API identifies the
 * offending field, otherwise to a general error for the form to show.
 */
export function mapAuthApiError(error: ApiError): AuthFormErrors {
  const field = typeof error.details?.field === 'string' ? error.details.field : undefined;

  if (error.status === 400 && field && KNOWN_FIELDS.has(field)) {
    return { fieldErrors: { [field]: error.message } };
  }
  // A 409 on register/login only ever means the email is already registered.
  if (error.status === 409) {
    return { fieldErrors: { email: error.message } };
  }
  return { fieldErrors: {}, generalError: error.message };
}
