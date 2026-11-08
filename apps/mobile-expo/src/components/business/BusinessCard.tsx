import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, type components } from '@spot/shared';
import { ChevronRightIcon } from '@/components/icons';
import { FavoriteButton } from '@/favorites/FavoriteButton';
import { BusinessAvatar } from './BusinessAvatar';
import { bannerTintFor } from './businessDisplay';
import { useOpenBusiness } from './useOpenBusiness';

type Business = components['schemas']['Business'];

const AVATAR_SIZE = 56;

/**
 * A business on the home grid: banner with its logo (or initial), name and description. The whole
 * card opens the detail screen; the heart is a sibling control, not a button nested inside it.
 */
export function BusinessCard({ business }: { business: Business }) {
  const open = useOpenBusiness(business.id);

  return (
    <View style={styles.card}>
      <Pressable
        onPress={open}
        // "button", not "link": on web a link role is left to the browser, which only activates a real <a>.
        accessibilityRole="button"
        accessibilityLabel={`Ver ${business.name}`}
        style={({ pressed, hovered }) => [styles.pressable, hovered && styles.hovered, pressed && styles.pressed]}
      >
        <View style={[styles.banner, { backgroundColor: bannerTintFor(business.id) }]}>
          <BusinessAvatar business={business} size={AVATAR_SIZE} shape="rounded" style={styles.avatar} />
        </View>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {business.name}
          </Text>
          <Text style={[styles.description, !business.description && styles.descriptionEmpty]} numberOfLines={2}>
            {business.description || 'Este negocio aún no agregó una descripción.'}
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
    borderWidth: 3,
    borderColor: color.surface,
    // Half of it hangs below the banner, over the card body.
    marginBottom: -AVATAR_SIZE / 2,
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
