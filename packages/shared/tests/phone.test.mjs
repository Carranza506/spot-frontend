// Unit tests for the phone helpers: `pnpm --filter @spot/shared test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  PHONE_INVALID_MESSAGE,
  formatPhone,
  splitPhone,
  toE164,
  validatePhone,
} from '../src/phone/index.ts';

test('PHONE_COUNTRIES: Costa Rica first, each with its dial code', () => {
  assert.equal(PHONE_COUNTRIES[0].code, DEFAULT_PHONE_COUNTRY);
  assert.equal(PHONE_COUNTRIES[0].dialCode, '+506');
  assert.equal(PHONE_COUNTRIES.find((c) => c.code === 'MX').dialCode, '+52');
});

test('validatePhone: valid numbers for the selected country', () => {
  assert.equal(validatePhone('8888-1234', 'CR'), null);
  assert.equal(validatePhone('2260 1000', 'CR'), null);
  assert.equal(validatePhone('55 1234 5678', 'MX'), null);
  assert.equal(validatePhone('(202) 555-0143', 'US'), null);
});

test('validatePhone: blank is fine, since phones are optional', () => {
  assert.equal(validatePhone('', 'CR'), null);
  assert.equal(validatePhone('   ', 'CR'), null);
});

test('validatePhone: letters, wrong length or another country are rejected', () => {
  assert.equal(validatePhone('abc', 'CR'), PHONE_INVALID_MESSAGE);
  assert.equal(validatePhone('8888-123', 'CR'), PHONE_INVALID_MESSAGE);
  assert.equal(validatePhone('1234-5678', 'CR'), PHONE_INVALID_MESSAGE);
  assert.equal(validatePhone('8888-1234', 'MX'), PHONE_INVALID_MESSAGE);
  assert.equal(validatePhone('+52 55 1234 5678', 'CR'), PHONE_INVALID_MESSAGE);
});

test('toE164: the number with its country code, or null', () => {
  assert.equal(toE164('8888-1234', 'CR'), '+50688881234');
  assert.equal(toE164('55 1234 5678', 'MX'), '+525512345678');
  assert.equal(toE164('', 'CR'), null);
  assert.equal(toE164('abc', 'CR'), null);
});

test('splitPhone: a stored number back into country and number', () => {
  assert.deepEqual(splitPhone('+50688881234'), { country: 'CR', national: '8888 1234' });
  assert.deepEqual(splitPhone('+525512345678'), { country: 'MX', national: '55 1234 5678' });
  // Old free-text values are kept, so editing doesn't lose them.
  assert.deepEqual(splitPhone('2222-3344'), { country: 'CR', national: '2222-3344' });
  assert.deepEqual(splitPhone(null), { country: 'CR', national: '' });
});

test('formatPhone: international format for display', () => {
  assert.equal(formatPhone('+50688881234'), '+506 8888 1234');
  assert.equal(formatPhone('lo que sea'), 'lo que sea');
});
