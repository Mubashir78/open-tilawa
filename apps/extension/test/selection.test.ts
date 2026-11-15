import { describe, expect, test } from 'vitest';

import { planSelection } from '../src/lib/selection';

const base = {
  selectedBytes: 1e9,
  selectedCount: 1,
  maxReciters: 2,
  capBytes: 6e9,
  heldBytes: 0,
  usageBytes: null,
};

describe('planSelection', () => {
  test('one reciter inside a two-reciter cap is allowed', () => {
    expect(planSelection(base)).toEqual({ allowed: true, reason: null, totalBytes: 1e9, missingBytes: 0 });
  });

  test('a third reciter is refused by the count cap, not by the disk', () => {
    const plan = planSelection({ ...base, selectedCount: 3 });

    expect(plan.allowed).toBe(false);
    expect(plan.reason).toBe('count');
  });

  test('two reciters that do not fit the disk are refused with a shortfall', () => {
    const plan = planSelection({ ...base, selectedCount: 2, selectedBytes: 5e9, capBytes: 6e9, heldBytes: 4e9 });

    expect(plan.allowed).toBe(false);
    expect(plan.reason).toBe('disk');
    expect(plan.missingBytes).toBe(3e9);
  });

  test('the count is checked before the disk, so the cheaper reason wins', () => {
    const plan = planSelection({ ...base, selectedCount: 9, selectedBytes: 99e9 });

    expect(plan.reason).toBe('count');
  });

  test('the total is reported even when refused, for the running label', () => {
    expect(planSelection({ ...base, selectedCount: 3, selectedBytes: 4e9 }).totalBytes).toBe(4e9);
  });
});
