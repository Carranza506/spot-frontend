/** Mirrors ServiceCreateRequest's maxLength in contracts/spot-api.yaml. */
export const SERVICE_NAME_MAX_LENGTH = 150;

// The contract doesn't bound uploads; these keep them to common web images of a sane size.
export const SERVICE_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const SERVICE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

/** `price`: a number >= 0 (colones), as typed in the form. */
export function validateServicePrice(value: string): string | null {
  if (!value.trim()) return 'El precio es requerido.';
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) return 'Ingresá un precio válido (0 o más).';
  return null;
}

/** `durationMinutes`: a whole number >= 1, as typed in the form. */
export function validateServiceDuration(value: string): string | null {
  if (!value.trim()) return 'La duración es requerida.';
  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes < 1) return 'La duración debe ser un número entero de minutos (1 o más).';
  return null;
}

export function validateServicePhoto(file: { type: string; size: number }): string | null {
  if (!SERVICE_PHOTO_TYPES.includes(file.type)) return 'La foto debe ser JPG, PNG o WebP.';
  if (file.size > SERVICE_PHOTO_MAX_BYTES) return 'La foto no puede pesar más de 5 MB.';
  return null;
}
