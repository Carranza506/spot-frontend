import { useEffect, useState, type ComponentType } from 'react';
import { useLocalSearchParams, useSegments, type Href } from 'expo-router';
import { getTokens } from '@/api/auth-storage';
import { resetTo } from '@/navigation/resetTo';
import { rememberReturnTo, routeHref } from './returnTo';

type StoredSession = 'checking' | 'signed-in' | 'signed-out';

/** Whether a session is stored, read once when the screen opens. Storage that can't be read counts as none. */
function useStoredSession(): StoredSession {
  const [session, setSession] = useState<StoredSession>('checking');
  useEffect(() => {
    let ignore = false;
    getTokens()
      .catch(() => null)
      .then((tokens) => !ignore && setSession(tokens ? 'signed-in' : 'signed-out'));
    return () => {
      ignore = true;
    };
  }, []);
  return session;
}

/** Sends the user to the login screen and brings them back to `href` once they sign in or register. */
export function sendToLogin(href: Href): void {
  rememberReturnTo(href);
  resetTo('/');
}

/**
 * Wraps a screen that needs a session. Without one, the screen is never rendered: the user goes to
 * the login screen and comes back here, with the same params, after signing in. A session that ends
 * while the screen is open is still handled by SessionGuard (`app/_layout.tsx`).
 */
export function requireSession<P extends object>(Screen: ComponentType<P>): ComponentType<P> {
  function SessionRequired(props: P) {
    const session = useStoredSession();
    const segments = useSegments();
    const params = useLocalSearchParams();

    useEffect(() => {
      if (session === 'signed-out') sendToLogin(routeHref(segments, params));
      // Only when the check finishes: the route it captures is the one the screen was opened at.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    return session === 'signed-in' ? <Screen {...props} /> : null;
  }
  SessionRequired.displayName = `RequireSession(${Screen.displayName ?? Screen.name})`;
  return SessionRequired;
}

/** Wraps the login and register screens: with a session already stored, the user goes straight to /home. */
export function guestOnly<P extends object>(Screen: ComponentType<P>): ComponentType<P> {
  function GuestOnly(props: P) {
    const session = useStoredSession();

    useEffect(() => {
      if (session === 'signed-in') resetTo('/home');
    }, [session]);

    return session === 'signed-out' ? <Screen {...props} /> : null;
  }
  GuestOnly.displayName = `GuestOnly(${Screen.displayName ?? Screen.name})`;
  return GuestOnly;
}
