import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, type components } from '@spot/shared';
import { BusinessAvatar } from './BusinessAvatar';
import { useOpenBusiness } from './useOpenBusiness';

type Business = components['schemas']['Business'];

/**
 * The part of a business row that opens its detail screen: the avatar, name and description. The
 * favorite heart stays a sibling control instead of a button nested inside a link.
 */
export function BusinessLinkArea({ business }: { business: Business }) {
  const open = useOpenBusiness(business.id);

  return (
    <Pressable
      onPress={open}
      // "button", not "link": on web a link role is left to the browser, which only activates a real
      // <a>, so Enter would do nothing on this div.
      accessibilityRole="button"
      accessibilityLabel={`Ver ${business.name}`}
      style={({ pressed }) => [styles.area, pressed && styles.pressed]}
    >
      <BusinessAvatar business={business} size={48} />
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
