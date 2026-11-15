/**
 * Everything the interface says about the product in one place: who to write to,
 * where the stats live, and which store links exist.
 *
 * A link is rendered only when it is real. Today no listing has been submitted,
 * so there are no store URLs — a placeholder that 404s is worse than a line that
 * is not there.
 */

export const BRAND = {
  contact: 'contact@tilawah.cc',
  site: 'https://tilawah.cc',
  trackerStats: 'https://tracker.tilawah.cc/stats',
  catalogue: 'https://console.tilawah.cc/api/public/reciters?page=1&range=200',
  /** Rendered only once a listing exists; empty means "not yet". */
  chromeStore: '',
  firefoxAddons: '',
} as const;

export const hasStoreLinks = (): boolean => Boolean(BRAND.chromeStore || BRAND.firefoxAddons);
