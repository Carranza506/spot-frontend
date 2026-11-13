import { Lexend_400Regular } from '@expo-google-fonts/lexend/400Regular';
import { Lexend_600SemiBold } from '@expo-google-fonts/lexend/600SemiBold';
import { Lexend_700Bold } from '@expo-google-fonts/lexend/700Bold';
import { Lexend_800ExtraBold } from '@expo-google-fonts/lexend/800ExtraBold';

/**
 * Lexend, the identity's typeface (#101), loaded at runtime so it also works in Expo Go. Each weight
 * is its own family: on Android a fontWeight over a loaded font falls back to the system one, so
 * styles set fontFamily to one of these instead of a fontWeight.
 */
export const font = {
  regular: 'Lexend_400Regular',
  semibold: 'Lexend_600SemiBold',
  bold: 'Lexend_700Bold',
  extrabold: 'Lexend_800ExtraBold',
} as const;

/** What the root layout hands to useFonts: each family name above, to its file. */
export const fontFiles = {
  [font.regular]: Lexend_400Regular,
  [font.semibold]: Lexend_600SemiBold,
  [font.bold]: Lexend_700Bold,
  [font.extrabold]: Lexend_800ExtraBold,
};
