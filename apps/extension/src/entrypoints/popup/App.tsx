/**
 * What the volunteer sees between visits: is it working, and how much has it
 * given. Two numbers, a pause, and a door to the picker — nothing else.
 *
 * Everything it shows comes from the background, which owns the counters and the
 * gate. A popup that asked the engine directly would be a second source of truth
 * for "is it running".
 */

import { useEffect, useMemo, useState } from 'react';
import { browser } from 'wxt/browser';

import { formatBytes } from '@/lib/badge';
import type { HeldReciter } from '@/lib/catalogue';
import type { Counters } from '@/lib/messages';
import { loadHeld, loadSettings } from '@/lib/settings';
import type { HeldState } from '@/lib/state';
import { ask } from '@/lib/ui-bridge';
import { copyFor, pickLang } from '@/ui/i18n';
import { HeldRow } from '@/ui/rows';

export default function App() {
  const copy = useMemo(() => copyFor(pickLang(browser.i18n.getUILanguage())), []);
  const lang = copy.dir === 'rtl' ? 'ar' : 'en';

  const [held, setHeld] = useState<HeldReciter[]>([]);
  const [states, setStates] = useState<HeldState[]>([]);
  const [counters, setCounters] = useState<Counters>({ today: 0, total: 0 });
  const [pending, setPending] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let live = true;

    const read = async () => {
      const [roster, settings, reply] = await Promise.all([
        loadHeld<HeldReciter>(),
        loadSettings(),
        ask({ type: 'state:snapshot' }),
      ]);
      if (!live) return;
      setHeld(roster);
      setStates(reply.states ?? []);
      setCounters(reply.counters ?? { today: 0, total: 0 });
      setPending(reply.pending ?? 0);
      setPaused(settings.paused);
    };

    void read();
    const timer = setInterval(() => void read(), 5000);

    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);

  const togglePause = async () => {
    const next = !paused;
    setPaused(next);
    await ask({ type: next ? 'state:pause' : 'state:resume' });
  };

  const byHash = new Map(states.map((state) => [state.infohash, state]));

  return (
    <main className="popup" dir={copy.dir}>
      <h1>{copy.title}</h1>

      {held.length === 0 ? (
        <p className="empty">{copy.lede}</p>
      ) : (
        <ul className="held">
          {held.map((reciter) => {
            const state = byHash.get(reciter.infohash) ?? {
              infohash: reciter.infohash,
              state: 'queued' as const,
              peers: 0,
              progress: 0,
              uploadedToday: 0,
            };
            return (
              <HeldRow
                key={reciter.infohash}
                name={reciter.nameAr || reciter.name}
                size={formatBytes(reciter.sizeBytes ?? 0)}
                state={state}
                lang={lang}
              />
            );
          })}
        </ul>
      )}

      <div className="foot">
        <span className="meta">
          {copy.uploadedToday}: {formatBytes(counters.today)} · {copy.uploadedTotal}:{' '}
          {formatBytes(counters.total)}
        </span>
        <button type="button" className="ghost" onClick={() => void togglePause()}>
          {paused ? copy.start : '⏸'}
        </button>
        <button type="button" className="ghost" onClick={() => void browser.runtime.openOptionsPage()}>
          {copy.roster}
          {pending > 0 ? ` (${pending})` : ''}
        </button>
      </div>
    </main>
  );
}
