import { useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

const DOUBLE_TAP_MS = 600;

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
  const lastPressAt = useRef(0);

  function open() {
    // A quick double tap would stack the screen twice, and "Volver" would land on the same business.
    const now = Date.now();
    if (now - lastPressAt.current < DOUBLE_TAP_MS) return;
    lastPressAt.current = now;
    router.push({ pathname: '/business/[businessId]', params: { businessId } });
  }

  return (
    <Pressable
      onPress={open}
      // "button", not "link": on web a link role is left to the browser, which only activates a real
      // <a>, so Enter would do nothing on this div.
      accessibilityRole="button"
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
