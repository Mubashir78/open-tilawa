/**
 * The only door a page has to the engine.
 *
 * Pages do not call the engine directly, even on Chrome where the offscreen
 * document would answer: the background owns the clock and the person's rules,
 * and a page that starts a torrent itself would bypass both — on Firefox it
 * would also run a second engine that dies with the tab.
 */

import { browser } from 'wxt/browser';

import type { UiReply, UiRequest } from './messages';

export async function ask(request: UiRequest): Promise<UiReply> {
  try {
    const reply = (await browser.runtime.sendMessage(request)) as UiReply | undefined;
    return reply ?? { ok: false, error: 'the background did not answer' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
