/**
 * The four columns, borrowed from the console: click a header, click it again to
 * flip. The arrow is the only thing that shows direction — colouring the header
 * would compete with the ticked rows.
 */

import type { Sort, SortKey } from '@/lib/sort';

export function SortBar({
  sort,
  onChange,
  labels,
}: {
  sort: Sort;
  onChange: (next: Sort) => void;
  labels: { label: string; name: string; riwaya: string; size: string; new: string };
}) {
  const item = (key: SortKey, text: string) => (
    <button
      type="button"
      aria-pressed={sort.key === key}
      onClick={() => onChange(sort.key === key ? { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })}
    >
      {text}
      <span aria-hidden="true">{sort.key === key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}</span>
    </button>
  );

  return (
    <div className="sortbar" role="group" aria-label={labels.label}>
      <span>{labels.label}</span>
      {item('name', labels.name)}
      {item('riwaya', labels.riwaya)}
      {item('size', labels.size)}
      {item('new', labels.new)}
    </div>
  );
}
