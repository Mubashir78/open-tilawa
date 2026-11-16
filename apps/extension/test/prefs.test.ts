import { describe, expect, test } from 'vitest';

import { DEFAULTS, parsePrefs } from '../src/lib/prefs';

describe('parsePrefs', () => {
  test('nothing stored is the defaults: both lists open, name ascending, no filter', () => {
    expect(parsePrefs(undefined)).toEqual(DEFAULTS);
    expect(parsePrefs(null)).toEqual(DEFAULTS);
  });

  test('a closed accordion survives a round trip', () => {
    expect(parsePrefs({ mineOpen: false, rosterOpen: false })).toMatchObject({
      mineOpen: false,
      rosterOpen: false,
    });
  });

  test('a bad sort key falls back to the default rather than an unorderable list', () => {
    expect(parsePrefs({ sort: { key: 'colour' } }).sort).toEqual(DEFAULTS.sort);
    expect(parsePrefs({ sort: { key: 'size', dir: 'sideways' } }).sort).toEqual({ key: 'size', dir: 'asc' });
  });

  test('riwayat are a list of strings, and anything else is no filter', () => {
    expect(parsePrefs({ riwayat: ['Hafs', 'Warsh'] }).riwayat).toEqual(['Hafs', 'Warsh']);
    expect(parsePrefs({ riwayat: 'Hafs' }).riwayat).toEqual([]);
    expect(parsePrefs({ riwayat: [1, null] }).riwayat).toEqual([]);
  });

  test('a non-boolean open flag is not trusted', () => {
    expect(parsePrefs({ mineOpen: 'no' }).mineOpen).toBe(true);
  });
});
