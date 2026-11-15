/**
 * What the person arranged, remembered.
 *
 * Two lists with their own accordions, a sort, and a filter: five small
 * preferences that are worthless to redo on every visit. They live in
 * `storage.local` beside the held list, so they survive a reload and a browser
 * restart, and they are parsed on read — this storage is editable by hand and by
 * an older version of the extension.
 */

import { browser } from 'wxt/browser';

import { DEFAULT_SORT, type Sort, type SortKey, type SortDir } from './sort';

export const PREFS_KEY = 'tilawah-companion.prefs.v1';

export type Prefs = {
  /** "My reciters" accordion. */
  mineOpen: boolean;
  /** "Everyone else" accordion. */
  rosterOpen: boolean;
  sort: Sort;
  riwayat: string[];
  /** First run is once; afterwards the page opens on the roster. */
  welcomeSeen: boolean;
};

export const DEFAULTS: Prefs = {
  mineOpen: true,
  rosterOpen: true,
  sort: DEFAULT_SORT,
  riwayat: [],
  welcomeSeen: false,
};

const SORT_KEYS: SortKey[] = ['name', 'riwaya', 'size', 'new'];
const isSortKey = (value: unknown): value is SortKey => SORT_KEYS.includes(value as SortKey);
const isSortDir = (value: unknown): value is SortDir => value === 'asc' || value === 'desc';

export function parsePrefs(raw: unknown): Prefs {
  if (!raw || typeof raw !== 'object') return { ...DEFAULTS };
  const input = raw as Partial<Record<keyof Prefs, unknown>>;

  const sort = input.sort as { key?: unknown; dir?: unknown } | undefined;
  const key = sort && isSortKey(sort.key) ? sort.key : DEFAULTS.sort.key;
  const dir = sort && isSortDir(sort.dir) ? sort.dir : DEFAULTS.sort.dir;

  const riwayat = Array.isArray(input.riwayat)
    ? input.riwayat.filter((value): value is string => typeof value === 'string')
    : DEFAULTS.riwayat;

  return {
    mineOpen: typeof input.mineOpen === 'boolean' ? input.mineOpen : DEFAULTS.mineOpen,
    rosterOpen: typeof input.rosterOpen === 'boolean' ? input.rosterOpen : DEFAULTS.rosterOpen,
    sort: { key, dir },
    riwayat,
    welcomeSeen: typeof input.welcomeSeen === 'boolean' ? input.welcomeSeen : DEFAULTS.welcomeSeen,
  };
}

export async function loadPrefs(): Promise<Prefs> {
  const stored = await browser.storage.local.get(PREFS_KEY);
  return parsePrefs(stored[PREFS_KEY]);
}

export async function savePrefs(patch: Partial<Prefs>): Promise<Prefs> {
  const next = { ...(await loadPrefs()), ...patch };
  await browser.storage.local.set({ [PREFS_KEY]: next });
  return next;
}
