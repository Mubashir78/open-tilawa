/**
 * One page, three screens.
 *
 * Anchors, not routes: a seeder has one decision (what do I hold), one budget
 * (what may it use), and one thing to read (who do I ask). Deep links nobody
 * types are empty-state work with no user.
 *
 * Nothing is pre-ticked, the totals are live, and the button is disabled with a
 * reason instead of a silent refusal. A reciter that has left the catalogue is
 * still on disk and still seeding, so it keeps a row until the person removes it.
 */

import { useEffect, useMemo, useState } from 'react';
import { browser } from 'wxt/browser';

import { formatBytes } from '@/lib/badge';
import type { HeldReciter, Reciter } from '@/lib/catalogue';
import { DEFAULT_SORT, sortReciters, type Sort, type SortKey } from '@/lib/sort';
import { NEW_SEEN_KEY, markSeen, pickNew } from '@/lib/new-reciter';
import { planSelection } from '@/lib/selection';
import { loadHeld, loadSettings, parseUploadMbps, saveHeld, saveSettings, type Settings } from '@/lib/settings';
import { fetchCatalogue } from '@/lib/sync';
import { ask } from '@/lib/ui-bridge';
import { copyFor, pickLang } from '@/ui/i18n';
import { ArrowIcon, InfoIcon, ListIcon, PlusIcon, SlidersIcon, TrashIcon } from '@/ui/icons';
import { LEGAL_CONTACT, PRIVACY, SUGGEST_BODY, SUGGEST_SUBJECT, TERMS, type LegalDoc } from '@/ui/legal';

type Disk = { quota: number; usage: number };

const PENDING_KEY = 'tilawah-companion.pending.v1';

