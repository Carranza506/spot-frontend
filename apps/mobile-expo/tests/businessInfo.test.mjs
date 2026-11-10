// Unit tests for the business detail's hours and contact helpers: `pnpm --filter mobile-expo test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { phoneUrl, weekSchedule, whatsappUrl } from '../src/components/business/businessInfo.ts';

const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];

test('weekSchedule: one row per day, in the given order, with its hours', () => {
  const rows = weekSchedule(
    [
      { dayOfWeek: 0, isClosed: true, openTime: null, closeTime: null },
      { dayOfWeek: 1, isClosed: false, openTime: '08:00:00', closeTime: '18:00:00' },
    ],
    MONDAY_FIRST,
  );
  assert.deepEqual(rows.map((r) => r.dayOfWeek), MONDAY_FIRST);
  assert.deepEqual(rows[0], { dayOfWeek: 1, openTime: '08:00:00', closeTime: '18:00:00' });
});

test('weekSchedule: a day without a row, marked closed or missing a time is closed', () => {
  const rows = weekSchedule(
    [
      { dayOfWeek: 0, isClosed: true, openTime: '08:00:00', closeTime: '12:00:00' },
      { dayOfWeek: 2, isClosed: false, openTime: '08:00:00', closeTime: null },
    ],
    MONDAY_FIRST,
  );
  for (const day of rows) assert.deepEqual([day.openTime, day.closeTime], [null, null]);
});

test('phoneUrl: keeps the + and the main number only', () => {
  assert.equal(phoneUrl('+506 8888 1234 ext. 5'), 'tel:+50688881234');
  assert.equal(phoneUrl('2222-3333'), 'tel:22223333');
  assert.equal(phoneUrl('sin número'), null);
});

test('whatsappUrl: adds 506 to a local Costa Rican number', () => {
  assert.equal(whatsappUrl('8888-1234'), 'https://wa.me/50688881234');
  assert.equal(whatsappUrl('+506 8888 1234'), 'https://wa.me/50688881234');
  assert.equal(whatsappUrl('+1 (555) 010-9999'), 'https://wa.me/15550109999');
  assert.equal(whatsappUrl('@barberia'), null);
});
