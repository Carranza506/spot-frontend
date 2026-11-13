export const BUSINESS_ONLY_MESSAGE =
  'El panel es para cuentas de negocio. Si sos cliente, usá la app móvil de Spot para reservar.';

/** Navigation state a guard hands to the login screen, so it can say why the session ended. */
export interface LoginRedirectState {
  businessOnly?: boolean;
}

export const BUSINESS_ONLY_STATE: LoginRedirectState = { businessOnly: true };

export function isBusinessOnlyRedirect(state: unknown): boolean {
  return (state as LoginRedirectState | null)?.businessOnly === true;
}
