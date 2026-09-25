/** Mirror BusinessUpdateRequest's maxLengths in contracts/spot-api.yaml. */
export const BUSINESS_NAME_MAX_LENGTH = 150;
export const BUSINESS_LEGAL_NAME_MAX_LENGTH = 200;
export const BUSINESS_PHONE_MAX_LENGTH = 30;

const HTTP_URL_REGEX = /^https?:\/\/[^\s/?#]+[^\s]*$/i;

/** `format: uri` fields (website, logoUrl): an absolute http(s) URL, as the API accepts. */
export function validateHttpUrl(url: string): string | null {
  return HTTP_URL_REGEX.test(url.trim()) ? null : 'Ingresá una URL válida que empiece con http:// o https://.';
}
