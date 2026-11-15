/**
 * The background is a router and a clock, not an engine.
 *
 * It owns the tick, which asks three questions in order: may we run (the
 * person's rules), what is the engine doing (for the badge), and has the roster
 * changed (for a notification). It never touches a torrent: on Chrome its worker
 * is disposable and the engine lives in an offscreen document.
 */

import { browser } from 'wxt/browser';

import { callEngine, ensureHost } from '@/hosts';
import { badgeFor, type BadgeColor } from '@/lib/badge';
import type { HeldReciter } from '@/lib/catalogue';
import { isEngineRequest, type EngineReply } from '@/lib/messages';
import { loadHeld, loadSettings } from '@/lib/settings';
import type { HeldState } from '@/lib/state';
import { fetchCatalogue, planSync, type SyncNotice } from '@/lib/sync';
import { shouldRun } from '@/lib/limits';

const TICK = 'tilawah-companion.tick';
const TICK_MINUTES = 30;
const SYNC_EVERY_MS = 24 * 60 * 60 * 1000;
const SYNC_KEY = 'tilawah-companion.sync.v1';
const SEEN_KEY = 'tilawah-companion.notices.v1';

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
    // A browser without an action (rare, and never the ones we ship) must not
    // break the tick.
    console.warn('badge unavailable', error);
  }
};

type SyncState = { lastAt: number };

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

const tick = async (): Promise<void> => {
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

  const snapshot = await callEngine({ type: 'engine:snapshot' });
  const states = snapshot.states ?? [];

  await callEngine({ type: gate.run ? 'engine:resume' : 'engine:pause' });
  await paintBadge(gate.run ? states : states.map((state) => ({ ...state, state: 'paused' as const })), gate.reason);

  await syncRoster();
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
      // The engine's own channel belongs to the offscreen document; a background
      // that also answered it would race the real answer.
      if (isEngineRequest(message)) return false;

      if (message && typeof message === 'object' && (message as { type?: unknown }).type === 'state:snapshot') {
        void callEngine({ type: 'engine:snapshot' })
          .then((reply: EngineReply) => sendResponse({ ok: reply.ok, states: reply.states ?? [], error: reply.error }))
          .catch((error: unknown) =>
            sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }),
          );
        return true;
      }

      if (message && typeof message === 'object' && (message as { type?: unknown }).type === 'state:tick') {
        void tick().then(() => sendResponse({ ok: true }));
        return true;
      }

      return false;
    });
  },
});
