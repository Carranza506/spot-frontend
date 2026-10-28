import { useEffect } from 'react';
import { Slot, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { onSessionCleared } from '@/api/session-events';
import { FavoritesProvider } from '@/favorites/FavoritesProvider';

/** A logout, or a refresh that failed, ends the session wherever the user is: back to the login screen. */
function SessionGuard() {
  useEffect(() => onSessionCleared(() => router.replace('/')), []);
  return null;
}

export default function RootLayout() {
  return (
    <FavoritesProvider>
      <SessionGuard />
      <Slot />
      <StatusBar style="auto" />
    </FavoritesProvider>
  );
}
