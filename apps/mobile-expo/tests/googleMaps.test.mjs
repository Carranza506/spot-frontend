// Unit tests for the "Buscar en Google Maps" link of "Cerca de mí" (#71).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_MAPS_TERM, googleMapsSearchUrl } from '../src/search/googleMaps.ts';

const HEREDIA = { latitude: 9.9981, longitude: -84.1165 };

test('googleMapsSearchUrl: searches the term centered on the location', () => {
  assert.equal(
    googleMapsSearchUrl(['barbería'], HEREDIA, 5),
    'https://www.google.com/maps/search/barber%C3%ADa/@9.998100,-84.116500,13z',
  );
});

test('googleMapsSearchUrl: uses the first non-blank term', () => {
  assert.match(googleMapsSearchUrl(['  ', undefined, null, 'Belleza', 'masaje'], HEREDIA, 10), /\/search\/Belleza\//);
});

test('googleMapsSearchUrl: falls back to the default term', () => {
  assert.match(googleMapsSearchUrl([' ', null], HEREDIA, 10), new RegExp(`/search/${DEFAULT_MAPS_TERM}/`));
  assert.match(googleMapsSearchUrl([], HEREDIA, 10), new RegExp(`/search/${DEFAULT_MAPS_TERM}/`));
});

test('googleMapsSearchUrl: encodes the term so it cannot break the path', () => {
  assert.match(googleMapsSearchUrl(['corte & barba/uñas?'], HEREDIA, 5), /\/search\/corte%20%26%20barba%2Fu%C3%B1as%3F\/@/);
});

test('googleMapsSearchUrl: zoom follows the radius (wider radius, farther out)', () => {
  assert.match(googleMapsSearchUrl(['x'], HEREDIA, 5), /,13z$/);
  assert.match(googleMapsSearchUrl(['x'], HEREDIA, 10), /,12z$/);
  assert.match(googleMapsSearchUrl(['x'], HEREDIA, 25), /,11z$/);
});
