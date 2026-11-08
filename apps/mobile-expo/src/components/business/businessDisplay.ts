// Pure helpers behind every business card (no React / React Native imports), so they can be unit
// tested with `node --test` (see tests/businessDisplay.test.mjs).

/** Light teal used behind icons and as the first banner tint. */
export const TEAL_TINT = '#e1efec';

// Soft banner tints, picked per business so a grid isn't one flat color. All keep the dark
// initial readable (contrast well above 4.5:1 against panelDark).
export const BANNER_TINTS = [TEAL_TINT, '#f8eed6', '#e9ece6', '#e4ece9', '#f1e9e1'];

/** Taps on the same card closer than this are one tap (avoids stacking the detail screen twice). */
export const DOUBLE_TAP_MS = 600;

/**
 * The letter shown when a business has no (valid) logo. Array.from keeps an emoji or other
 * surrogate pair whole; charAt would cut it in half.
 */
export function businessInitial(name: string): string {
  return (Array.from(name.trim())[0] ?? '?').toUpperCase();
}

/** A stable banner tint for a business: the same id always gets the same color. */
export function bannerTintFor(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return BANNER_TINTS[Math.abs(hash) % BANNER_TINTS.length];
}

/**
 * Returns a function that says whether a tap at `now` (ms) should go through: the first one does,
 * any other within `windowMs` of the last accepted tap doesn't.
 */
export function createTapGuard(windowMs: number = DOUBLE_TAP_MS): (now: number) => boolean {
  let lastAcceptedAt = Number.NEGATIVE_INFINITY;
  return (now: number) => {
    if (now - lastAcceptedAt < windowMs) return false;
    lastAcceptedAt = now;
    return true;
  };
}
