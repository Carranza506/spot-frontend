import type { Href } from 'expo-router';

/**
 * Where to go after signing in, kept outside the login screen for the same reason as `wrongRole.ts`:
 * the login screen remounts on its way there (a cleared session, the link to register and back), and
 * component state would be lost with it.
 */
let pending: Href | null = null;

export type RouteParams = Record<string, string | string[] | undefined>;

/**
 * The route a screen was opened at, as a pattern plus its params (`/book/[businessId]` with
 * `businessId` and `serviceId`), so the router rebuilds the same URL, query included. Groups like
 * `(tabs)` aren't part of the URL, so they are left out.
 */
export function routeHref(segments: readonly string[], params: RouteParams): Href {
  const pathname = '/' + segments.filter((segment) => !/^\(.*\)$/.test(segment)).join('/');
  const definedParams: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) definedParams[key] = value;
  }
  return { pathname, params: definedParams } as Href;
}

/** A screen that needs a session was opened without one: come back to it after signing in. */
export function rememberReturnTo(href: Href): void {
  pending = href;
}

/** Where the account that just signed in has to go, or null to use the default. */
export function takeReturnTo(): Href | null {
  const href = pending;
  pending = null;
  return href;
}
