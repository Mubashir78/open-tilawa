/**
 * Which host this build uses.
 *
 * Chosen by manifest version, because that is the one thing that is actually
 * different: MV3 has an offscreen API and a disposable worker, MV2 Firefox has a
 * persistent page and no offscreen API. The extra feature check covers a Chromium
 * that is MV3 but older than the offscreen document (before 109) — there the
 * engine falls back to the background itself, which is worse but not broken.
 */

import * as chromeHost from './chrome-offscreen';
import * as firefoxHost from './firefox-host';
import type { EngineReply, EngineRequest } from '@/lib/messages';

const hasOffscreen = (): boolean =>
  typeof (globalThis as { chrome?: { offscreen?: unknown } }).chrome?.offscreen !== 'undefined';

export const useOffscreen = (): boolean => import.meta.env.MANIFEST_VERSION === 3 && hasOffscreen();

export const ensureHost = (): Promise<void> =>
  useOffscreen() ? chromeHost.ensureHost() : firefoxHost.ensureHost();

export const callEngine = (request: EngineRequest): Promise<EngineReply> =>
  useOffscreen() ? chromeHost.callEngine(request) : firefoxHost.callEngine(request);
