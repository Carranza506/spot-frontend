import { logout } from '@spot/shared';
import { authClient } from '@/api/client';
import { resetTo } from '@/navigation/resetTo';
import { unregisterPush } from '@/notifications/push';

const PUSH_WAIT_MS = 3000;

/**
 * Ends the session on this device and goes to the login: "Salir", and after a password change (which
 * already revoked the refresh token, so the logout call may fail; the tokens are cleared either way).
 */
export async function signOut(resetFavorites: () => void): Promise<void> {
  try {
    // Best effort: a slow or unreachable notifications service must not keep the user signed in.
    await Promise.race([unregisterPush(), new Promise((resolve) => setTimeout(resolve, PUSH_WAIT_MS))]);
    await logout(authClient).catch(() => undefined);
  } finally {
    // The next account must not see this one's favorites.
    resetFavorites();
    resetTo('/');
  }
}
