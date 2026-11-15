/**
 * The roster view: what arrived, what is on offer, and what is still held but no
 * longer published.
 *
 * A reciter that left the catalogue keeps a row here until the person removes it.
 * Hiding it would leave bytes on disk with no surface to delete them from, and a
 * seeder still announcing a release nobody lists.
 */

import { formatBytes } from '@/lib/badge';
import type { HeldReciter, Reciter } from '@/lib/catalogue';
import type { Copy } from '@/lib/i18n';
import type { Sort } from '@/lib/sort';
import { FreshStrip } from '@/components/fresh-strip';
import { RiwayaFilter } from '@/components/riwaya-filter';
import { SortBar } from '@/components/sort-bar';
import { TrashIcon } from '@/components/icons';

export function RecitersView({
  copy,
  loading,
  failed,
  rows,
  ordered,
  fresh,
  unpublished,
  selected,
  sort,
  riwayat,
  onRiwayat,
  onRetry,
  onToggle,
  onAddFromStrip,
  onSort,
  onRemoveUnpublished,
}: {
  copy: Copy;
  loading: boolean;
  failed: boolean;
  rows: Reciter[];
  ordered: Reciter[];
  fresh: Reciter[];
  unpublished: HeldReciter[];
  selected: Set<string>;
  sort: Sort;
  riwayat: string[];
  onRiwayat: (next: string[]) => void;
  onRetry: () => void;
  onToggle: (infohash: string) => void;
  onAddFromStrip: (infohash: string) => void;
  onSort: (next: Sort) => void;
  onRemoveUnpublished: (infohash: string) => void;
}) {
  return (
    <section id="reciters" className="screen" aria-labelledby="reciters-title">
      <FreshStrip
        rows={fresh}
        labels={{ title: copy.freshTitle, add: copy.add, unknown: copy.unknownSize }}
        onAdd={onAddFromStrip}
      />

      <h2 id="reciters-title">{copy.roster}</h2>

      {loading ? <p className="meta">{copy.loading}</p> : null}
      {failed ? (
        <p className="meta">
          {copy.failed}{' '}
          <button type="button" className="ghost" onClick={onRetry}>
            {copy.retry}
          </button>
        </p>
      ) : null}
      {!loading && !failed && rows.length === 0 ? <p className="meta">{copy.empty}</p> : null}

      {rows.length > 0 ? (
        <RiwayaFilter
          rows={rows}
          selected={riwayat}
          labels={{ label: copy.filterRiwaya, all: copy.filterAll, count: copy.filterCount }}
          onChange={onRiwayat}
        />
      ) : null}

      {rows.length > 0 ? (
        <SortBar
          sort={sort}
          onChange={onSort}
          labels={{
            label: copy.sortBy,
            name: copy.sortName,
            riwaya: copy.sortRiwaya,
            size: copy.sortSize,
            new: copy.sortNew,
          }}
        />
      ) : null}

      <ul className="roster">
        {ordered.map((reciter) => (
          <li key={reciter.infohash} data-infohash={reciter.infohash}>
            <label className="row">
              <input
                type="checkbox"
                checked={selected.has(reciter.infohash)}
                onChange={() => onToggle(reciter.infohash)}
              />
              <span>
                <span className="name">
                  {reciter.nameAr || reciter.name}
                  {reciter.complete ? null : <span className="tag">{copy.partial}</span>}
                </span>
                <span className="meta">
                  {reciter.riwaya} · {reciter.sizeBytes ? formatBytes(reciter.sizeBytes) : copy.unknownSize}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <small>{copy.removeHint}</small>

      {unpublished.length > 0 ? (
        <>
          <h2 style={{ marginBlockStart: '1.5rem' }}>{copy.unpublishedTitle}</h2>
          <p className="meta">{copy.unpublishedLede}</p>
          <ul className="roster">
            {unpublished.map((reciter) => (
              <li key={reciter.infohash} data-infohash={reciter.infohash}>
                <span className="row">
                  <span>
                    <span className="name">{reciter.nameAr || reciter.name}</span>
                    <span className="meta">{formatBytes(reciter.sizeBytes ?? 0)}</span>
                  </span>
                </span>
                <button type="button" className="ghost" onClick={() => onRemoveUnpublished(reciter.infohash)}>
                  <TrashIcon /> {copy.remove}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
