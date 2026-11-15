/**
 * The one screen where a person decides what to give.
 *
 * Nothing is pre-ticked, the totals are live, and the button is disabled with a
 * reason rather than a silent refusal. Removing a reciter is the only destructive
 * action on the page and it is spelled out: the copy goes with it.
 */

import { useEffect, useMemo, useState } from 'react';
import { browser } from 'wxt/browser';

import { callEngine } from '@/hosts';
import { formatBytes } from '@/lib/badge';
import type { HeldReciter, Reciter } from '@/lib/catalogue';
import { planSelection } from '@/lib/selection';
import { loadHeld, loadSettings, saveHeld, saveSettings, type Settings } from '@/lib/settings';
import { fetchCatalogue } from '@/lib/sync';
import { copyFor, pickLang } from '@/ui/i18n';

type Disk = { quota: number; usage: number };

export default function App() {
  const copy = useMemo(() => copyFor(pickLang(browser.i18n.getUILanguage())), []);
  const dir = copy.dir;

  const [rows, setRows] = useState<Reciter[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [held, setHeld] = useState<HeldReciter[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [disk, setDisk] = useState<Disk | null>(null);
  const [status, setStatus] = useState<{ text: string; tone: 'idle' | 'error' }>({ text: '', tone: 'idle' });
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const canReadBattery = typeof (navigator as { getBattery?: unknown }).getBattery === 'function';
  const canReadConnection = 'connection' in navigator;

  useEffect(() => {
    let live = true;
    setLoading(true);
    setFailed(false);

    void Promise.all([
      fetchCatalogue(),
      loadHeld<HeldReciter>(),
      loadSettings(),
      navigator.storage?.estimate?.().catch(() => undefined) ?? Promise.resolve(undefined),
    ]).then(
      ([roster, storedHeld, storedSettings, estimate]) => {
        if (!live) return;
        setRows(roster);
        setHeld(storedHeld);
        setSettings(storedSettings);
        setSelected(new Set(storedHeld.map((reciter) => reciter.infohash)));
        if (estimate?.quota) setDisk({ quota: estimate.quota, usage: estimate.usage ?? 0 });
        setLoading(false);
      },
      () => {
        if (!live) return;
        setFailed(true);
        setLoading(false);
      },
    );

    return () => {
      live = false;
    };
  }, [attempt]);

  const chosen = rows.filter((reciter) => selected.has(reciter.infohash));
  const selectedBytes = chosen.reduce((sum, reciter) => sum + (reciter.sizeBytes ?? 0), 0);
  const heldBytes = held.reduce((sum, reciter) => sum + (reciter.sizeBytes ?? 0), 0);

  const plan = planSelection({
    selectedBytes,
    selectedCount: chosen.length,
    maxReciters: settings?.maxReciters ?? 2,
    capBytes: disk?.quota ?? Number.POSITIVE_INFINITY,
    heldBytes,
    usageBytes: disk?.usage ?? null,
  });

  const toggle = (infohash: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(infohash)) next.delete(infohash);
      else next.add(infohash);
      return next;
    });
    setStatus({ text: '', tone: 'idle' });
  };

  const save = async () => {
    if (!settings || !plan.allowed) return;
    setSaving(true);
    setStatus({ text: copy.saving, tone: 'idle' });

    try {
      for (const reciter of held) {
        if (selected.has(reciter.infohash)) continue;
        await callEngine({ type: 'engine:remove', infohash: reciter.infohash });
      }

      const next: HeldReciter[] = chosen.map((reciter) => ({
        ...reciter,
        addedAt:
          held.find((existing) => existing.infohash === reciter.infohash)?.addedAt ??
          new Date().toISOString(),
      }));

      await saveHeld(next);
      await saveSettings(settings);
      setHeld(next);
      await callEngine({ type: 'engine:start' });
      setStatus({ text: copy.saved, tone: 'idle' });
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : String(error), tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page" dir={dir}>
      <h1>{copy.title}</h1>
      <p className="lede">{copy.lede}</p>

      <section>
        <h2>{copy.roster}</h2>

        {loading ? <p className="meta">{copy.loading}</p> : null}
        {failed ? (
          <p className="meta">
            {copy.failed}{' '}
            <button type="button" className="ghost" onClick={() => setAttempt((value) => value + 1)}>
              {copy.retry}
            </button>
          </p>
        ) : null}
        {!loading && !failed && rows.length === 0 ? <p className="meta">{copy.empty}</p> : null}

        <ul className="roster">
          {rows.map((reciter) => (
            <li key={reciter.infohash}>
              <label className="row">
                <input
                  type="checkbox"
                  checked={selected.has(reciter.infohash)}
                  onChange={() => toggle(reciter.infohash)}
                />
                <span>
                  <span className="name">{reciter.nameAr || reciter.name}</span>
                  <span className="meta">
                    {reciter.riwaya} · {formatBytes(reciter.sizeBytes ?? 0)} ·{' '}
                    {reciter.complete ? copy.complete : copy.partial}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <small>{copy.removeHint}</small>
      </section>

      {settings ? (
        <section>
          <h2>{copy.settings}</h2>

          <div className="grid">
            <div className="field">
              <label htmlFor="max-reciters">{copy.maxReciters}</label>
              <select
                id="max-reciters"
                value={settings.maxReciters}
                onChange={(event) =>
                  setSettings({ ...settings, maxReciters: Number(event.target.value) })
                }
              >
                {[1, 2, 3, 4].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="upload">{copy.upload}</label>
              <input
                id="upload"
                type="number"
                min={0}
                max={1000}
                step={1}
                value={settings.uploadMbps}
                onChange={(event) => setSettings({ ...settings, uploadMbps: Number(event.target.value) })}
              />
            </div>
          </div>

          {canReadBattery ? (
            <label className="row">
              <input
                type="checkbox"
                checked={settings.pauseOnBattery}
                onChange={(event) => setSettings({ ...settings, pauseOnBattery: event.target.checked })}
              />
              <span>{copy.pauseBattery}</span>
            </label>
          ) : null}

          {canReadConnection ? (
            <label className="row">
              <input
                type="checkbox"
                checked={settings.pauseOnMetered}
                onChange={(event) => setSettings({ ...settings, pauseOnMetered: event.target.checked })}
              />
              <span>{copy.pauseMetered}</span>
            </label>
          ) : null}

          <div className="grid">
            <div className="field">
              <label className="row" htmlFor="schedule">
                <input
                  id="schedule"
                  type="checkbox"
                  checked={settings.schedule !== null}
                  onChange={(event) =>
                    setSettings({ ...settings, schedule: event.target.checked ? { from: 22, to: 7 } : null })
                  }
                />
                <span>{copy.schedule}</span>
              </label>
            </div>

            {settings.schedule ? (
              <>
                <div className="field">
                  <label htmlFor="from">{copy.scheduleFrom}</label>
                  <input
                    id="from"
                    type="number"
                    min={0}
                    max={23}
                    value={settings.schedule.from}
                    onChange={(event) =>
                      setSettings({ ...settings, schedule: { from: Number(event.target.value), to: settings.schedule!.to } })
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="to">{copy.scheduleTo}</label>
                  <input
                    id="to"
                    type="number"
                    min={0}
                    max={23}
                    value={settings.schedule.to}
                    onChange={(event) =>
                      setSettings({ ...settings, schedule: { from: settings.schedule!.from, to: Number(event.target.value) } })
                    }
                  />
                </div>
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="bar">
        <span className="meta">
          {copy.selectedLabel}: {chosen.length} · {formatBytes(selectedBytes)} / {copy.capLabel}:{' '}
          {settings?.maxReciters ?? 2}
        </span>
        <button type="button" onClick={() => void save()} disabled={!plan.allowed || saving}>
          {copy.start}
        </button>
        <span className="status" data-tone={status.tone}>
          {plan.allowed ? status.text : plan.reason === 'count' ? copy.overCount : copy.overDisk}
        </span>
      </div>
    </main>
  );
}
