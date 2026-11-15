import { describe, expect, test } from 'vitest';

import { badgeFor, formatBytes, type HeldState } from '../src/lib/badge';

const state = (over: Partial<HeldState> = {}): HeldState => ({
  infohash: 'a'.repeat(40),
  state: 'seeding',
  peers: 3,
  progress: 1,
  uploadedToday: 812e6,
  ...over,
});

describe('formatBytes', () => {
  test('reads in SI units with one decimal for GB and whole MB', () => {
    expect(formatBytes(812e6)).toBe('812 MB');
    expect(formatBytes(1.3e9)).toBe('1.3 GB');
    expect(formatBytes(0)).toBe('0 MB');
  });
});

describe('badgeFor', () => {
  test('the badge never carries text', () => {
    const badge = badgeFor([state()], null);

    expect(badge.text).toBe('');
    expect(badge.color).toBe('green');
    expect(badge.title).toBe('Seeding 1 reciter · 3 peers · 812 MB uploaded today');
  });

  test('one failure turns the badge red even while another reciter seeds', () => {
    expect(badgeFor([state(), state({ infohash: 'b'.repeat(40), state: 'error', peers: 0 })], null).color).toBe('red');
  });

  test('an empty roster is grey', () => {
    const badge = badgeFor([], null);

    expect(badge.color).toBe('grey');
    expect(badge.text).toBe('');
  });

  test('downloading is blue and outranks seeding, but not an error', () => {
    expect(badgeFor([state({ state: 'downloading', progress: 0.4 })], null).color).toBe('blue');
    expect(
      badgeFor([state({ state: 'downloading' }), state({ infohash: 'c'.repeat(40), state: 'error' })], null).color,
    ).toBe('red');
  });

  test('paused-only is grey and the title explains the pause', () => {
    const badge = badgeFor([state({ state: 'paused', peers: 0 })], 'battery');

    expect(badge.color).toBe('grey');
    expect(badge.title).toContain('battery');
  });

  test('the plural is right for two reciters', () => {
    expect(badgeFor([state(), state({ infohash: 'd'.repeat(40) })], null).title).toMatch(/^Seeding 2 reciters/);
  });
});
