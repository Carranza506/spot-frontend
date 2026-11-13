import { Children, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

interface ActionButtonsProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** A row of equally sized buttons: the secondary one first, then the main one. */
export function ActionButtons({ children, style }: ActionButtonsProps) {
  return (
    <View style={[styles.row, style]}>
      {Children.toArray(children).map((button, index) => (
        <View key={index} style={styles.button}>
          {button}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  // Side by side; on a very narrow screen they stack instead of cutting a label.
  button: {
    flexGrow: 1,
    flexBasis: 120,
  },
});
