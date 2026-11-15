/**
 * The offscreen document: a page nobody sees whose only job is to keep the
 * engine alive and answer the background.
 *
 * It has no UI and no state of its own — `handleEngine` owns both. Anything more
 * here would be a second source of truth for "what is held".
 */

import { browser } from 'wxt/browser';

import { handleEngine } from '@/hosts/local-engine';
import { isEngineRequest } from '@/lib/messages';

browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isEngineRequest(message)) return false;

  void handleEngine(message).then(sendResponse);
  // Keep the channel open for the async answer.
  return true;
});
