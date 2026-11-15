/**
 * The daily conversation with the catalogue.
 *
 * The extension is a seeder, not a subscription: the roster changes on its own,
 * and the volunteer must never wake up to a download they did not choose. So this
 * module only ever reports. `planSync` is pure and says what changed in words the
 * notification can use; the background decides whether the person has already
 * been told.
 *
 * No RSS: the endpoint is already required for the picker, the server cannot
 * push, and a feed would be a second pipeline for the same twelve rows.
 */

import { diffCatalogue, toReciters, type HeldReciter, type Reciter } from './catalogue';

export const CATALOGUE_URL = 'https://console.tilawah.cc/api/public/reciters?page=1&range=200';

export type SyncNoticeKind = 'added' | 'replaced' | 'unpublished';

export type SyncNotice = {
  kind: SyncNoticeKind;
  /** Dedupe key: one notice per hash per kind, not per tick. */
  infohash: string;
  text: string;
};

export type SyncPlan = {
  /** Exactly the rows that are already held. Sync never adds or removes. */
  hold: HeldReciter[];
  notices: SyncNotice[];
};

const display = (reciter: { nameAr?: string; name?: string }): string =>
  reciter.nameAr?.trim() || reciter.name?.trim() || 'reciter';

export function planSync(held: HeldReciter[], rows: Reciter[]): SyncPlan {
  const diff = diffCatalogue(held, rows);
  const notices: SyncNotice[] = [];

  for (const reciter of diff.added) {
    notices.push({
      kind: 'added',
      infohash: reciter.infohash,
      text: `New reciter: ${display(reciter)}`,
    });
  }

  for (const { to } of diff.replaced) {
    notices.push({
      kind: 'replaced',
      infohash: to.infohash,
      text: `Re-imported: ${display(to)} — replace your copy?`,
    });
  }

  for (const reciter of diff.unpublished) {
    notices.push({
      kind: 'unpublished',
      infohash: reciter.infohash,
      text: `No longer published: ${display(reciter)} — keep or remove?`,
    });
  }

  return { hold: held, notices };
}

/** The roster, or an empty list when the network answers with anything but 200. */
export async function fetchCatalogue(fetchImpl: typeof fetch = fetch): Promise<Reciter[]> {
  const response = await fetchImpl(CATALOGUE_URL, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`catalogue answered ${response.status}`);
  const body = (await response.json()) as { reciters?: unknown };
  return toReciters(body.reciters);
}
