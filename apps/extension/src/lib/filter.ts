/**
 * Narrowing the roster by riwaya.
 *
 * The console's reciter table filters the same list the same way, and the values
 * come from the rows themselves — a hard-coded list would go stale the day a
 * fourth riwaya is imported. No selection means no filter: a control that starts
 * with nothing ticked and shows nothing would look broken.
 */

import type { Reciter } from './catalogue';

export type RiwayaOption = { riwaya: string; count: number };

export function riwayaOptions(rows: Reciter[]): RiwayaOption[] {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.riwaya, (counts.get(row.riwaya) ?? 0) + 1);
  return [...counts.entries()]
    .map(([riwaya, count]) => ({ riwaya, count }))
    .sort((a, b) => a.riwaya.localeCompare(b.riwaya, 'ar'));
}

export function filterByRiwaya(rows: Reciter[], selected: string[]): Reciter[] {
  if (selected.length === 0) return rows;
  const wanted = new Set(selected);
  return rows.filter((row) => wanted.has(row.riwaya));
}
