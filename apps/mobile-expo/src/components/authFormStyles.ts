import { StyleSheet } from 'react-native';
import { color } from '@spot/shared';

/** Shared title/error/footer styles for the login and register cards. */
export const authFormStyles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: color.textPrimary,
    marginBottom: 22,
  },
  generalError: {
    fontSize: 14,
    color: color.danger,
    marginBottom: 16,
  },
  footerRow: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 14,
    color: color.textSecondary,
  },
  footerLink: {
    color: color.accentTeal,
    fontWeight: '700',
  },
});
