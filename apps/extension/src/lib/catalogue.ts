/**
 * What the catalogue serves, and what changed since last time.
 *
 * The extension asks the same public endpoint the site's prerender asks
 * (`console.tilawah.cc/api/public/reciters`), and it must read it the same way:
 * a row is shown because a human published it, a demo or test row with no
 * magnet is not a reciter, and two rows naming one release are one release.
 *
 * `diffCatalogue` is the reason this module exists. The volunteer chose what to
 * hold; the catalogue changes on its own. Nothing here may add a reciter to the
 * held list — it reports, and the person decides.
 */

export type Reciter = {
  infohash: string;
  slug: string;
  name: string;
  nameAr: string;
  riwaya: string;
  sizeBytes: number | null;
  /** The surahs the release carries; `null` means unknown, which is the whole book. */
  surahs: number[] | null;
  complete: boolean;
};

export type HeldReciter = Reciter & { addedAt: string };

export const FULL_QURAN = 114;

const INFO_HASH = /^[0-9a-f]{40}$/i;

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** Catalogue rows → the roster this extension can hold. */
export function toReciters(rows: unknown): Reciter[] {
  if (!Array.isArray(rows)) return [];

  const seen = new Set<string>();
  const list: Reciter[] = [];

  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;

    // A torrent is addressed by its hash; a row without a valid one cannot be
    // fetched, seeded or deduplicated.
    const infohash = text(row.infohash).toLowerCase();
    if (!INFO_HASH.test(infohash)) continue;

    // No magnet means nothing published, whatever the rest of the row says.
    if (!text(row.magnet)) continue;

    if (seen.has(infohash)) continue;
    seen.add(infohash);

    const nameAr = text(row.nameAr);
    const name = text(row.name);

    // The manifest is an index into the 114. An id outside the mushaf can never
    // name a file, and an empty list is "unknown", not "an empty book".
    const manifest = Array.isArray(row.surahs)
      ? row.surahs.filter((id): id is number => Number.isInteger(id) && (id as number) >= 1 && (id as number) <= FULL_QURAN)
      : [];

    list.push({
      infohash,
      slug: text(row.slug),
      name: name || nameAr || infohash.slice(0, 8),
      nameAr,
      riwaya: text(row.riwaya) || 'unknown',
      sizeBytes:
        typeof row.sizeBytes === 'number' && Number.isFinite(row.sizeBytes) ? row.sizeBytes : null,
      surahs: manifest.length > 0 ? manifest : null,
      complete: (typeof row.fileCount === 'number' ? row.fileCount : 0) >= FULL_QURAN,
    });
  }

  // Arabic collation so the picker reads in an order a reader expects.
  return list.sort((a, b) => (a.nameAr || a.name).localeCompare(b.nameAr || b.name, 'ar'));
}

/**
 * What to tell the person about the roster.
 *
 * A new hash under a known slug is one reciter re-imported, not two reciters; a
 * held hash the catalogue stopped listing is reported and kept, never deleted.
 */
export function diffCatalogue(
  held: HeldReciter[],
  rows: Reciter[],
): { added: Reciter[]; replaced: { from: HeldReciter; to: Reciter }[]; unpublished: HeldReciter[] } {
  const heldByHash = new Map(held.map((reciter) => [reciter.infohash, reciter]));
  const heldBySlug = new Map(
    held.filter((reciter) => reciter.slug).map((reciter) => [reciter.slug, reciter]),
  );
  const catalogueHashes = new Set(rows.map((row) => row.infohash));

  const added: Reciter[] = [];
  const replaced: { from: HeldReciter; to: Reciter }[] = [];

  for (const row of rows) {
    if (heldByHash.has(row.infohash)) continue;
    const prior = row.slug ? heldBySlug.get(row.slug) : undefined;
    if (prior) replaced.push({ from: prior, to: row });
    else added.push(row);
  }

  return {
    added,
    replaced,
    // A replaced reciter's old hash is, by definition, no longer listed. It is
    // not "unpublished": it is the same reciter, reported once as a replacement.
    unpublished: held.filter(
      (reciter) =>
        !catalogueHashes.has(reciter.infohash) &&
        !replaced.some((entry) => entry.from.infohash === reciter.infohash),
    ),
  };
}
