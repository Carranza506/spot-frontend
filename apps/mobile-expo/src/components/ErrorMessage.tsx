import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { color } from '@spot/shared';

interface ErrorMessageProps {
  children: string;
  /** The margins around it, which depend on the screen. */
  style?: StyleProp<ViewStyle>;
}

/** An error that stays on screen until the user acts: same look as the web's general error. */
export function ErrorMessage({ children, style }: ErrorMessageProps) {
  return (
    <View style={[styles.box, style]}>
      <Text style={styles.text} role="alert" accessibilityLiveRegion="assertive">
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    // color.danger at 8%, as in the web.
    backgroundColor: 'rgba(209, 69, 59, 0.08)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  text: {
    fontSize: 14,
    color: color.danger,
  },
});
