/**
 * The engine's owner in any context that can host it.
 *
 * At most one engine per context, created on first use. Every entry point (the
 * offscreen document, the Firefox background page, a probe script) goes through
 * `handleEngine` so there is exactly one place where settings and the held list
 * are read and the engine is told to start.
 */

import type { HeldReciter } from '@/lib/catalogue';
import { createEngine, type Engine } from '@/lib/engine';
import { readDevice } from '@/lib/device';
import { isEngineRequest, type EngineReply, type EngineRequest } from '@/lib/messages';
import { loadHeld, loadSettings } from '@/lib/settings';

let engine: Engine | null = null;

async function ensureEngine(): Promise<Engine> {
  if (engine) return engine;
  const [settings, held] = await Promise.all([loadSettings(), loadHeld<HeldReciter>()]);
  engine = createEngine(settings);
  await engine.start(held);
  return engine;
}

export async function handleEngine(request: EngineRequest): Promise<EngineReply> {
  if (!isEngineRequest(request)) return { ok: false, error: 'unknown request' };

  try {
    // The page hosting the engine is also the only context that can read the
    // battery; the background asks rather than measuring in a worker that cannot.
    if (request.type === 'state:device') return { ok: true, device: await readDevice() };

    const live = await ensureEngine();

    switch (request.type) {
      case 'engine:start': {
        const [settings, held] = await Promise.all([loadSettings(), loadHeld<HeldReciter>()]);
        live.pause();
        if (settings.paused) return { ok: true, states: live.snapshot() };
        await live.start(held);
        live.setUploadMbps(settings.uploadMbps);
        live.resume();
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
