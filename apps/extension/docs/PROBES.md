# Probes

The unit suite covers decisions. These four cover the things only a browser can
answer — and their results are recorded with dates, because a probe that is not
written down gets re-guessed.

Run: `npm run probe` (wraps `xvfb-run`; needs no display, and uses Playwright's
bundled Chromium because Chrome 137+ ignores `--load-extension`).

| Probe | What it proves | How | Result |
| --- | --- | --- | --- |
| **P2** build | both targets build, the offscreen page ships, the Firefox background is persistent | `npm run build && npm run build:firefox && npm run audit`, then load `chrome-mv3` unpacked | **PASS** 2026-11-15 — `offscreen.html` present, Firefox manifest has `"persistent": true`, permission audit clean |
| **P3** persistence | a held reciter survives a reload without downloading again | probe: seed the smallest reciter, reload the options page, wait for `progress === 1` | **PASS** 2026-11-15 — complete again in 0 s (OPFS store, 118 MB torrent) |
| **P4** tracker | the extension is a WebRTC peer listeners can actually reach | probe: compare `tracker.tilawah.cc/stats` before and after | **PASS** 2026-11-15 — WebTorrent clients on the tracker went 2 → 3 while the extension ran |
| **P1** Firefox idle | a persistent MV2 background keeps seeding with the browser untouched | load `firefox-mv2` via `about:debugging`, seed one reciter, leave it idle 10 minutes, read `peersSeederOnly` | **NOT RUN** — no Firefox on this machine (2026-11-15) |

## P1 method and decision rule

1. `npm run build:firefox`, then `about:debugging#/runtime/this-firefox` → *Load
   Temporary Add-on* → `.output/firefox-mv2/manifest.json`.
2. Pick one reciter in the options page, start, wait until it reaches `seeding`.
3. Leave the browser alone for ten minutes (no window focus).
4. `curl -s -H 'Accept: application/json' https://tracker.tilawah.cc/stats`.

Decision rule from the spec: if the seeder is still visible after ten idle
minutes, Firefox ships in v1. If it has dropped, Firefox is dropped from v1 —
shipping a seeder that silently sleeps is worse than not shipping it.

**Open until AMO submission.** Firefox is expected to hold: MV2 background pages
are persistent by declaration (`defineBackground({ persistent: true })` is in the
built manifest), and Gecko does not apply the Chrome service-worker eviction to
them. The probe exists for the day that stops being true.

## What the probe found that the unit tests could not

Three defects, all invisible without a browser:

1. An offscreen document has **no `chrome.storage`** — only `runtime`. The engine
   now receives its settings and held list in the `engine:start` message.
2. Vite resolves the `webtorrent` package to its **Node entry** (`FSChunkStore
   extends fs`), which dies in a browser. The engine loads the published browser
   bundle (`public/webtorrent.min.js`, an ES module) instead.
3. WebTorrent does not dial a torrent's own `url-list` in the browser. The engine
   adds `https://tilawah.cc/media/` as a web seed explicitly, the same fallback the
   player uses — without it a quiet swarm is a permanent zero.

And one that would have shipped silently: a torrent added by **URL** has no
`infoHash` until metadata arrives, so keying the engine's map by
`torrent.infoHash` made every reciter `undefined` for a moment. Keyed by the hash
we asked for, it is right from the first frame.
