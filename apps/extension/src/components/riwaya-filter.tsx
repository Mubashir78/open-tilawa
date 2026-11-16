/**
 * The riwaya filter: a disclosure with checkboxes, not a native multi-select.
 *
 * A `<select multiple>` needs ctrl-click, is unreadable in RTL, and cannot show
 * counts. This is a `<details>` — the browser gives keyboard behaviour and
 * Escape for free — plus two things it does not: choosing "All" closes the
 * panel, and a click anywhere outside closes it. A filter that stays open over
 * the roster after you have chosen is a panel you have to dismiss twice.
 */

import { useEffect, useRef } from 'react';

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
  const ref = useRef<HTMLDetailsElement>(null);
  const options = riwayaOptions(rows);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      const node = ref.current;
      if (!node?.open) return;
      if (event.target instanceof Node && node.contains(event.target)) return;
      node.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && ref.current?.open) ref.current.open = false;
    };

    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, []);

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
    <details className="filter" ref={ref}>
      <summary>
        <span className="meta">{labels.label}</span> {summary}
      </summary>
      <div className="filter-panel" role="group" aria-label={labels.label}>
        <button
          type="button"
          className="quiet"
          onClick={() => {
            onChange([]);
            if (ref.current) ref.current.open = false;
          }}
        >
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
