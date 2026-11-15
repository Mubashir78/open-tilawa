/**
 * The riwaya filter: a disclosure with checkboxes, not a native multi-select.
 *
 * A `<select multiple>` needs ctrl-click, is unreadable in RTL, and cannot show
 * counts. This is a `<details>` — the browser gives keyboard behaviour, escape,
 * and "click outside" for free, and the summary stays the only thing on screen
 * until it is opened. Values come from the roster, so a new riwaya appears
 * without a code change.
 */

import { riwayaOptions } from '@/lib/filter';
import type { Reciter } from '@/lib/catalogue';

export function RiwayaFilter({
  rows,
  selected,
  labels,
  onChange,
}: {
  rows: Reciter[];
  selected: string[];
  labels: { label: string; all: string; count: string };
  onChange: (next: string[]) => void;
}) {
  const options = riwayaOptions(rows);
  if (options.length <= 1) return null;

  const toggle = (riwaya: string) => {
    onChange(selected.includes(riwaya) ? selected.filter((value) => value !== riwaya) : [...selected, riwaya]);
  };

  const summary =
    selected.length === 0
      ? labels.all
      : selected.length === 1
        ? selected[0]
        : `${selected.length} ${labels.count}`;

  return (
    <details className="filter">
      <summary>
        <span className="meta">{labels.label}</span> {summary}
      </summary>
      <div className="filter-panel" role="group" aria-label={labels.label}>
        <button type="button" className="ghost" onClick={() => onChange([])}>
          {labels.all}
        </button>
        {options.map((option) => (
          <label key={option.riwaya} className="filter-row">
            <input
              type="checkbox"
              checked={selected.includes(option.riwaya)}
              onChange={() => toggle(option.riwaya)}
            />
            <span>{option.riwaya}</span>
            <span className="meta">{option.count}</span>
          </label>
        ))}
      </div>
    </details>
  );
}
