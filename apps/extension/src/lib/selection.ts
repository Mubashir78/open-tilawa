/**
 * The two gates between "I want these" and "start downloading".
 *
 * They are deliberately different questions and each gets its own answer:
 *
 *  - The **count** is the person's own limit, set in words ("two reciters").
 *    Exceeding it is a choice they can change in one click.
 *  - The **disk** is the browser's limit, measured in bytes and reported as a
 *    shortfall; nothing here deletes anything to make room.
 *
 * Count first, because it is the cheaper explanation and the one the person can
 * always act on.
 */

import { planStorage } from './storage-plan';

export type SelectionPlan = {
  allowed: boolean;
  reason: 'count' | 'disk' | null;
  totalBytes: number;
  missingBytes: number;
};

export function planSelection(input: {
  selectedBytes: number;
  selectedCount: number;
  maxReciters: number;
  capBytes: number;
  heldBytes: number;
  usageBytes: number | null;
}): SelectionPlan {
  const totalBytes = Number.isFinite(input.selectedBytes) ? input.selectedBytes : 0;

  if (input.selectedCount > input.maxReciters) {
    return { allowed: false, reason: 'count', totalBytes, missingBytes: 0 };
  }

  const disk = planStorage({
    capBytes: input.capBytes,
    heldBytes: input.heldBytes,
    usageBytes: input.usageBytes,
    addBytes: totalBytes,
  });

  return disk.fits
    ? { allowed: true, reason: null, totalBytes, missingBytes: 0 }
    : { allowed: false, reason: 'disk', totalBytes, missingBytes: disk.missingBytes };
}
