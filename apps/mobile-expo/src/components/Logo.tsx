import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { color } from '@spot/shared';

/** Same mark as apps/web's logo: a rounded square with the sunflower dot (#101). */
export function Logo() {
  return (
    <View style={styles.row}>
      <Svg viewBox="0 0 24 24" width={32} height={32} fill="none">
        {/* Always on the dark panel, where a navy square would vanish. */}
        <Rect x={2} y={2} width={20} height={20} rx={6} fill="rgba(255, 255, 255, 0.16)" />
        <Circle cx={16.5} cy={16.5} r={3} fill={color.accentAmber} />
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
