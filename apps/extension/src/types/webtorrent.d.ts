/**
 * WebTorrent ships no type declarations, and pulling `@types/webtorrent` would
 * describe a much larger surface than this extension touches. This is the whole
 * of what the engine uses, written down so the rest of the code can be typed.
 */
declare module 'webtorrent' {
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
    on: (event: 'error', handler: (error: Error) => void) => void;
  };

  export default class WebTorrent {
    constructor(opts?: { uploadLimit?: number; maxConns?: number });
    add(id: string, opts?: Record<string, unknown>): TorrentLike;
    remove(id: string, opts?: { destroyStore?: boolean }): void;
    throttleUpload(rate: number): void;
    destroy(cb?: () => void): void;
  }
}
