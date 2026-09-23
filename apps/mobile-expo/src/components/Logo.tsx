import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { color } from '@spot/shared';

/** Same pin mark as apps/web's AuthLayout logo (white outline, amber dot). */
export function Logo() {
  return (
    <View style={styles.row}>
      <Svg viewBox="0 0 24 24" width={32} height={32} fill="none">
        <Path
          d="M12 2C7.58 2 4 5.58 4 10c0 5.25 6.72 11.19 7.01 11.44a1.5 1.5 0 0 0 1.98 0C13.28 21.19 20 15.25 20 10c0-4.42-3.58-8-8-8Z"
          stroke={color.onPanelDark}
          strokeWidth={1.6}
        />
        <Circle cx={12} cy={10} r={2.6} fill={color.accentAmber} />
      </Svg>
      <Text style={styles.text}>Spot</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  text: {
    fontSize: 26,
    fontWeight: '800',
    color: color.onPanelDark,
  },
});
