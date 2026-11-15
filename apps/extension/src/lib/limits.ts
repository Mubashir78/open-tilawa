/**
 * When the engine is allowed to run.
 *
 * Seeding is a background cost on someone else's machine, so every rule here is
 * a promise about that machine: a battery that is nearly empty, a connection
 * that is billed by the megabyte, an hour the person reserved for something
 * else. The order is fixed — the cheapest explanation for "why is it stopped"
 * wins — because the popup shows exactly one reason.
 *
 * Two of these rules cannot be answered on every browser: Firefox has no Battery
 * Status API and no Network Information API. `null` therefore means "this
 * browser cannot say", and the answer is to run, never to block. A rule that
 * silently stopped seeding on a browser that cannot measure the thing would be
 * indistinguishable from a bug.
 */

export type RunInput = {
  paused: boolean;
  onBattery: boolean;
  batteryLevel: number | null;
  metered: boolean | null;
  schedule: { from: number; to: number } | null;
  hour: number;
};

export type RunReason = 'paused' | 'battery' | 'metered' | 'schedule' | null;

export const BATTERY_FLOOR = 20;

export function shouldRun(input: RunInput): { run: boolean; reason: RunReason } {
  if (input.paused) return { run: false, reason: 'paused' };

  if (
    input.onBattery &&
    typeof input.batteryLevel === 'number' &&
    input.batteryLevel < BATTERY_FLOOR
  ) {
    return { run: false, reason: 'battery' };
  }

  if (input.metered === true) return { run: false, reason: 'metered' };

  if (input.schedule && !insideSchedule(input.schedule, input.hour)) {
    return { run: false, reason: 'schedule' };
  }

  return { run: true, reason: null };
}

/** A window that wraps midnight (22 → 7) is one range, not two. */
export function insideSchedule(schedule: { from: number; to: number }, hour: number): boolean {
  const { from, to } = schedule;
  if (from === to) return true;
  return from > to ? hour >= from || hour < to : hour >= from && hour < to;
}
