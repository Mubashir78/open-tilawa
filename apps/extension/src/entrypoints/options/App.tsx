/**
 * The one screen where a person decides what to give.
 *
 * Nothing is pre-ticked, the totals are live, and the button is disabled with a
 * reason rather than a silent refusal. Removing a reciter is the only destructive
 * action on the page and it is spelled out: the copy goes with it.
 *
 * A reciter that has left the catalogue is not silently dropped — it is still on
 * disk, still seeding, and still costs the person space, so it gets its own row
 * until they remove it.
 */

import { useEffect, useMemo, useState } from 'react';
import { browser } from 'wxt/browser';

import { formatBytes } from '@/lib/badge';
import type { HeldReciter, Reciter } from '@/lib/catalogue';
import { planSelection } from '@/lib/selection';
import { loadHeld, loadSettings, saveHeld, saveSettings, type Settings } from '@/lib/settings';
import { parseUploadMbps } from '@/lib/settings';
import { fetchCatalogue } from '@/lib/sync';
import { ask } from '@/lib/ui-bridge';
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
  const [uploadDraft, setUploadDraft] = useState('1');
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
        setUploadDraft(String(storedSettings.uploadMbps));
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

  const catalogueHashes = new Set(rows.map((reciter) => reciter.infohash));
  const heldHashes = new Set(held.map((reciter) => reciter.infohash));

  /** Still held, no longer published: kept until the person says otherwise. */
  const unpublished = held.filter((reciter) => !catalogueHashes.has(reciter.infohash));
  const chosen = rows.filter((reciter) => selected.has(reciter.infohash));

  const unknownSize =
    chosen.some((reciter) => typeof reciter.sizeBytes !== 'number' || reciter.sizeBytes <= 0) ||
    unpublished.some((reciter) => typeof reciter.sizeBytes !== 'number' || reciter.sizeBytes <= 0);

  // Only bytes that are not already on disk are planned for; counting the held
  // ones again would refuse a selection that is already there.
  const addBytes = chosen
    .filter((reciter) => !heldHashes.has(reciter.infohash))
    .reduce((sum, reciter) => sum + (reciter.sizeBytes ?? 0), 0);
  const selectedBytes = chosen.reduce((sum, reciter) => sum + (reciter.sizeBytes ?? 0), 0);
  const publishedHeldBytes = held.filter((reciter) => catalogueHashes.has(reciter.infohash)).reduce(
    (sum, reciter) => sum + (reciter.sizeBytes ?? 0),
    0,
  );

  const plan = planSelection({
    selectedBytes: addBytes,
    selectedCount: chosen.length,
    unknownSize,
    maxReciters: settings?.maxReciters ?? 2,
    capBytes: disk?.quota ?? Number.POSITIVE_INFINITY,
    heldBytes: publishedHeldBytes,
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

  const removeUnpublished = async (infohash: string) => {
    setHeld((current) => current.filter((reciter) => reciter.infohash !== infohash));
    await ask({ type: 'state:remove', infohash });
  };

  const save = async () => {
    if (!settings || !plan.allowed) return;
    setSaving(true);
    setStatus({ text: copy.saving, tone: 'idle' });

    try {
      const next: HeldReciter[] = [
        ...unpublished,
        ...chosen.map((reciter) => ({
          ...reciter,
          addedAt:
            held.find((existing) => existing.infohash === reciter.infohash)?.addedAt ??
            new Date().toISOString(),
        })),
      ];

      // Anything stored but no longer in the next list is removed — including the
      // ones that left the catalogue, because their row was shown and not kept.
      const nextHashes = new Set(next.map((reciter) => reciter.infohash));
      for (const reciter of held) {
        if (nextHashes.has(reciter.infohash)) continue;
        await ask({ type: 'state:remove', infohash: reciter.infohash });
      }

      const uploadMbps = parseUploadMbps(uploadDraft);
      await saveHeld(next);
      const saved = await saveSettings({ ...settings, uploadMbps });
      setSettings(saved);
      setUploadDraft(String(saved.uploadMbps));
      setHeld(next);

      const reply = await ask({ type: 'state:start' });
      setStatus(
        reply.ok
          ? { text: copy.saved, tone: 'idle' }
          : { text: reply.error ?? copy.failed, tone: 'error' },
      );
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
            <li key={reciter.infohash} data-infohash={reciter.infohash}>
              <label className="row">
                <input
                  type="checkbox"
                  checked={selected.has(reciter.infohash)}
                  onChange={() => toggle(reciter.infohash)}
                />
                <span>
                  <span className="name">{reciter.nameAr || reciter.name}</span>
                  <span className="meta">
                    {reciter.riwaya} ·{' '}
                    {reciter.sizeBytes ? formatBytes(reciter.sizeBytes) : copy.unknownSize} ·{' '}
                    {reciter.complete ? copy.complete : copy.partial}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <small>{copy.removeHint}</small>

        {unpublished.length > 0 ? (
          <>
            <h2>{copy.unpublishedTitle}</h2>
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
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => void removeUnpublished(reciter.infohash)}
                  >
                    {copy.remove}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
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
                onChange={(event) => setSettings({ ...settings, maxReciters: Number(event.target.value) })}
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
                value={uploadDraft}
                onChange={(event) => setUploadDraft(event.target.value)}
              />
              <small>{copy.uploadHint}</small>
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
                      setSettings({
                        ...settings,
                        schedule: { from: Number(event.target.value), to: settings.schedule!.to },
                      })
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
                      setSettings({
                        ...settings,
                        schedule: { from: settings.schedule!.from, to: Number(event.target.value) },
                      })
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
          {plan.allowed
            ? status.text
            : plan.reason === 'count'
              ? copy.overCount
              : plan.reason === 'unknown'
                ? copy.overUnknown
                : copy.overDisk}
        </span>
      </div>
    </main>
  );
}
