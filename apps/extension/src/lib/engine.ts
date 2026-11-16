/**
 * The seed engine: the only part of the extension that touches the network.
 *
 * It is deliberately dumb. It holds torrents, reports what they are doing, and
 * obeys two numbers (upload rate, paused). It does not decide what to add, when
 * to run, or what to tell anyone — those are policy, they live in pure modules,
 * and they are tested without a browser.
 *
 * Two facts about WebTorrent 3 shape everything here. In a browser it stores to
 * OPFS when the browser has it (`fsa-chunk-store` behind `fs-chunk-store`), so a
 * restart re-verifies rather than re-downloads. And `uploadLimit` /
 * `throttleUpload` are **bytes per second**, while the setting is Mbps.
 */

import { loadWebTorrent, type TorrentLike, type WebTorrentClientLike } from '@/types/webtorrent-global';
import type { HeldState } from './state';
import type { Settings } from './settings';
import { planStorage } from './storage-plan';
import type { HeldReciter } from './catalogue';

export const BYTES_PER_MBPS = 125_000;

/**
 * Where the audio actually lives. WebTorrent dials a torrent's own `url-list`
 * (the published `.torrent` carries this), so the engine does not add it again;
 * it is exported for the capability check and for the docs.
 */
export const WEB_SEED = 'https://tilawah.cc/media/';

/**
 * A copy that disappears when the host closes is worse than no copy: the
 * volunteer gave disk for nothing. WebTorrent falls back to memory when the
 * File System Access surface is missing, so this is asked before any download.
 */
export function supportsPersistentStore(): boolean {
  const storage = globalThis.navigator?.storage as { getDirectory?: unknown } | undefined;
  const handle = (globalThis as { FileSystemFileHandle?: { prototype?: { createWritable?: unknown } } })
    .FileSystemFileHandle;
  return typeof storage?.getDirectory === 'function' && typeof handle?.prototype?.createWritable === 'function';
}

const INFO_HASH = /^[0-9a-f]{40}$/i;

export type { HeldReciter } from './catalogue';

export function torrentUrl(infohash: string): string {
  return `https://tilawah.cc/torrents/${infohash.trim().toLowerCase()}.torrent`;
}

/**
 * Stored rows are data, not code: an older version, a hand-edited storage record,
 * or a row that lost its hash must not stop the other reciters from seeding.
 */
export function sanitizeHeld(list: unknown[]): HeldReciter[] {
  const seen = new Set<string>();
  const kept: HeldReciter[] = [];

  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Partial<HeldReciter>;
    const infohash = typeof row.infohash === 'string' ? row.infohash.trim().toLowerCase() : '';
    if (!INFO_HASH.test(infohash)) {
      console.warn('tilawah: skipping a held row with no usable infohash', entry);
      continue;
    }
    if (seen.has(infohash)) continue;
    seen.add(infohash);
    kept.push({ ...(row as HeldReciter), infohash });
  }

  return kept;
}

export function stateFor(input: {
  progress: number;
  numPeers: number;
  paused: boolean;
  ready?: boolean;
  error?: unknown;
}): HeldState['state'] {
  if (input.error) return 'error';
  if (input.paused) return 'paused';
  if (input.ready === false) return 'queued';
  if (input.progress >= 1) return 'seeding';
  return 'downloading';
}

export type Engine = {
  start(held: HeldReciter[]): Promise<void>;
  add(reciter: HeldReciter): Promise<void>;
  remove(infohash: string): Promise<void>;
  snapshot(): HeldState[];
  pause(): void;
  resume(): void;
  setUploadMbps(mbps: number): void;
  destroy(): void;
};

/**
 * Created once per host (offscreen document, or Firefox's background page).
 *
 * The day boundary lives here: `uploadedToday` is measured against a baseline
 * taken when the local date last changed, so a session that spans midnight does
 * not report yesterday's bytes as today's.
 */
