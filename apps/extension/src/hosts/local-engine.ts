/**
 * The engine's owner in any context that can host it.
 *
 * At most one engine per context, created on first use. Every entry point (the
 * offscreen document, the Firefox background page, a probe script) goes through
 * `handleEngine` so there is exactly one place where settings and the held list
 * are read and the engine is told to start.
 */

import type { HeldReciter } from '@/lib/catalogue';
import { createEngine, supportsPersistentStore, type Engine } from '@/lib/engine';
import { readDevice } from '@/lib/device';
import { isEngineRequest, type EngineReply, type EngineRequest } from '@/lib/messages';
import { DEFAULTS, loadHeld, loadSettings, type Settings } from '@/lib/settings';
import { ensureWebTorrent } from './web-torrent-bundle';

let engine: Engine | null = null;
/** Two callers can arrive together (the background's tick and the options page). */
let creating: Promise<Engine> | null = null;

async function ensureEngine(settings?: Settings): Promise<Engine> {
  if (engine) {
    if (settings) engine.setUploadMbps(settings.uploadMbps);
    return engine;
  }

  if (!creating) {
    // An offscreen document has no `chrome.storage` — only `runtime`. So the
    // background (or the options page) hands the engine its settings and held
    // list; reading storage here is the Firefox path, where it is available.
    creating = loadSettings()
      .catch(() => DEFAULTS)
      .then((stored) => {
        engine = createEngine(settings ?? stored);
        return engine;
      })
      .finally(() => {
        creating = null;
      });
  }

  return creating;
}

export async function handleEngine(request: EngineRequest): Promise<EngineReply> {
  if (!isEngineRequest(request)) return { ok: false, error: 'unknown request' };

  try {
    // The page hosting the engine is also the only context that can read the
    // battery; the background asks rather than measuring in a worker that cannot.
    if (request.type === 'state:device') return { ok: true, device: await readDevice() };

    // A copy that vanishes with the host is worse than no copy; refuse rather
    // than download into memory.
    if (!supportsPersistentStore()) {
      return { ok: false, error: 'this browser cannot keep a copy (no File System Access storage)' };
    }

    // The bundle is fetched once per host, before any torrent work.
    await ensureWebTorrent();

    const settings = request.type === 'engine:start' ? request.settings : undefined;
    const live = await ensureEngine(settings);

    switch (request.type) {
      case 'engine:start': {
        const [storedSettings, storedHeld] = await Promise.all([
          settings ? Promise.resolve(settings) : loadSettings().catch(() => DEFAULTS),
          request.held ? Promise.resolve(request.held) : loadHeld<HeldReciter>().catch(() => []),
        ]);
        if (storedSettings.paused) {
          live.pause();
          return { ok: true, states: live.snapshot() };
        }
        // Resume before adding: a torrent created paused and resumed afterwards
        // connects to its web seed but never requests a piece.
        live.resume();
        await live.start(storedHeld);
        live.setUploadMbps(storedSettings.uploadMbps);
        return { ok: true, states: live.snapshot() };
      }
      case 'engine:add':
        await live.add(request.reciter);
        return { ok: true, states: live.snapshot() };
      case 'engine:remove':
        await live.remove(request.infohash);
        return { ok: true, states: live.snapshot() };
      case 'engine:pause':
        live.pause();
        return { ok: true, states: live.snapshot() };
      case 'engine:resume':
        live.resume();
        return { ok: true, states: live.snapshot() };
      case 'engine:upload':
        live.setUploadMbps(request.mbps);
        return { ok: true, states: live.snapshot() };
      case 'engine:snapshot':
      default:
        return { ok: true, states: live.snapshot() };
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
