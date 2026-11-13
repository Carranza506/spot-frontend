/**
 * Design tokens shared by every platform UI: the "marino y girasol" identity (#101). The names
 * predate it and stay, so callers don't change: `accentTeal` is the navy of actions and links,
 * `accentAmber` the sunflower that marks a time slot, `panelDark` the ink of panels and text.
 */
export const color = {
  panelDark: '#0f2438',
  onPanelDark: '#ffffff',
  onPanelDarkMuted: '#c9d4e0',
  accentAmber: '#ffc83d',
  accentTeal: '#12395e',
  accentTealHover: '#0c2a47',
  surface: '#ffffff',
  surfaceMuted: '#eef2f6',
  background: '#f2f5f8',
  textPrimary: '#0f2438',
  textSecondary: '#56677a',
  placeholder: '#8a97a6',
  border: '#dce3ea',
  danger: '#d1453b',
  /** Filled danger buttons: `danger` is for text, and too loud as a large surface. */
  dangerSolid: '#a9483f',
  onPanelDarkInactive: '#a9b7c6',
  success: '#35803a',
  successBg: '#e1fce6',
  warningText: '#8a5a00',
  warningBg: '#fff6d9',
} as const;

export const radius = {
  sm: '8px',
  md: '12px',
  lg: '18px',
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
