// Unit tests for where the app goes after signing in: `pnpm --filter mobile-expo test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rememberReturnTo, routeHref, takeReturnTo } from '../src/auth/returnTo.ts';

test('routeHref: keeps the route pattern and every param, so the query comes back too', () => {
  assert.deepEqual(routeHref(['book', '[businessId]'], { businessId: 'b-1', serviceId: 's-2' }), {
    pathname: '/book/[businessId]',
    params: { businessId: 'b-1', serviceId: 's-2' },
  });
});

test('routeHref: a screen without params', () => {
  assert.deepEqual(routeHref(['home'], {}), { pathname: '/home', params: {} });
});

test('routeHref: groups are not part of the URL and undefined params are dropped', () => {
  assert.deepEqual(routeHref(['(tabs)', 'bookings'], { filter: undefined, page: ['1', '2'] }), {
    pathname: '/bookings',
    params: { page: ['1', '2'] },
  });
});

test('takeReturnTo: null when nothing was remembered', () => {
  takeReturnTo();
  assert.equal(takeReturnTo(), null);
});

test('takeReturnTo: gives the remembered route once, then forgets it', () => {
  rememberReturnTo('/favorites');
  assert.equal(takeReturnTo(), '/favorites');
  assert.equal(takeReturnTo(), null);
});

test('rememberReturnTo: the latest screen wins', () => {
  rememberReturnTo('/favorites');
  rememberReturnTo({ pathname: '/book/[businessId]', params: { businessId: 'b-1', serviceId: 's-2' } });
  assert.deepEqual(takeReturnTo(), { pathname: '/book/[businessId]', params: { businessId: 'b-1', serviceId: 's-2' } });
});
