// Unit tests for the pure business-card helpers. Node runs the .ts module directly (type stripping),
// so no test framework is needed: `pnpm --filter mobile-expo test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BANNER_TINTS,
  DOUBLE_TAP_MS,
  TEAL_TINT,
  bannerTintFor,
  businessInitial,
  createTapGuard,
} from '../src/components/business/businessDisplay.ts';

test('businessInitial: first letter, uppercased', () => {
  assert.equal(businessInitial('barbería el roble'), 'B');
  assert.equal(businessInitial('Salón Bella'), 'S');
});

test('businessInitial: ignores leading/trailing spaces', () => {
  assert.equal(businessInitial('   negocio  '), 'N');
});

test('businessInitial: keeps an emoji whole instead of half a surrogate pair', () => {
  assert.equal(businessInitial('💈 Barber Shop'), '💈');
});

test('businessInitial: falls back to "?" for an empty or blank name', () => {
  assert.equal(businessInitial(''), '?');
  assert.equal(businessInitial('    '), '?');
});

test('businessInitial: accented first letter is uppercased', () => {
  assert.equal(businessInitial('éxito spa'), 'É');
});

test('bannerTintFor: always returns one of the banner tints', () => {
  const ids = ['37672ab3-fcfa-49e8-8ef1-bfb9af1f59bf', 'a', '', 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'];
  for (const id of ids) assert.ok(BANNER_TINTS.includes(bannerTintFor(id)), id);
});

test('bannerTintFor: same id, same tint (stable across renders)', () => {
  const id = '1b2c3d4e-5f60-4a1b-8c2d-9e0f1a2b3c4d';
  assert.equal(bannerTintFor(id), bannerTintFor(id));
});

test('bannerTintFor: spreads different ids over more than one tint', () => {
  const tints = new Set(Array.from({ length: 50 }, (_, i) => bannerTintFor(`business-${i}`)));
  assert.ok(tints.size > 1);
});

test('TEAL_TINT is the first banner tint (one definition for both uses)', () => {
  assert.equal(BANNER_TINTS[0], TEAL_TINT);
});

test('createTapGuard: first tap goes through', () => {
  const guard = createTapGuard(600);
  assert.equal(guard(1_000), true);
});

test('createTapGuard: a second tap inside the window is ignored', () => {
  const guard = createTapGuard(600);
  guard(1_000);
  assert.equal(guard(1_300), false);
  assert.equal(guard(1_599), false);
});

test('createTapGuard: a tap once the window has passed goes through again', () => {
  const guard = createTapGuard(600);
  guard(1_000);
  assert.equal(guard(1_600), true);
});

test('createTapGuard: ignored taps do not extend the window', () => {
  const guard = createTapGuard(600);
  guard(1_000);
  guard(1_500); // ignored
  assert.equal(guard(1_650), true);
});

test('createTapGuard: works from time 0 and defaults to DOUBLE_TAP_MS', () => {
  const guard = createTapGuard();
  assert.equal(guard(0), true);
  assert.equal(guard(DOUBLE_TAP_MS - 1), false);
  assert.equal(guard(DOUBLE_TAP_MS), true);
});

test('createTapGuard: each card gets its own guard', () => {
  const first = createTapGuard(600);
  const second = createTapGuard(600);
  first(1_000);
  assert.equal(second(1_100), true);
});
