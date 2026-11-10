import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { onSessionCleared } from '@/api/session-events';
import { ToastProvider } from '@/components/Toast';
import { FavoritesProvider } from '@/favorites/FavoritesProvider';
import { resetTo } from '@/navigation/resetTo';

/** A logout, or a refresh that failed, ends the session wherever the user is: back to the login screen. */
function SessionGuard() {
  useEffect(() => onSessionCleared(() => resetTo('/')), []);
  return null;
}

export default function RootLayout() {
  return (
    <FavoritesProvider>
      <ToastProvider>
        <SessionGuard />
        {/* A Stack, not a Slot: previous screens stay mounted, so going back keeps a search and its results. */}
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="auto" />
      </ToastProvider>
    </FavoritesProvider>
  );
}
