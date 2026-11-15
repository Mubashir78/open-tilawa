/**
 * Will the next reciter fit?
 *
 * Two different limits live here and they are not the same question. The product
 * limit is a count of reciters ("two reciters" is a decision a volunteer can
 * make); the browser limit is bytes, and it is the one that decides whether a
 * download fills the disk. This function answers the second only, and it answers
 * it conservatively: it refuses, and it never decides what to delete.
 *
 * `usageBytes` is `navigator.storage.estimate()`'s usage. It is an estimate of
 * the whole origin, it can be absent on a browser that has not finished
 * measuring, and it can be smaller than the bytes we know we hold. In both cases
 * the sum of held sizes is the safer number — the browser may be undercounting,
 * but our own torrents are exactly as large as the catalogue said.
 */

export type StoragePlan = { fits: boolean; missingBytes: number };

export function planStorage(input: {
  capBytes: number;
  heldBytes: number;
  usageBytes: number | null;
  addBytes: number;
}): StoragePlan {
  const { capBytes, heldBytes, usageBytes, addBytes } = input;

  // A torrent of unknown size cannot be planned for; refusing is honest, and the
  // caller can ask the catalogue for the size before trying again.
  if (!Number.isFinite(addBytes) || addBytes < 0) return { fits: false, missingBytes: 0 };

  const used =
    typeof usageBytes === 'number' && Number.isFinite(usageBytes) && usageBytes > heldBytes
      ? usageBytes
      : heldBytes;

  const total = used + addBytes;
  const cap = Number.isFinite(capBytes) ? capBytes : Number.POSITIVE_INFINITY;

  return total <= cap
    ? { fits: true, missingBytes: 0 }
    : { fits: false, missingBytes: total - cap };
}
