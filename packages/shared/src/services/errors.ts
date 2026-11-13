import type { ApiError } from '../api/errors';
import type { AuthFormErrors } from '../auth/errors';
import { mapBusinessApiError } from '../business/errors';

// ServiceCreateRequest/ServiceUpdateRequest fields the service form edits.
const SERVICE_FIELDS = new Set(['name', 'description', 'price', 'durationMinutes']);

/** mapBusinessApiError for the service create/edit form. */
export function mapServiceApiError(error: ApiError): AuthFormErrors {
  return mapBusinessApiError(error, SERVICE_FIELDS);
}
