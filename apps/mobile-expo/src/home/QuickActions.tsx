import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { color } from '@spot/shared';
import { BellIcon, CalendarIcon, HeartIcon } from '@/components/icons';

interface QuickAction {
  label: string;
  href: Href;
  icon: ReactNode;
  badge?: number;
}

/** Shortcuts to the user's other sections, one tap away from the home screen. */
export function QuickActions({ unreadNotifications }: { unreadNotifications: number }) {
  const actions: QuickAction[] = [
    { label: 'Favoritos', href: '/favorites', icon: <HeartIcon color={color.accentTeal} /> },
    { label: 'Reservas', href: '/bookings', icon: <CalendarIcon color={color.accentTeal} /> },
    {
      label: 'Notificaciones',
      href: '/notifications',
      icon: <BellIcon color={color.accentTeal} />,
      badge: unreadNotifications,
    },
  ];

  return (
    <View style={styles.row}>
      {actions.map((action) => (
        <Pressable
          key={action.label}
          onPress={() => router.push(action.href)}
          accessibilityRole="button"
          accessibilityLabel={
            action.badge ? `${action.label}, ${action.badge} sin leer` : action.label
          }
          style={({ pressed, hovered }) => [styles.tile, hovered && styles.hovered, pressed && styles.pressed]}
        >
          <View style={styles.iconWrap}>
            {action.icon}
            {action.badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{action.badge > 99 ? '99+' : action.badge}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 18,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  hovered: {
    backgroundColor: color.surfaceMuted,
  },
  pressed: {
    opacity: 0.7,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#e1efec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: color.danger,
    borderWidth: 2,
    borderColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: color.onPanelDark,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: color.textPrimary,
  },
});
