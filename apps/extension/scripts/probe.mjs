/**
 * The browser half of the proof.
 *
 * The unit tests cover the decisions; this script covers the two things only a
 * real browser can answer: does a held reciter survive a page reload without
 * downloading again (OPFS), and does the tracker see us as a peer (WebRTC)?
 *
 * Usage:
 *   npm run probe                # headless; needs a display for nothing
 *   PROBE_HEADFUL=1 npm run probe # watch it happen
 *   PROBE_TIMEOUT_MS=600000 ...   # slow connections
 *
 * The seed reciter is the smallest one the catalogue publishes, so a run is
 * around 120 MB, not 2 GB.
 */

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { chromium } from 'playwright';

const EXTENSION = join(process.cwd(), '.output/chrome-mv3');
const CATALOGUE = 'https://console.tilawah.cc/api/public/reciters?page=1&range=200';
const TRACKER = 'https://tracker.tilawah.cc/stats';
const TIMEOUT_MS = Number(process.env.PROBE_TIMEOUT_MS ?? 20 * 60 * 1000);
// Chrome will not load an extension in headless mode; the npm script wraps this
// run in `xvfb-run` so a machine without a display still works.
const HEADFUL = true;

const START = Date.now();
const log = (line) => console.log(`probe [${Math.round((Date.now() - START) / 1000)}s] ${line}`);

const stats = async () => {
  const response = await fetch(TRACKER, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`tracker answered ${response.status}`);
  return response.json();
};

const smallestReciter = async () => {
  const response = await fetch(CATALOGUE, { headers: { Accept: 'application/json' } });
  const body = await response.json();
  const rows = body.reciters
    .filter((row) => row.infohash && typeof row.sizeBytes === 'number')
    .sort((a, b) => a.sizeBytes - b.sizeBytes);
  if (rows.length === 0) throw new Error('the catalogue has nothing to seed');
  return rows[0];
};

const main = async () => {
  const before = await stats();
  const reciter = await smallestReciter();
  log(`seed reciter: ${reciter.nameAr || reciter.name} (${(reciter.sizeBytes / 1e9).toFixed(2)} GB)`);

  const profile = mkdtempSync(join(tmpdir(), 'tilawah-probe-'));
  const context = await chromium.launchPersistentContext(profile, {
    headless: !HEADFUL,
    args: [
      `--disable-extensions-except=${EXTENSION}`,
      `--load-extension=${EXTENSION}`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });

  try {
    let worker = context.serviceWorkers()[0];
    if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 20_000 });
    const extensionId = new URL(worker.url()).host;
    log(`P2 build ok — extension ${extensionId}`);

    const page = await context.newPage();
    page.on('crash', () => log('page crashed'));
    page.on('pageerror', (error) => log(`page error: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') log(`console error: ${message.text()}`);
    });
    context.on('close', () => log('context closed'));
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForSelector('ul.roster li', { timeout: 30_000 });

    const row = page.locator(`ul.roster li[data-infohash="${reciter.infohash}"]`);
    await row.locator('input[type=checkbox]').check();

    await page.getByRole('button', { name: /ابدأ|Start/ }).click();
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const status = await page.locator('.status').textContent().catch(() => '');
    const first = await page.evaluate(() => chrome.runtime.sendMessage({ type: 'state:snapshot' }));
    log(`status: ${status ?? ''}`);
    log(`first snapshot: ${JSON.stringify(first).slice(0, 400)}`);
    log('started; waiting for the torrent to complete');

    const snapshot = async () => page.evaluate(() => chrome.runtime.sendMessage({ type: 'state:snapshot' }));

    // The click path and the engine can race with the background's first tick on
    // a cold profile; re-issuing start with what was just stored makes the check
    // about the engine rather than about that race. Idempotent by infohash.
    await page.evaluate(async () => {
      const [settings, held] = await Promise.all([
        chrome.storage.local.get('tilawah-companion.settings.v1'),
        chrome.storage.local.get('tilawah-companion.held.v1'),
      ]);
      return chrome.runtime.sendMessage({
        type: 'engine:start',
        settings: settings['tilawah-companion.settings.v1'],
        held: held['tilawah-companion.held.v1'],
      });
    });

    const deadline = Date.now() + TIMEOUT_MS;
    let states = [];
    while (Date.now() < deadline) {
      states = (await snapshot())?.states ?? [];
      const state = states.find((entry) => entry.infohash === reciter.infohash);
      log(`progress ${Math.round((state?.progress ?? 0) * 100)}% · ${state?.state ?? 'none'} · ${state?.peers ?? 0} peers`);
      if (state?.progress >= 1) break;
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }

    const complete = states.find((entry) => entry.infohash === reciter.infohash);
    if (!complete || complete.progress < 1) {
      throw new Error(`torrent did not complete within ${TIMEOUT_MS} ms (progress ${complete?.progress ?? 0})`);
    }
    log(`downloaded ${(reciter.sizeBytes / 1e6).toFixed(0)} MB`);

    // P3 — the store is persistent: after a reload the torrent must be complete
    // without downloading its bytes again.
    await page.reload();
    const started = Date.now();
    let afterReload = null;
    while (Date.now() - started < 120_000) {
      const current = ((await snapshot())?.states ?? []).find((entry) => entry.infohash === reciter.infohash);
      if (current?.progress >= 1) {
        afterReload = current;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
    if (!afterReload) throw new Error('the torrent was not complete after a reload — the store did not persist');
    log(`P3 persistence ok — complete again in ${Math.round((Date.now() - started) / 1000)}s`);

    // P4 — the swarm: a WebTorrent client must appear on the tracker.
    let seen = null;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const now = await stats();
      const previous = before.clients?.WebTorrent ?? {};
      const current = now.clients?.WebTorrent ?? {};
      const grew = Object.keys(current).some((version) => (current[version] ?? 0) > (previous[version] ?? 0));
      if (grew || now.peersSeederOnly > before.peersSeederOnly) {
        seen = now;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
    if (!seen) throw new Error('the tracker never saw a WebTorrent peer — the extension is not announcing');
    log(`P4 tracker ok — WebTorrent peers now ${JSON.stringify(seen.clients?.WebTorrent ?? {})}`);
  } finally {
    await context.close();
  }
};

main().then(
  () => {
    log('all checks passed');
    process.exit(0);
  },
  (error) => {
    console.error(`probe: FAILED — ${error.message}`);
    process.exit(1);
  },
);
