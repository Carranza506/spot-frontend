import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

interface BusinessLinkAreaProps {
  businessId: string;
  businessName: string;
  children: ReactNode;
}

/**
 * The part of a business card that opens its detail screen. It wraps the avatar and text only, so
 * the favorite heart stays a sibling control instead of a button nested inside a link.
 */
export function BusinessLinkArea({ businessId, businessName, children }: BusinessLinkAreaProps) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/business/[businessId]', params: { businessId } })}
      accessibilityRole="link"
      accessibilityLabel={`Ver ${businessName}`}
      style={({ pressed }) => [styles.area, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  area: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  pressed: {
    opacity: 0.6,
  },
});
