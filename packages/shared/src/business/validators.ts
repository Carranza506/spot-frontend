/** Mirror BusinessUpdateRequest's maxLengths in contracts/spot-api.yaml. */
export const BUSINESS_NAME_MAX_LENGTH = 150;
export const BUSINESS_LEGAL_NAME_MAX_LENGTH = 200;
export const BUSINESS_PHONE_MAX_LENGTH = 30;

const HTTP_URL_REGEX = /^https?:\/\/[^\s/?#]+[^\s]*$/i;

/** `format: uri` fields (website, logoUrl): an absolute http(s) URL, as the API accepts. */
export function validateHttpUrl(url: string): string | null {
  return HTTP_URL_REGEX.test(url.trim()) ? null : 'Ingresá una URL válida que empiece con http:// o https://.';
}

/** Mirror BusinessLocationUpsertRequest's maxLengths in contracts/spot-api.yaml. */
export const BUSINESS_LOCATION_CITY_MAX_LENGTH = 100;
export const BUSINESS_LOCATION_PROVINCE_MAX_LENGTH = 100;
export const BUSINESS_LOCATION_POSTAL_CODE_MAX_LENGTH = 20;

/**
 * Costa Rica's provinces, spelled as the search's exact `province` filter expects them
 * (the mobile search offers the same list).
 */
export const COSTA_RICA_PROVINCES = [
  'San José',
  'Alajuela',
  'Cartago',
  'Heredia',
  'Guanacaste',
  'Puntarenas',
  'Limón',
] as const;

/**
 * A GeoPoint coordinate typed as text: a decimal number within ±`limit`
 * (90 for latitude, 180 for longitude). Returns the error message, or null when valid.
 */
export function validateCoordinate(value: string, limit: 90 | 180): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Este dato es requerido.';
  const number = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(number)) return 'Ingresá un número, por ejemplo 9.9325.';
  if (Math.abs(number) > limit) return `Debe estar entre -${limit} y ${limit}.`;
  return null;
}

/** The value of a coordinate that passed validateCoordinate (a comma is read as the decimal point). */
export function parseCoordinate(value: string): number {
  return Number(value.trim().replace(',', '.'));
}
