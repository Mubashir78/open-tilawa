import { describe, expect, test } from 'vitest';

import { planStorage } from '../src/lib/storage-plan';

describe('planStorage', () => {
  test('refuses and reports the shortfall in bytes', () => {
    expect(planStorage({ capBytes: 6e9, heldBytes: 4e9, usageBytes: null, addBytes: 3e9 })).toEqual({
      fits: false,
      missingBytes: 1e9,
    });
  });

  test('a missing or zero estimate falls back to held sizes and still allows the add', () => {
    expect(planStorage({ capBytes: 6e9, heldBytes: 1e9, usageBytes: 0, addBytes: 1e9 })).toEqual({
      fits: true,
      missingBytes: 0,
    });
    expect(planStorage({ capBytes: 6e9, heldBytes: 1e9, usageBytes: null, addBytes: 1e9 })).toEqual({
      fits: true,
      missingBytes: 0,
    });
  });

  test('an estimate smaller than what we already hold is ignored, not trusted', () => {
    expect(planStorage({ capBytes: 6e9, heldBytes: 2e9, usageBytes: 1, addBytes: 1e9 }).fits).toBe(true);
  });

  test('an unknown add size is refused, never assumed to fit', () => {
    expect(planStorage({ capBytes: 6e9, heldBytes: 0, usageBytes: null, addBytes: Number.NaN }).fits).toBe(false);
  });

  test('an unknown cap does not block a download', () => {
    expect(planStorage({ capBytes: Number.NaN, heldBytes: 1e9, usageBytes: null, addBytes: 1e9 }).fits).toBe(true);
  });
});
