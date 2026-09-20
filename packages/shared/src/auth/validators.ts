/** Mirrors RegisterRequest.password in contracts/spot-api.yaml. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'El correo es requerido.';
  if (!EMAIL_REGEX.test(email)) return 'Ingresá un correo válido.';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'La contraseña es requerida.';
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `La contraseña no puede superar los ${PASSWORD_MAX_LENGTH} caracteres.`;
  }
  return null;
}

export function validateRequired(value: string, message: string): string | null {
  return value.trim() ? null : message;
}