export default function App() {
  const copy = useMemo(() => copyFor(pickLang(browser.i18n.getUILanguage())), []);
  const lang = copy.dir === 'rtl' ? 'ar' : 'en';
  const manifest = browser.runtime.getManifest();

  const [rows, setRows] = useState<Reciter[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [held, setHeld] = useState<HeldReciter[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [uploadDraft, setUploadDraft] = useState('1');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [fresh, setFresh] = useState<Reciter[]>([]);
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
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
      browser.storage.local.get(NEW_SEEN_KEY),
      navigator.storage?.estimate?.().catch(() => undefined) ?? Promise.resolve(undefined),
    ]).then(
      async ([roster, storedHeld, storedSettings, storedSeen, estimate]) => {
        if (!live) return;

        const seen = Array.isArray(storedSeen[NEW_SEEN_KEY]) ? (storedSeen[NEW_SEEN_KEY] as string[]) : [];
        const freshly = pickNew(roster, seen);
        // First visit: learn the roster instead of announcing twelve arrivals.
        const nextSeen = seen.length === 0 ? roster.map((row) => row.infohash) : markSeen(seen, freshly.map((row) => row.infohash));
        await browser.storage.local.set({ [NEW_SEEN_KEY]: nextSeen, [PENDING_KEY]: freshly.length });
        if (!live) return;

        setRows(roster);
        setFresh(freshly);
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
  const unpublished = held.filter((reciter) => !catalogueHashes.has(reciter.infohash));
  const chosen = rows.filter((reciter) => selected.has(reciter.infohash));
  const ordered = sortReciters(rows, sort, lang === 'ar' ? 'ar' : 'en');

  const unknownSize =
    chosen.some((reciter) => typeof reciter.sizeBytes !== 'number' || reciter.sizeBytes <= 0) ||
    unpublished.some((reciter) => typeof reciter.sizeBytes !== 'number' || reciter.sizeBytes <= 0);

  const addBytes = chosen
    .filter((reciter) => !heldHashes.has(reciter.infohash))
    .reduce((sum, reciter) => sum + (reciter.sizeBytes ?? 0), 0);
  const selectedBytes = chosen.reduce((sum, reciter) => sum + (reciter.sizeBytes ?? 0), 0);
  const publishedHeldBytes = held
    .filter((reciter) => catalogueHashes.has(reciter.infohash))
    .reduce((sum, reciter) => sum + (reciter.sizeBytes ?? 0), 0);

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

  const addFromStrip = (infohash: string) => {
    setSelected((current) => new Set(current).add(infohash));
    setFresh((current) => current.filter((row) => row.infohash !== infohash));
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
            held.find((existing) => existing.infohash === reciter.infohash)?.addedAt ?? new Date().toISOString(),
        })),
      ];

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
        reply.ok ? { text: copy.saved, tone: 'idle' } : { text: reply.error ?? copy.failed, tone: 'error' },
      );
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : String(error), tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const sortButton = (key: SortKey, label: string) => (
    <button
      type="button"
      aria-pressed={sort.key === key}
      onClick={() =>
        setSort((current) =>
          current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
        )
      }
    >
      {label}
      {sort.key === key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
    </button>
  );

  const legalBlock = (doc: { ar: LegalDoc; en: LegalDoc }, title: string) => (
    <details className="doc">
      <summary>{title}</summary>
      <div dir="rtl" lang="ar">
        {doc.ar.sections.map((part) => (
          <div key={part.heading}>
            <h3>{part.heading}</h3>
            {part.body.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ))}
      </div>
      <div dir="ltr" lang="en">
        {doc.en.sections.map((part) => (
          <div key={part.heading}>
            <h3>{part.heading}</h3>
            {part.body.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ))}
      </div>
    </details>
  );

  const suggestHref = `mailto:${LEGAL_CONTACT}?subject=${encodeURIComponent(
    SUGGEST_SUBJECT[lang],
  )}&body=${encodeURIComponent(SUGGEST_BODY[lang])}`;

  return (
    <main className="page" dir={copy.dir}>
      <header className="masthead">
        <img src="/icon/48.png" alt="" width={40} height={40} />
        <div className="title">
          <h1>{copy.title}</h1>
          <span className="meta">
            <bdi dir="ltr">{manifest.version_name ?? manifest.version}</bdi>
          </span>
        </div>
      </header>

      <p className="lede">{copy.lede}</p>

      <nav className="nav" aria-label={copy.navLabel}>
        <a href="#reciters">
          <ListIcon /> {copy.navReciters}
        </a>
        <a href="#settings">
          <SlidersIcon /> {copy.navSettings}
        </a>
        <a href="#about">
          <InfoIcon /> {copy.navAbout}
        </a>
      </nav>

      <section id="reciters" className="screen">
        {fresh.length > 0 ? (
          <div className="fresh">
            <h2>{copy.freshTitle}</h2>
            <ul>
              {fresh.map((reciter) => (
                <li key={reciter.infohash}>
                  <span style={{ flex: 1, minInlineSize: 0 }}>
                    <span className="name">{reciter.nameAr || reciter.name}</span>
                    <span className="meta">
                      {reciter.riwaya} · {reciter.sizeBytes ? formatBytes(reciter.sizeBytes) : copy.unknownSize}
                    </span>
                  </span>
                  <button type="button" className="ghost" onClick={() => addFromStrip(reciter.infohash)}>
                    <PlusIcon /> {copy.add}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

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

        {rows.length > 0 ? (
          <div className="sortbar" role="group" aria-label={copy.sortBy}>
            <span>{copy.sortBy}</span>
            {sortButton('name', copy.sortName)}
            {sortButton('riwaya', copy.sortRiwaya)}
            {sortButton('size', copy.sortSize)}
            {sortButton('new', copy.sortNew)}
          </div>
        ) : null}

        <ul className="roster">
          {ordered.map((reciter) => (
            <li key={reciter.infohash} data-infohash={reciter.infohash}>
              <label className="row">
                <input
                  type="checkbox"
                  checked={selected.has(reciter.infohash)}
                  onChange={() => toggle(reciter.infohash)}
                />
                <span>
                  <span className="name">
                    {reciter.nameAr || reciter.name}
                    {reciter.complete ? null : <span className="tag">{copy.partial}</span>}
                  </span>
                  <span className="meta">
                    {reciter.riwaya} ·{' '}
                    {reciter.sizeBytes ? formatBytes(reciter.sizeBytes) : copy.unknownSize}
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
                  <button type="button" className="ghost" onClick={() => void removeUnpublished(reciter.infohash)}>
                    <TrashIcon /> {copy.remove}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      {settings ? (
        <section id="settings" className="screen">
          <h2>{copy.settings}</h2>

          <div className="grid">
            <div className="field">
              <label htmlFor="max-reciters">{copy.maxReciters}</label>
              <select
                id="max-reciters"
                value={settings.maxReciters}
                onChange={(event) => setSettings({ ...settings, maxReciters: Number(event.target.value) })}
              >
                {[1, 2, 3, 4, 5, 6].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <small>{copy.maxRecitersHint}</small>
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
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.pauseOnBattery}
                onChange={(event) => setSettings({ ...settings, pauseOnBattery: event.target.checked })}
              />
              <span>
                <span className="name">{copy.pauseBattery}</span>
                <span className="meta">{copy.pauseBatteryHint}</span>
              </span>
            </label>
          ) : null}

          {canReadConnection ? (
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.pauseOnMetered}
                onChange={(event) => setSettings({ ...settings, pauseOnMetered: event.target.checked })}
              />
              <span>
                <span className="name">{copy.pauseMetered}</span>
                <span className="meta">{copy.pauseMeteredHint}</span>
              </span>
            </label>
          ) : null}

          <div className="grid">
            <div className="field">
              <label className="toggle" htmlFor="schedule">
                <input
                  id="schedule"
                  type="checkbox"
                  checked={settings.schedule !== null}
                  onChange={(event) =>
                    setSettings({ ...settings, schedule: event.target.checked ? { from: 22, to: 7 } : null })
                  }
                />
                <span>
                  <span className="name">{copy.schedule}</span>
                  <span className="meta">{copy.scheduleHint}</span>
                </span>
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

      <section id="about" className="screen">
        <h2>{copy.navAbout}</h2>
        <p>{copy.aboutP1}</p>
        <p>{copy.aboutP2}</p>

        <div className="links">
          <a href={`mailto:${LEGAL_CONTACT}`}>
            <ArrowIcon /> {copy.contactUs} — {LEGAL_CONTACT}
          </a>
          <a href={suggestHref}>
            <PlusIcon /> {copy.suggestReciter}
          </a>
        </div>

        {legalBlock(PRIVACY, copy.privacyTitle)}
        {legalBlock(TERMS, copy.termsTitle)}

        <p className="meta" style={{ marginBlockStart: '1.5rem' }}>
          <bdi dir="ltr">{manifest.version_name ?? manifest.version}</bdi>
        </p>
      </section>

      <div className="bar">
        <span className="totals">
          {copy.selectedLabel}: <bdi>{chosen.length}</bdi> · <bdi>{formatBytes(selectedBytes)}</bdi> /{' '}
          {copy.capLabel}: <bdi>{settings?.maxReciters ?? 2}</bdi>
        </span>
        <button type="button" className="primary" onClick={() => void save()} disabled={!plan.allowed || saving}>
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
