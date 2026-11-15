/**
 * The background is the only context that may decide anything.
 *
 * It owns three things: the clock (may we run?), the counters (how much did we
 * give?), and the catalogue conversation. It answers every UI request, forwards
 * engine work to the host (offscreen document on Chrome, itself on Firefox), and
 * reconciles the host against what is stored — a restarted browser, an evicted
 * worker, or a torrent that failed all look the same from here: a hash we hold
 * and a host that does not have it.
 *
 * It never touches a torrent directly: on Chrome its worker is disposable.
 */

import { browser } from 'wxt/browser';

import { callEngine, ensureHost } from '@/hosts';
import { badgeFor, type BadgeColor } from '@/lib/badge';
import type { HeldReciter } from '@/lib/catalogue';
import type { Counters, EngineReply, UiReply, UiRequest } from '@/lib/messages';
import { loadHeld, loadSettings, saveSettings } from '@/lib/settings';
import type { HeldState } from '@/lib/state';
import { fetchCatalogue, planSync, type SyncNotice } from '@/lib/sync';
import { shouldRun } from '@/lib/limits';

const TICK = 'tilawah-companion.tick';
const TICK_MINUTES = 30;
const SYNC_EVERY_MS = 24 * 60 * 60 * 1000;
const SYNC_KEY = 'tilawah-companion.sync.v1';
const SEEN_KEY = 'tilawah-companion.notices.v1';
const COUNTERS_KEY = 'tilawah-companion.counters.v1';

const COLOURS: Record<BadgeColor, string> = {
  green: '#2f7d4f',
  blue: '#2f5f7d',
  grey: '#8a8a8f',
  red: '#a4402f',
};

const paintBadge = async (states: HeldState[], reason: string | null): Promise<void> => {
  const badge = badgeFor(states, reason);
  try {
    await browser.action.setBadgeBackgroundColor({ color: COLOURS[badge.color] });
    await browser.action.setBadgeText({ text: badge.text });
    await browser.action.setTitle({ title: badge.title });
  } catch (error) {
    console.warn('badge unavailable', error);
  }
};

type SyncState = { lastAt: number };
type CounterState = Counters & { dayKey: string; lastSeen: Record<string, number> };

const todayKey = (): string => new Date().toISOString().slice(0, 10);

/**
 * Counters live here, not in the engine: an offscreen document cannot reach
 * `chrome.storage`, and an in-memory baseline dies with the host — which would
 * quietly report yesterday's uploads as zero.
 */
const addCounters = async (states: HeldState[]): Promise<Counters> => {
  const stored = await browser.storage.local.get(COUNTERS_KEY);
  const previous = (stored[COUNTERS_KEY] ?? {
    today: 0,
    total: 0,
    dayKey: todayKey(),
    lastSeen: {},
  }) as CounterState;

  const dayKey = todayKey();
  const rolled = previous.dayKey !== dayKey;
  const lastSeen: Record<string, number> = rolled ? {} : { ...previous.lastSeen };

  let today = rolled ? 0 : previous.today;
  let total = previous.total;

  for (const state of states) {
    const delta = Math.max(0, state.uploadedToday - (lastSeen[state.infohash] ?? 0));
    if (delta === 0) continue;
    today += delta;
    total += delta;
    lastSeen[state.infohash] = state.uploadedToday;
  }

  const next: CounterState = { today, total, dayKey, lastSeen };
  await browser.storage.local.set({ [COUNTERS_KEY]: next });
  return { today, total };
};

const readCounterState = async (): Promise<CounterState> => {
  const stored = await browser.storage.local.get(COUNTERS_KEY);
  const value = (stored[COUNTERS_KEY] ?? { today: 0, total: 0, dayKey: todayKey(), lastSeen: {} }) as CounterState;
  return value.dayKey === todayKey() ? value : { ...value, today: 0, dayKey: todayKey() };
};

const syncRoster = async (): Promise<void> => {
  const stored = await browser.storage.local.get([SYNC_KEY, SEEN_KEY]);
  const state = (stored[SYNC_KEY] ?? { lastAt: 0 }) as SyncState;
  if (Date.now() - state.lastAt < SYNC_EVERY_MS) return;

  const held = await loadHeld<HeldReciter>();
  let notices: SyncNotice[] = [];
  try {
    notices = planSync(held, await fetchCatalogue()).notices;
  } catch (error) {
    // A failed fetch is not an empty catalogue. Keep the last answer, try again
    // on the next tick, and say nothing to the person.
    console.warn('catalogue unavailable', error);
    return;
  }

  const seen = new Set<string>(Array.isArray(stored[SEEN_KEY]) ? (stored[SEEN_KEY] as string[]) : []);
  for (const notice of notices) {
    const key = `${notice.kind}:${notice.infohash}`;
    if (seen.has(key)) continue;
    seen.add(key);
    await browser.notifications.create(key, {
      type: 'basic',
      iconUrl: '/icon/128.png',
      title: 'Tilawah Companion',
      message: notice.text,
    });
  }

  await browser.storage.local.set({
    [SYNC_KEY]: { lastAt: Date.now() },
    [SEEN_KEY]: [...seen].slice(-50),
  });
};

