// Pure helper (no React / React Native imports), unit tested in tests/googleMaps.test.mjs.

/** What Google Maps searches when the user gave nothing more specific. */
export const DEFAULT_MAPS_TERM = 'negocios';

/** Map zoom that roughly fits the "Cerca de mí" radius around the user. */
function zoomFor(radiusKm: number): number {
  if (radiusKm <= 5) return 13;
  if (radiusKm <= 10) return 12;
  return 11;
}

/**
 * A Google Maps search for `term` centered on the user's location, so Maps lists the businesses
 * Spot doesn't have (#71). The first non-blank of `terms` is used: what the user typed, the
 * category, the AI's understood service, then DEFAULT_MAPS_TERM. Opens the Maps app on a device.
 */
export function googleMapsSearchUrl(
  terms: readonly (string | null | undefined)[],
  location: { latitude: number; longitude: number },
  radiusKm: number,
): string {
  const term = terms.map((t) => t?.trim()).find((t) => !!t) ?? DEFAULT_MAPS_TERM;
  const lat = location.latitude.toFixed(6);
  const lng = location.longitude.toFixed(6);
  return `https://www.google.com/maps/search/${encodeURIComponent(term)}/@${lat},${lng},${zoomFor(radiusKm)}z`;
}
