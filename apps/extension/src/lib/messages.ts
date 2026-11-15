import type { HeldReciter } from './catalogue';
import type { HeldState } from './state';

/**
 * The one wire between the background and whichever context runs the engine.
 *
 * Chrome: background → offscreen document. Firefox: background → itself, since
 * the MV2 background page can hold the engine directly. Both sides speak this
 * shape, so nothing above the host layer knows which browser it is on.
 */
export type EngineRequest =
  | { type: 'engine:start' }
  | { type: 'engine:add'; reciter: HeldReciter }
  | { type: 'engine:remove'; infohash: string }
  | { type: 'engine:snapshot' }
  | { type: 'engine:pause' }
  | { type: 'engine:resume' }
  | { type: 'engine:upload'; mbps: number };

export type EngineReply = {
  ok: boolean;
  states?: HeldState[];
  error?: string;
};

export const isEngineRequest = (value: unknown): value is EngineRequest =>
  !!value && typeof value === 'object' && typeof (value as { type?: unknown }).type === 'string' &&
  (value as { type: string }).type.startsWith('engine:');
