import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { color, type components } from '@spot/shared';

type Business = components['schemas']['Business'];

const DOUBLE_TAP_MS = 600;

/**
 * The part of a business card that opens its detail screen: the avatar, name and description. The
 * favorite heart stays a sibling control instead of a button nested inside a link.
 */
export function BusinessLinkArea({ business }: { business: Business }) {
  const lastPressAt = useRef(0);

  function open() {
    // A quick double tap would stack the screen twice, and "Volver" would land on the same business.
    const now = Date.now();
    if (now - lastPressAt.current < DOUBLE_TAP_MS) return;
    lastPressAt.current = now;
    router.push({ pathname: '/business/[businessId]', params: { businessId: business.id } });
  }

  return (
    <Pressable
      onPress={open}
      // "button", not "link": on web a link role is left to the browser, which only activates a real
      // <a>, so Enter would do nothing on this div.
      accessibilityRole="button"
      accessibilityLabel={`Ver ${business.name}`}
      style={({ pressed }) => [styles.area, pressed && styles.pressed]}
    >
      <View style={styles.avatar}>
        {/* Array.from keeps an emoji or other surrogate pair whole; charAt would cut it in half. */}
        <Text style={styles.avatarText}>{(Array.from(business.name.trim())[0] ?? '?').toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {business.name}
        </Text>
        {/* A ternary, not `&&`: an empty string would render as a bare text node, which crashes on native. */}
        {business.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {business.description}
          </Text>
        ) : null}
      </View>
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: color.panelDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: color.onPanelDark,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: color.textPrimary,
  },
  description: {
    fontSize: 14,
    color: color.textSecondary,
  },
});
