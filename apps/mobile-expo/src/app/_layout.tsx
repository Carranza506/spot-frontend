import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FavoritesProvider } from '@/favorites/FavoritesProvider';

export default function RootLayout() {
  return (
    <FavoritesProvider>
      <Slot />
      <StatusBar style="auto" />
    </FavoritesProvider>
  );
}
