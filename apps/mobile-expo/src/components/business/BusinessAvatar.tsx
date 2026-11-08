import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { color, validateHttpUrl, type components } from '@spot/shared';
import { businessInitial } from './businessDisplay';

type Business = components['schemas']['Business'];

interface BusinessAvatarProps {
  business: Pick<Business, 'name' | 'logoUrl'>;
  size: number;
  /** 'circle' for list rows, 'rounded' (squircle) for the home grid cards. */
  shape?: 'circle' | 'rounded';
  style?: ViewStyle;
}

/**
 * The business's logo, or its initial when there's none. Business-provided data: like
 * BusinessHeader, the logo only renders when it's a real http(s) URL.
 */
export function BusinessAvatar({ business, size, shape = 'circle', style }: BusinessAvatarProps) {
  const logo = business.logoUrl && validateHttpUrl(business.logoUrl) === null ? business.logoUrl : null;
  const borderRadius = shape === 'circle' ? size / 2 : Math.round(size * 0.32);

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius }, style]}>
      {logo ? (
        <Image source={{ uri: logo }} style={styles.logo} accessibilityIgnoresInvertColors />
      ) : (
        <Text style={[styles.initial, { fontSize: Math.round(size * 0.4) }]}>{businessInitial(business.name)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: color.panelDark,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  initial: {
    fontWeight: '800',
    color: color.onPanelDark,
  },
});
