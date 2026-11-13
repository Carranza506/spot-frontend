import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { color } from '@spot/shared';
import { CalendarIcon, HeartIcon, HomeIcon, UserIcon } from '@/components/icons';
import { font } from '@/theme/fonts';

/**
 * The client's four sections, one tap away from anywhere (#101). Groups don't change URLs, so
 * /home, /bookings, /favorites and /profile (and links and pushes to them) work as before.
 * Notificaciones is the bell on the home; booking and business details stack over the tabs.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.accentTeal,
        tabBarInactiveTintColor: color.textSecondary,
        tabBarStyle: {
          backgroundColor: color.surface,
          borderTopColor: color.border,
          // On a phone the safe area pads the bar; the web has none, and 48px leaves the labels cramped.
          ...(Platform.OS === 'web' ? { height: 60, paddingTop: 4, paddingBottom: 8 } : {}),
        },
        tabBarLabelStyle: { fontFamily: font.semibold },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Inicio', tabBarIcon: ({ color: tint }) => <HomeIcon color={tint} /> }} />
      <Tabs.Screen name="bookings" options={{ title: 'Reservas', tabBarIcon: ({ color: tint }) => <CalendarIcon color={tint} /> }} />
      <Tabs.Screen name="favorites" options={{ title: 'Favoritos', tabBarIcon: ({ color: tint }) => <HeartIcon color={tint} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: ({ color: tint }) => <UserIcon color={tint} /> }} />
    </Tabs>
  );
}
