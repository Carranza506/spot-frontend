import { StyleSheet } from 'react-native';
import { color } from '@spot/shared';
import { font } from '@/theme/fonts';

/** Shared title/error/footer styles for the login and register cards. */
export const authFormStyles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontFamily: font.bold,
    color: color.textPrimary,
    marginBottom: 22,
  },
  generalError: {
    marginBottom: 16,
  },
  footerRow: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: font.regular,
    color: color.textSecondary,
  },
  footerLink: {
    color: color.accentTeal,
    fontFamily: font.bold,
  },
});
