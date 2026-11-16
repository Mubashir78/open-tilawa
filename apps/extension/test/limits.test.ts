import { describe, expect, test } from 'vitest';

import { shouldRun } from '../src/lib/limits';

const base = {
  paused: false,
  onBattery: false,
  batteryLevel: 90,
  metered: false as boolean | null,
  schedule: null as { from: number; to: number } | null,
  hour: 12,
};

describe('shouldRun', () => {
  test('manual pause wins over everything', () => {
    expect(shouldRun({ ...base, paused: true, onBattery: true, batteryLevel: 5 })).toEqual({
      run: false,
      reason: 'paused',
    });
  });

  test('battery under 20 percent while discharging stops seeding', () => {
    expect(shouldRun({ ...base, onBattery: true, batteryLevel: 12 })).toEqual({
      run: false,
      reason: 'battery',
    });
  });

  test('the same battery on the charger keeps seeding', () => {
    expect(shouldRun({ ...base, onBattery: false, batteryLevel: 12 }).run).toBe(true);
  });

  test('null battery and null metered mean the browser cannot answer, so we run', () => {
    expect(shouldRun({ ...base, batteryLevel: null, metered: null, hour: 3 })).toEqual({
      run: true,
      reason: null,
    });
  });

  test('a metered connection pauses, and so does 19 percent', () => {
    expect(shouldRun({ ...base, metered: true }).reason).toBe('metered');
    expect(shouldRun({ ...base, onBattery: true, batteryLevel: 19 }).reason).toBe('battery');
  });

  test('a schedule that wraps midnight is outside it at noon and inside at 23', () => {
    const schedule = { from: 22, to: 7 };

    expect(shouldRun({ ...base, schedule, hour: 12 })).toEqual({ run: false, reason: 'schedule' });
    expect(shouldRun({ ...base, schedule, hour: 23 }).run).toBe(true);
    expect(shouldRun({ ...base, schedule, hour: 6 }).run).toBe(true);
    expect(shouldRun({ ...base, schedule, hour: 7 }).run).toBe(false);
  });

  test('a daytime schedule is inside at noon', () => {
    expect(shouldRun({ ...base, schedule: { from: 9, to: 17 }, hour: 12 }).run).toBe(true);
    expect(shouldRun({ ...base, schedule: { from: 9, to: 17 }, hour: 18 }).reason).toBe('schedule');
  });
});
