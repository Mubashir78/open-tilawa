/**
 * Chrome MV3: an offscreen document, because a service worker may be evicted
 * after thirty idle seconds and a seeder must not be.
 *
 * `WEB_RTC` is the sanctioned reason and, unlike `AUDIO_PLAYBACK`, it carries no
 * lifetime limit. The justification string is read by store reviewers, so it says
 * the true thing in one sentence rather than "needed for functionality".
 */

import { browser } from 'wxt/browser';

import type { EngineReply, EngineRequest } from '@/lib/messages';

const OFFSCREEN_PATH = '/offscreen.html';

const JUSTIFICATION =
  "Keeps a WebRTC seed alive for the Tilawa Qur'an corpus while the extension is running.";

let creating: Promise<void> | null = null;

export async function ensureHost(): Promise<void> {
  // Chrome 116+ answers `getContexts`; before that the only reliable check is to
  // attempt creation and treat "already exists" as success.
  const existing =
    typeof browser.runtime.getContexts === 'function'
      ? await browser.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] }).catch(() => [])
      : [];

  if (existing.length > 0) return;
  if (creating) return creating;

  creating = (async () => {
    try {
      await browser.offscreen.createDocument({
        url: OFFSCREEN_PATH,
        // The typings model reasons as an enum; the runtime takes the string.
        reasons: ['WEB_RTC' as never],
        justification: JUSTIFICATION,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/single offscreen|already exists/i.test(message)) throw error;
    }
  })().finally(() => {
    creating = null;
  });

  return creating;
}

export async function callEngine(request: EngineRequest): Promise<EngineReply> {
  await ensureHost();
  const reply = (await browser.runtime.sendMessage(request)) as EngineReply | undefined;
  return reply ?? { ok: false, error: 'the seed engine did not answer' };
}
