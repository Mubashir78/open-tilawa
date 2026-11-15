/**
 * The bar that answers "what am I about to give, and may I".
 *
 * It is fixed to the bottom because the decision is made while reading the
 * roster, not after scrolling back up; the page reserves space for it so the last
 * row is never trapped underneath.
 */

import { formatBytes } from '@/lib/badge';

export function SummaryBar({
  selectedCount,
  selectedBytes,
  capReciters,
  allowed,
  refusal,
  status,
  busy,
  labels,
  onStart,
}: {
  selectedCount: number;
  selectedBytes: number;
  capReciters: number;
  allowed: boolean;
  refusal: string;
  status: { text: string; tone: 'idle' | 'error' };
  busy: boolean;
  labels: { selected: string; cap: string; start: string };
  onStart: () => void;
}) {
  return (
    <div className="bar">
      <span className="totals">
        {labels.selected}: <bdi>{selectedCount}</bdi> · <bdi>{formatBytes(selectedBytes)}</bdi> /{' '}
        {labels.cap}: <bdi>{capReciters}</bdi>
      </span>
      <button type="button" className="primary" onClick={onStart} disabled={!allowed || busy}>
        {labels.start}
      </button>
      <span className="status" data-tone={status.tone}>
        {allowed ? status.text : refusal}
      </span>
    </div>
  );
}
