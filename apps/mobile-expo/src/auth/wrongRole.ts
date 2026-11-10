/**
 * Why an account was signed out again, kept outside the login screen on purpose: clearing the
 * session makes the root layout replace the route (see SessionGuard in `app/_layout.tsx`), which
 * remounts that screen and would drop its component state along with the message.
 */
export const WRONG_ROLE_MESSAGE = 'Esta app es para clientes. Ingresá al panel web para administrar tu negocio.';

let pending = false;

/** The account that just signed in isn't a client, so the login screen has to say why. */
export function rememberWrongRole(): void {
  pending = true;
}

/** The message for a screen that is mounting now, or null. */
export function takeWrongRole(): string | null {
  if (!pending) return null;
  pending = false;
  return WRONG_ROLE_MESSAGE;
}

/**
 * Drops a pending reason. Every sign-in attempt calls this first, so a message left over from an
 * earlier one (a logout that failed, a screen that never mounted again) can't be shown to the
 * account trying now.
 */
export function forgetWrongRole(): void {
  pending = false;
}
