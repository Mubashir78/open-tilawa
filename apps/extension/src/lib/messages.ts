import type { DeviceState } from './device';
import type { HeldReciter } from './catalogue';
import type { HeldState } from './state';
import type { Settings } from './settings';

/**
 * Two wires, and they must not be confused.
 *
 * `EngineRequest` travels **background → host** (offscreen document on Chrome,
 * the background itself on Firefox). `UiRequest` travels **UI → background**,
 * and only the background answers it: it owns the clock, the gate and the
 * counters, so a page that closed cannot leave a seeder running without one.
 */
export type EngineRequest =
  | { type: 'engine:start'; settings?: Settings; held?: HeldReciter[] }
  | { type: 'engine:add'; reciter: HeldReciter }
  | { type: 'engine:remove'; infohash: string }
  | { type: 'engine:snapshot' }
  | { type: 'engine:pause' }
  | { type: 'engine:resume' }
  | { type: 'engine:upload'; mbps: number }
  | { type: 'state:device' };

export type EngineReply = {
  ok: boolean;
  states?: HeldState[];
  device?: DeviceState;
  error?: string;
};

export type UiRequest =
  | { type: 'state:snapshot' }
  | { type: 'state:start' }
  | { type: 'state:pause' }
  | { type: 'state:resume' }
  | { type: 'state:remove'; infohash: string }
  | { type: 'state:counters' }
  | { type: 'state:tick' };

export type Counters = { today: number; total: number };

export type UiReply = {
  ok: boolean;
  states?: HeldState[];
  counters?: Counters;
  /** Catalogue notices the person has not seen yet (D13). */
  pending?: number;
  error?: string;
};

/** Engine-side messages only. `state:*` belongs to the background. */
export const isEngineRequest = (value: unknown): value is EngineRequest =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as { type?: unknown }).type === 'string' &&
  (value as { type: string }).type.startsWith('engine:');
