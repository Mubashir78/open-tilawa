import { describe, expect, test } from 'vitest';

import { DEFAULTS, parseSettings, parseUploadMbps } from '../src/lib/settings';

describe('parseUploadMbps', () => {
  test('a zero upload cap pauses uploading, it does not become the default', () => {
    expect(parseUploadMbps(0)).toBe(0);
  });

  test('an empty or garbage cap falls back to 1 Mbps, never to unlimited', () => {
    expect(parseUploadMbps('')).toBe(1);
    expect(parseUploadMbps('fast')).toBe(1);
    expect(parseUploadMbps(-3)).toBe(1);
    expect(parseUploadMbps(undefined)).toBe(1);
  });

  test('a real number survives and is clamped to the maximum', () => {
    expect(parseUploadMbps(4)).toBe(4);
    expect(parseUploadMbps(5000)).toBe(1000);
  });
});

describe('parseSettings', () => {
  test('unknown or partial settings resolve to defaults field by field', () => {
    expect(parseSettings({ maxReciters: 'many' })).toEqual({ ...DEFAULTS, maxReciters: 2 });
    expect(parseSettings({ uploadMbps: 4 }).uploadMbps).toBe(4);
  });

  test('nothing at all is the defaults', () => {
    expect(parseSettings(null)).toEqual(DEFAULTS);
    expect(parseSettings(undefined)).toEqual(DEFAULTS);
  });

  test('the reciter count is clamped to the roster range', () => {
    expect(parseSettings({ maxReciters: 0 }).maxReciters).toBe(1);
    expect(parseSettings({ maxReciters: 99 }).maxReciters).toBe(12);
  });

  test('a schedule is kept only when both hours are real', () => {
    expect(parseSettings({ schedule: { from: 22, to: 7 } }).schedule).toEqual({ from: 22, to: 7 });
    expect(parseSettings({ schedule: { from: 22, to: 99 } }).schedule).toBeNull();
    expect(parseSettings({ schedule: 'night' }).schedule).toBeNull();
  });

  test('a paused flag survives a round trip', () => {
    expect(parseSettings({ paused: true }).paused).toBe(true);
    expect(parseSettings({ paused: 'yes' }).paused).toBe(false);
  });
});
