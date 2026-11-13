// Unit tests for the home's "Tu próxima cita": `pnpm --filter mobile-expo test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { soonestUpcoming } from '../src/bookings/upcoming.ts';

const NOW = Date.parse('2026-11-12T18:00:00Z');
const booking = (id, startAt, status = 'CONFIRMED') => ({ id, startAt, status });

test('soonestUpcoming: the earliest future booking, whatever the order it came in', () => {
  const list = [
    booking('later', '2026-11-20T15:00:00Z'),
    booking('soonest', '2026-11-13T14:00:00Z', 'PENDING'),
    booking('middle', '2026-11-15T14:00:00Z'),
  ];
  assert.equal(soonestUpcoming(list, NOW).id, 'soonest');
});

test('soonestUpcoming: skips bookings that already started, and cancelled or finished ones', () => {
  const list = [
    booking('started', '2026-11-12T17:30:00Z'),
    booking('cancelled', '2026-11-13T09:00:00Z', 'CANCELLED'),
    booking('completed', '2026-11-13T10:00:00Z', 'COMPLETED'),
    booking('next', '2026-11-14T10:00:00Z'),
  ];
  assert.equal(soonestUpcoming(list, NOW).id, 'next');
});

test('soonestUpcoming: compares instants, not strings with different offsets', () => {
  const list = [booking('a', '2026-11-13T10:00:00-06:00'), booking('b', '2026-11-13T15:30:00Z')];
  assert.equal(soonestUpcoming(list, NOW).id, 'b');
});

test('soonestUpcoming: null when there is nothing ahead', () => {
  assert.equal(soonestUpcoming([], NOW), null);
  assert.equal(soonestUpcoming([booking('past', '2026-11-01T10:00:00Z')], NOW), null);
});
