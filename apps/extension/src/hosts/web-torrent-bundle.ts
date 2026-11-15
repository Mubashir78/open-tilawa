/**
 * Loading WebTorrent, the way the site already does it.
 *
 * The file in `public/` is an **ES module** (`export { … as default }`), not a
 * UMD global, and Vite cannot bundle the npm package for a browser: it resolves
 * the Node entry, where `FSChunkStore extends fs` — an undefined class, and the
 * engine dies with "Class extends value undefined is not a constructor".
 *
 * So: a dynamic import of the published file, ignoring Vite's resolver, then park
 * the constructor on the global the engine reads. One copy, same bytes the
 * listeners download.
 */

let loading: Promise<void> | null = null;

export function ensureWebTorrent(): Promise<void> {
  if (globalThis.WebTorrent) return Promise.resolve();
  if (loading) return loading;

  loading = (async () => {
    const url = new URL('/webtorrent.min.js', location.origin).href;

    // `@vite-ignore` keeps Vite from rewriting the specifier at build time.
    const mod = (await import(/* @vite-ignore */ url)) as { default?: unknown } | undefined;
    const ctor = mod?.default ?? mod;
    if (typeof ctor !== 'function') throw new Error('the WebTorrent bundle did not export a constructor');
    globalThis.WebTorrent = ctor as NonNullable<typeof globalThis.WebTorrent>;
  })().finally(() => {
    loading = null;
  });

  return loading;
}
