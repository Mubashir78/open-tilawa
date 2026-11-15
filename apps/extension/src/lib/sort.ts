/**
 * The roster's order, mirroring the console's own table.
 *
 * The console sorts by clicking a column header and clicking it again flips the
 * direction (`apps/admin/apps/web/src/routes/Reciters.tsx:462-477`). The same
 * roster, sorted two different ways in two places, is a papercut nobody
 * forgives, so the keys and the gesture are copied: `اسم · رواية · حجم · جديد`.
 *
 * Two edges are decided here rather than at the call site. A reciter whose size
 * the catalogue does not know sorts **last in both directions** — it is not
 * small, it is unknown, and putting it first on a descending sort reads as
 * "biggest". Ties keep arrival order, because `Array#sort` is stable and a
 * list that reshuffles on every render is a bug you can see.
 */

import type { Reciter } from './catalogue';

export type SortKey = 'name' | 'riwaya' | 'size' | 'new';
export type SortDir = 'asc' | 'desc';
export type Sort = { key: SortKey; dir: SortDir };

export const DEFAULT_SORT: Sort = { key: 'name', dir: 'asc' };

export function sortReciters(rows: Reciter[], sort: Sort, locale = 'ar'): Reciter[] {
  const dir = sort.dir === 'asc' ? 1 : -1;
  const byName = (a: Reciter, b: Reciter) => (a.nameAr || a.name).localeCompare(b.nameAr || b.name, locale);

  return [...rows].sort((a, b) => {
    switch (sort.key) {
      case 'riwaya':
        return a.riwaya.localeCompare(b.riwaya, locale) * dir;

      case 'size': {
        const sizeA = typeof a.sizeBytes === 'number' && a.sizeBytes > 0 ? a.sizeBytes : null;
        const sizeB = typeof b.sizeBytes === 'number' && b.sizeBytes > 0 ? b.sizeBytes : null;
        if (sizeA === null && sizeB === null) return byName(a, b);
        if (sizeA === null) return 1;
        if (sizeB === null) return -1;
        return (sizeA - sizeB) * dir;
      }

      case 'new': {
        // "Newest" is the catalogue id: the public API carries no date, and ids
        // ascend with import. Ascending therefore means newest first.
        const idA = typeof a.id === 'number' ? a.id : -1;
        const idB = typeof b.id === 'number' ? b.id : -1;
        return (idB - idA) * dir;
      }

      case 'name':
      default:
        return byName(a, b) * dir;
    }
  });
}