/** Notices the person has not opened the picker for yet. */
const pendingNotices = async (): Promise<number> => {
  const stored = await browser.storage.local.get(SEEN_KEY);
  const seen = Array.isArray(stored[SEEN_KEY]) ? (stored[SEEN_KEY] as string[]) : [];
  const unopened = Number((await browser.storage.local.get('tilawah-companion.notices-opened.v1'))['tilawah-companion.notices-opened.v1'] ?? 0);
  return Math.max(0, seen.length - unopened);
};

const snapshot = async (): Promise<EngineReply> => callEngine({ type: 'engine:snapshot' });

/**
 * Ask the host for its torrents, and give it anything stored but missing.
 *
 * A Chrome offscreen document, a restarted browser and a failed torrent all look
 * the same from here; `engine:start` is idempotent by hash, so the reconcile is
 * simply "send the stored list, let the host skip what it already has".
 */
const reconcile = async (): Promise<{ states: HeldState[]; error?: string }> => {
  const held = await loadHeld<HeldReciter>();
  const current = await snapshot();
  const states = current.states ?? [];

  if (held.length > 0 && states.length < held.length) {
    const settings = await loadSettings();
    const restarted = await callEngine({ type: 'engine:start', settings, held });
    return { states: restarted.states ?? states, error: restarted.error };
  }

  return { states, error: current.error };
};

const tick = async (): Promise<UiReply> => {
  const settings = await loadSettings();

  const device = (await callEngine({ type: 'state:device' })).device ?? {
    onBattery: false,
    batteryLevel: null,
    metered: null,
  };

  const gate = shouldRun({
    paused: settings.paused,
    onBattery: settings.pauseOnBattery && device.onBattery,
    batteryLevel: device.batteryLevel,
    metered: settings.pauseOnMetered ? device.metered : false,
    schedule: settings.schedule,
    hour: new Date().getHours(),
  });

  const { states } = await reconcile();

  const applied = await callEngine({ type: gate.run ? 'engine:resume' : 'engine:pause' });
  const after = applied.states ?? states;

  await paintBadge(
    gate.run ? after : after.map((state) => ({ ...state, state: 'paused' as const })),
    gate.reason,
  );

  const counters = await addCounters(after);
  await syncRoster();

  return {
    ok: true,
    states: after,
    counters,
    pending: await pendingNotices(),
    error: applied.error,
  };
};

const handleUi = async (request: UiRequest): Promise<UiReply> => {
  switch (request.type) {
    case 'state:start': {
      const [settings, held] = await Promise.all([loadSettings(), loadHeld<HeldReciter>()]);
      await ensureHost();
      await callEngine({ type: 'engine:start', settings, held });
      // Adding and resuming are the same moment, and the gate is applied there.
      return tick();
    }
    case 'state:pause': {
      await saveSettings({ paused: true });
      const reply = await callEngine({ type: 'engine:pause' });
      await paintBadge(reply.states ?? [], 'paused');
      return { ok: reply.ok, states: reply.states, error: reply.error };
    }
    case 'state:resume': {
      await saveSettings({ paused: false });
      return tick();
    }
    case 'state:remove': {
      const reply = await callEngine({ type: 'engine:remove', infohash: request.infohash });
      return { ok: reply.ok, states: reply.states, error: reply.error };
    }
    case 'state:counters': {
      const counters = await readCounterState();
      return { ok: true, counters: { today: counters.today, total: counters.total }, pending: await pendingNotices() };
    }
    case 'state:snapshot': {
      const reply = await reconcile();
      const counters = await readCounterState();
      return {
        ok: true,
        states: reply.states,
        counters: { today: counters.today, total: counters.total },
        pending: await pendingNotices(),
        error: reply.error,
      };
    }
    case 'state:tick':
    default:
      return tick();
  }
};

export default defineBackground({
  // MV2 Firefox: a persistent page is the whole point — a seeder that sleeps is
  // not a seeder. MV3 ignores the flag (an offscreen document holds the engine).
  persistent: true,
  main() {
    void ensureHost().catch((error: unknown) => console.warn('host did not start', error));

    // `create` is idempotent per name, so a wake after eviction is harmless.
    void browser.alarms.create(TICK, { periodInMinutes: TICK_MINUTES });
    browser.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === TICK) void tick();
    });

    browser.runtime.onInstalled.addListener(() => void tick());
    browser.runtime.onStartup.addListener(() => void tick());

    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      // The engine's own channel belongs to the host; the background relaying it
      // would race the real answer.
      if (isEngineRequestMessage(message)) return false;

      const type = (message as { type?: unknown } | null)?.type;
      if (typeof type !== 'string' || !type.startsWith('state:')) return false;

      void handleUi(message as UiRequest)
        .then(sendResponse)
        .catch((error: unknown) =>
          sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }),
        );
      return true;
    });
  },
});

function isEngineRequestMessage(value: unknown): boolean {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { type?: unknown }).type === 'string' &&
    (value as { type: string }).type.startsWith('engine:')
  );
}
