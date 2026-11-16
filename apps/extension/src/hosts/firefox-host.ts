/**
 * Firefox MV2: the background page is persistent and has a DOM, so the engine
 * lives here. There is no offscreen API in Firefox, and none is needed.
 */

import { handleEngine } from './local-engine';
import type { EngineReply, EngineRequest } from '@/lib/messages';

export async function ensureHost(): Promise<void> {
  // Nothing to create: importing this module is the host.
}

export async function callEngine(request: EngineRequest): Promise<EngineReply> {
  return handleEngine(request);
}
