/**
 * Design tokens shared by every platform UI. Values sampled directly from the
 * business login mockup screenshot (dark green left panel, amber pin dot,
 * teal button/links).
 */
export const color = {
  panelDark: '#152a26',
  onPanelDark: '#ffffff',
  onPanelDarkMuted: '#d0d4d4',
  accentAmber: '#e9a619',
  accentTeal: '#3f9488',
  accentTealHover: '#357e74',
  surface: '#ffffff',
  surfaceMuted: '#f5f6f4',
  textPrimary: '#152a26',
  textSecondary: '#6e7b77',
  placeholder: '#9ea8a4',
  border: '#e6e5e0',
  danger: '#d1453b',
} as const;

export const radius = {
  sm: '8px',
  md: '14px',
  lg: '20px',
  pill: '999px',
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '72px',
} as const;

export const fontSize = {
  xs: '13px',
  sm: '14px',
  md: '16px',
  lg: '22px',
  xl: '28px',
  xxl: '34px',
} as const;

export const theme = { color, radius, spacing, fontSize } as const;

/**
 * Flattens the token groups into CSS custom property entries (e.g.
 * `--color-accentTeal`), so a DOM-capable platform (web) can apply them to
 * its root style without this package importing the DOM itself.
 */
export function themeToCssVariables(source: typeof theme = theme): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const [group, values] of Object.entries(source)) {
    for (const [key, value] of Object.entries(values)) {
      variables[`--${group}-${key}`] = value as string;
    }
  }
  return variables;
}
