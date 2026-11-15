/**
 * What one held reciter is doing, as the UI reads it.
 *
 * The engine produces these, the popup renders them, and the badge reduces them
 * to a colour. Keeping the shape in its own module is what lets the badge and the
 * popup be tested without a browser: neither imports WebTorrent.
 */
export type HeldState = {
  infohash: string;
  state: 'queued' | 'downloading' | 'seeding' | 'paused' | 'error';
  peers: number;
  /** 0–1, from WebTorrent's `progress`. */
  progress: number;
  uploadedToday: number;
};