export function createEngine(
  settings: Settings,
  options: { onState?: (states: HeldState[]) => void } = {},
): Engine {
  let client: WebTorrentClientLike | null = null;
  const torrents = new Map<string, TorrentLike>();
  const errors = new Map<string, unknown>();
  const baselines = new Map<string, number>();
  let dayKey = new Date().toDateString();
  let uploadMbps = settings.uploadMbps;
  let pausedAll = settings.paused;

  const rollDay = () => {
    const today = new Date().toDateString();
    if (today === dayKey) return;
    dayKey = today;
    for (const [hash, torrent] of torrents) baselines.set(hash, torrent.uploaded);
  };

  const ensureClient = () => {
    if (client) return client;
    // The bundle is a global script; loading it is the host's job (offscreen.html).
    const WebTorrent = loadWebTorrent();
    client = new WebTorrent({
      uploadLimit: uploadMbps * BYTES_PER_MBPS,
      maxConns: 55,
    });
    return client;
  };

  // Keyed by the hash we asked for, not by `torrent.infoHash`: a torrent added
  // by URL has no metadata yet, and its `infoHash` is undefined until then —
  // which quietly keyed the map `undefined` and lost the reciter.
  const attach = (infohash: string, torrent: TorrentLike) => {
    torrents.set(infohash, torrent);
    baselines.set(infohash, torrent.uploaded);
    errors.delete(infohash);
    torrent.on('error', (error) => errors.set(infohash, error as Error));

    if (pausedAll) torrent.pause();
  };

  return {
    async start(held) {
      const live = ensureClient();
      for (const reciter of sanitizeHeld(held)) {
        // A torrent that failed is retried on the next start, not tombstoned.
        if (errors.has(reciter.infohash)) {
          torrents.get(reciter.infohash)?.destroy();
          torrents.delete(reciter.infohash);
          errors.delete(reciter.infohash);
        }
        if (torrents.has(reciter.infohash)) continue;
        attach(reciter.infohash, live.add(torrentUrl(reciter.infohash), { paused: pausedAll }));
      }
    },

    async add(reciter) {
      const live = ensureClient();
      if (torrents.has(reciter.infohash)) return;
      attach(reciter.infohash, live.add(torrentUrl(reciter.infohash), { paused: pausedAll }));
    },

    async remove(infohash) {
      const hash = infohash.toLowerCase();
      // One removal path, awaited: `torrent.destroy()` would already remove it
      // from the client, and a second `client.remove` for the same id rejects.
      await new Promise<void>((resolve) => {
        if (!client) return resolve();
        client.remove(hash, { destroyStore: true }, () => resolve());
      });
      torrents.delete(hash);
      baselines.delete(hash);
      errors.delete(hash);
    },

    snapshot() {
      rollDay();
      const states: HeldState[] = [];
      for (const [hash, torrent] of torrents) {
        states.push({
          infohash: hash,
          state: stateFor({
            progress: torrent.progress,
            numPeers: torrent.numPeers,
            paused: torrent.paused,
            ready: torrent.ready,
            error: errors.get(hash),
          }),
          peers: torrent.numPeers,
          progress: torrent.progress,
          uploadedToday: Math.max(0, torrent.uploaded - (baselines.get(hash) ?? 0)),
          downloadSpeed: (torrent as { downloadSpeed?: number }).downloadSpeed ?? 0,
        });
      }
      options.onState?.(states);
      return states;
    },

    pause() {
      pausedAll = true;
      for (const torrent of torrents.values()) torrent.pause();
    },

    resume() {
      pausedAll = false;
      for (const torrent of torrents.values()) torrent.resume();
    },

    setUploadMbps(mbps) {
      uploadMbps = Number.isFinite(mbps) && mbps >= 0 ? mbps : 0;
      client?.throttleUpload(uploadMbps * BYTES_PER_MBPS);
    },

    destroy() {
      for (const torrent of torrents.values()) torrent.destroy({ destroyStore: false });
      torrents.clear();
      client?.destroy();
      client = null;
    },
  };
}

/**
 * Whether to start a download at all.
 *
 * Kept here as a one-liner over the tested `planStorage` so both hosts ask the
 * same question in the same words. The count cap is policy and lives in the
 * picker; this is the disk's own answer.
 */
export function canHold(input: {
  capBytes: number;
  heldBytes: number;
  usageBytes: number | null;
  addBytes: number;
}): boolean {
  return planStorage(input).fits;
}
