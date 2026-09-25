import type { ApiError } from '../api/errors';
import type { AuthFormErrors } from '../auth/errors';

// BusinessUpdateRequest fields the business profile form edits (contracts/spot-api.yaml).
const BUSINESS_FIELDS = new Set(['name', 'description', 'legalName', 'email', 'phone', 'website', 'logoUrl']);

// BusinessContactCreateRequest fields.
const CONTACT_FIELDS = new Set(['type', 'value', 'isPrimary']);

/**
 * Maps a business ApiError to a field-level error when a 400 identifies the offending
 * field, otherwise to a general error. Unlike mapAuthApiError, a 409 is not an email
 * conflict here, so it stays a general error. `fields` are the form's field names.
 */
export function mapBusinessApiError(error: ApiError, fields: ReadonlySet<string> = BUSINESS_FIELDS): AuthFormErrors {
  const rawField = typeof error.details?.field === 'string' ? error.details.field : undefined;
  // The contract names fields in camelCase (`details: { field: email }`), but spot-business-api
  // currently reports the C# member name ('LegalName'), so both spellings are accepted.
  const field = rawField && rawField.charAt(0).toLowerCase() + rawField.slice(1);

  if (error.status === 400 && field && fields.has(field)) {
    return { fieldErrors: { [field]: error.message } };
  }
  return { fieldErrors: {}, generalError: error.message };
}

/** mapBusinessApiError for the business contact create form. */
export function mapBusinessContactApiError(error: ApiError): AuthFormErrors {
  return mapBusinessApiError(error, CONTACT_FIELDS);
}
