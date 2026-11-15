/**
 * WebTorrent arrives as a global script in the offscreen document, not as an
 * import: the npm package resolves to its Node entry under Vite, and there
 * `FSChunkStore extends fs` — an undefined class in a browser. The bundle in
 * `public/` is the browser build the site already ships to listeners.
 *
 * The surface below is exactly what the engine touches, so the rest of the code
 * is typed without pretending to know the library.
 */
export type TorrentLike = {
  infoHash: string;
  progress: number;
  numPeers: number;
  uploaded: number;
  paused: boolean;
  ready: boolean;
  destroy: (opts?: { destroyStore?: boolean }) => void;
  pause: () => void;
  resume: () => void;
  addWebSeed: (url: string) => void;
  on: (event: 'error' | 'ready', handler: (error?: Error) => void) => void;
};

export type WebTorrentClientLike = {
  add: (id: string, opts?: Record<string, unknown>) => TorrentLike;
  remove: (id: string, opts?: { destroyStore?: boolean }) => void;
  throttleUpload: (rate: number) => void;
  destroy: (cb?: () => void) => void;
};

export type WebTorrentCtor = new (opts?: { uploadLimit?: number; maxConns?: number }) => WebTorrentClientLike;

declare global {
  // Assigned by `/webtorrent.min.js` in the offscreen document.
  var WebTorrent: WebTorrentCtor | undefined;
}

export function loadWebTorrent(): WebTorrentCtor {
  const ctor = globalThis.WebTorrent;
  if (typeof ctor !== 'function') {
    throw new Error('the WebTorrent bundle did not load in this context');
  }
  return ctor;
}
