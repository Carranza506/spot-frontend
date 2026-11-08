import { useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { color, type components } from '@spot/shared';
import { ChevronRightIcon } from '@/components/icons';
import { FavoriteButton } from '@/favorites/FavoriteButton';

type Business = components['schemas']['Business'];

const DOUBLE_TAP_MS = 600;

// Soft banner tints, picked per business so the grid isn't one flat color. All keep the dark
// initial readable (contrast well above 4.5:1 against panelDark).
const BANNER_TINTS = ['#e1efec', '#f8eed6', '#e9ece6', '#e4ece9', '#f1e9e1'];

function tintFor(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return BANNER_TINTS[Math.abs(hash) % BANNER_TINTS.length];
}

/**
 * A business on the home screen: banner with its logo (or initial), name and description. The whole
 * card opens the detail screen; the heart is a sibling control, not a button nested inside it.
 */
export function BusinessCard({ business }: { business: Business }) {
  const lastPressAt = useRef(0);
  // Array.from keeps an emoji or other surrogate pair whole; charAt would cut it in half.
  const initial = (Array.from(business.name.trim())[0] ?? '?').toUpperCase();

  function open() {
    // A quick double tap would stack the screen twice, and "Volver" would land on the same business.
    const now = Date.now();
    if (now - lastPressAt.current < DOUBLE_TAP_MS) return;
    lastPressAt.current = now;
    router.push({ pathname: '/business/[businessId]', params: { businessId: business.id } });
  }

  return (
    <View style={styles.card}>
      <Pressable
        onPress={open}
        // "button", not "link": on web a link role is left to the browser, which only activates a real <a>.
        accessibilityRole="button"
        accessibilityLabel={`Ver ${business.name}`}
        style={({ pressed, hovered }) => [styles.pressable, hovered && styles.hovered, pressed && styles.pressed]}
      >
        <View style={[styles.banner, { backgroundColor: tintFor(business.id) }]}>
          <View style={styles.avatar}>
            {business.logoUrl ? (
              <Image source={{ uri: business.logoUrl }} style={styles.logo} accessibilityIgnoresInvertColors />
            ) : (
              <Text style={styles.avatarText}>{initial}</Text>
            )}
          </View>
        </View>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {business.name}
          </Text>
          {/* A ternary, not `&&`: an empty string would render as a bare text node, which crashes on native. */}
          <Text style={[styles.description, !business.description && styles.descriptionEmpty]} numberOfLines={2}>
            {business.description ? business.description : 'Este negocio aún no agregó una descripción.'}
          </Text>
          <View style={styles.footer}>
            <Text style={styles.cta}>Ver negocio</Text>
            <ChevronRightIcon size={16} color={color.accentTeal} />
          </View>
        </View>
      </Pressable>
      <View style={styles.favorite}>
        <FavoriteButton business={business} size={22} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    overflow: 'hidden',
    // Soft lift (boxShadow works on web and native; the shadow* props are deprecated on web).
    boxShadow: '0px 4px 12px rgba(21, 42, 38, 0.06)',
  },
  pressable: {
    flex: 1,
  },
  hovered: {
    backgroundColor: color.surfaceMuted,
  },
  pressed: {
    opacity: 0.7,
  },
  banner: {
    height: 84,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: color.panelDark,
    borderWidth: 3,
    borderColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // Half of it hangs below the banner, over the card body.
    marginBottom: -28,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: color.onPanelDark,
  },
  body: {
    paddingTop: 36,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 6,
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: color.textPrimary,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: color.textSecondary,
    minHeight: 40,
  },
  descriptionEmpty: {
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  cta: {
    fontSize: 14,
    fontWeight: '700',
    color: color.accentTeal,
  },
  favorite: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
});
