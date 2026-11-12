// Phone numbers by country (BUG-09). libphonenumber-js carries the same numbering data as the
// backend's libphonenumber-csharp, so a number accepted here is accepted by the API too.
// Single file with no relative imports, so `node --test` can load it directly (tests/phone.test.mjs).
import { getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

export type { CountryCode };

export interface PhoneCountry {
  code: CountryCode;
  name: string;
  /** "+506" */
  dialCode: string;
}

export const DEFAULT_PHONE_COUNTRY: CountryCode = 'CR';

// shortcut: a curated list (the Americas and Spain) instead of every country, since Intl.DisplayNames
// isn't available everywhere React Native runs; add a country here when someone needs it.
const COUNTRY_NAMES: Partial<Record<CountryCode, string>> = {
  CR: 'Costa Rica',
  AR: 'Argentina',
  BO: 'Bolivia',
  BR: 'Brasil',
  CA: 'Canadá',
  CL: 'Chile',
  CO: 'Colombia',
  CU: 'Cuba',
  EC: 'Ecuador',
  SV: 'El Salvador',
  ES: 'España',
  US: 'Estados Unidos',
  GT: 'Guatemala',
  HN: 'Honduras',
  MX: 'México',
  NI: 'Nicaragua',
  PA: 'Panamá',
  PY: 'Paraguay',
  PE: 'Perú',
  PR: 'Puerto Rico',
  DO: 'República Dominicana',
  UY: 'Uruguay',
  VE: 'Venezuela',
};

/** Costa Rica first, then the rest alphabetically. */
export const PHONE_COUNTRIES: PhoneCountry[] = (Object.keys(COUNTRY_NAMES) as CountryCode[]).map((code) => ({
  code,
  name: COUNTRY_NAMES[code]!,
  dialCode: `+${getCountryCallingCode(code)}`,
}));

export const PHONE_INVALID_MESSAGE = 'Ingresá un número de teléfono válido para el país seleccionado.';

function parse(national: string, country: CountryCode) {
  const trimmed = national.trim();
  return trimmed ? parsePhoneNumberFromString(trimmed, country) : undefined;
}

/** null when it's blank (phones are optional) or a valid number for `country`; the error message otherwise. */
export function validatePhone(national: string, country: CountryCode): string | null {
  if (!national.trim()) return null;
  const phone = parse(national, country);
  // A number typed with another country's code ("+52 …") must match the selected country.
  return phone?.isValid() && phone.country === country ? null : PHONE_INVALID_MESSAGE;
}

/** The number in E.164 ("+50688881234") for the API; null when blank or invalid. */
export function toE164(national: string, country: CountryCode): string | null {
  return validatePhone(national, country) === null ? (parse(national, country)?.number ?? null) : null;
}

/** Splits a stored phone into the selector's country and the number without its code, to edit it. */
export function splitPhone(value: string | null | undefined): { country: CountryCode; national: string } {
  const phone = value ? parsePhoneNumberFromString(value) : undefined;
  if (phone?.country && COUNTRY_NAMES[phone.country]) return { country: phone.country, national: phone.formatNational() };
  // Not parseable or not in the list: keep what was stored so nothing is lost when editing.
  return { country: DEFAULT_PHONE_COUNTRY, national: value ?? '' };
}

/** A stored phone for display ("+506 8888 1234"); as stored when it can't be parsed. */
export function formatPhone(value: string): string {
  return parsePhoneNumberFromString(value)?.formatInternational() ?? value;
}
