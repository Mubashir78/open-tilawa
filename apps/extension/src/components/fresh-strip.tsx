/**
 * The strip is the only place the word "new" appears, and it exists for one
 * visit: the hashes shown here are marked seen when the picker renders, so the
 * next visit is quiet unless the catalogue changed again.
 */

import type { Reciter } from '@/lib/catalogue';
import { formatBytes } from '@/lib/badge';
import { PlusIcon } from '@/components/icons';

export function FreshStrip({
  rows,
  labels,
  onAdd,
}: {
  rows: Reciter[];
  labels: { title: string; add: string; unknown: string };
  onAdd: (infohash: string) => void;
}) {
  if (rows.length === 0) return null;

  return (
    <section className="fresh" aria-label={labels.title}>
      <h2>{labels.title}</h2>
      <ul>
        {rows.map((reciter) => (
          <li key={reciter.infohash}>
            <span style={{ flex: 1, minInlineSize: 0 }}>
              <span className="name">{reciter.nameAr || reciter.name}</span>
              <span className="meta">
                {reciter.riwaya} · {reciter.sizeBytes ? formatBytes(reciter.sizeBytes) : labels.unknown}
              </span>
            </span>
            <button type="button" className="ghost" onClick={() => onAdd(reciter.infohash)}>
              <PlusIcon /> {labels.add}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
