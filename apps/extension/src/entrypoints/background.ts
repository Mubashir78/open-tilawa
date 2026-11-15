/**
 * The background is a router, not an engine.
 *
 * It owns three things: keeping the host alive, answering "what is happening"
 * for the popup, and (from Task 9) the clock that decides when seeding may run.
 * It never touches a torrent directly — on Chrome it could not, because its
 * worker is disposable.
 */

import { browser } from 'wxt/browser';

import { callEngine, ensureHost } from '@/hosts';
import { isEngineRequest, type EngineReply } from '@/lib/messages';
import type { HeldState } from '@/lib/state';

export default defineBackground({
  // MV2 Firefox: a persistent page is the whole point — a seeder that sleeps is
  // not a seeder. MV3 ignores the flag (an offscreen document holds the engine).
  persistent: true,
  main() {
    void ensureHost().catch((error: unknown) => console.warn('host did not start', error));

    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      // The engine's own channel belongs to the offscreen document; a background
      // that also answered it would race the real answer.
      if (isEngineRequest(message)) return false;

      if (message && typeof message === 'object' && (message as { type?: unknown }).type === 'state:snapshot') {
        void callEngine({ type: 'engine:snapshot' })
          .then((reply: EngineReply) => {
            const states: HeldState[] = reply.states ?? [];
            sendResponse({ ok: reply.ok, states, error: reply.error });
          })
          .catch((error: unknown) =>
            sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }),
          );
        return true;
      }

      return false;
    });
  },
});
