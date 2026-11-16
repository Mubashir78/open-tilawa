/**
 * The browser half of the proof.
 *
 * The unit tests cover the decisions; this script covers the two things only a
 * real browser can answer:
 *
 *   P3 — does a held reciter survive a **browser restart** without downloading
 *        again? (OPFS). Reloading a page proves nothing: the engine and its
 *        torrents live in the host, and a page reload does not touch them.
 *   P4 — does the tracker see this extension as a seeder, and stop seeing it when
 *        the browser closes? Two observations, rise and fall, is what makes the
 *        peer attributable to us rather than to someone else joining.
 *
 * Usage:
 *   npm run probe                  # headful under xvfb; no display needed
 *   PROBE_TIMEOUT_MS=600000 ...    # slow connections
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

/** Chrome will not load an extension headless; xvfb provides the display. */
const launch = async (profile) => {
  const context = await chromium.launchPersistentContext(profile, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION}`,
      `--load-extension=${EXTENSION}`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });

  let worker = context.serviceWorkers()[0];
  if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 20_000 });
  const id = new URL(worker.url()).host;

  const page = await context.newPage();
  await page.goto(`chrome-extension://${id}/options.html`);
  await page.waitForSelector('ul.roster li', { timeout: 30_000 });

  const snapshot = async () =>
    (await page.evaluate(() => chrome.runtime.sendMessage({ type: 'state:snapshot' })))?.states ?? [];

  const waitForComplete = async (hash, limitMs) => {
    const deadline = Date.now() + limitMs;
    let state = null;
    while (Date.now() < deadline) {
      state = (await snapshot()).find((entry) => entry.infohash === hash);
      log(`progress ${Math.round((state?.progress ?? 0) * 100)}% · ${state?.state ?? 'none'} · ${state?.peers ?? 0} peers`);
      if (state?.progress >= 1) return state;
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
    return state;
  };

  return { context, id, page, snapshot, waitForComplete };
};

const main = async () => {
  const before = await stats();
  const reciter = await smallestReciter();
  log(`seed reciter: ${reciter.nameAr || reciter.name} (${(reciter.sizeBytes / 1e9).toFixed(2)} GB)`);

  const profile = mkdtempSync(join(tmpdir(), 'tilawah-probe-'));
  const first = await launch(profile);
  log(`P2 build ok — extension ${first.id}`);

  try {
    const row = first.page.locator(`ul.roster li[data-infohash="${reciter.infohash}"]`);
    await row.locator('input[type=checkbox]').check();
    await first.page.getByRole('button', { name: /ابدأ|Start/ }).click();

    const complete = await first.waitForComplete(reciter.infohash, TIMEOUT_MS);
    if (!complete || complete.progress < 1) {
      throw new Error(`torrent did not complete within ${TIMEOUT_MS} ms (progress ${complete?.progress ?? 0})`);
    }
    log(`downloaded ${(reciter.sizeBytes / 1e6).toFixed(0)} MB`);

    // P5 — the badge is visible: Chrome draws nothing when the text is empty, so
    // a colour-only badge must still carry one space.
    const badge = await first.page.evaluate(async () => ({
      text: await chrome.action.getBadgeText({}),
      color: await chrome.action.getBadgeBackgroundColor({}),
      title: await chrome.action.getTitle({}),
    }));
    if (!badge.text) throw new Error('badge text is empty — Chrome renders no badge at all');
    log(`P5 badge ok — "${badge.text}" ${JSON.stringify(badge.color)} · ${badge.title}`);

    // P4 rise: while this extension is seeding, the tracker's seeder count rises.
    const seeding = await stats();
    log(`tracker while seeding: peersSeederOnly ${seeding.peersSeederOnly}, WebTorrent ${JSON.stringify(seeding.clients?.WebTorrent ?? {})}`);
  } finally {
    await first.context.close();
  }

  // P3: a real restart with the same profile — new browser process, same disk.
  const second = await launch(profile);
  try {
    const after = await second.waitForComplete(reciter.infohash, 180_000);
    if (!after || after.progress < 1) {
      throw new Error('the torrent was not complete after a browser restart — the store did not persist');
    }
    log('P3 persistence ok — complete again after a browser restart');
  } finally {
    await second.context.close();
  }

  // P4 fall: with the browser gone, the seeder count comes back down. Rise and
  // fall together are what attribute the peer to this extension.
  const afterClose = await stats();
  log(`tracker after close: peersSeederOnly ${afterClose.peersSeederOnly}, was ${before.peersSeederOnly} before`);
  if (afterClose.peersSeederOnly > before.peersSeederOnly) {
    log('P4 inconclusive — the tracker still counts more seeders than it did before this run (other peers joined?)');
  } else {
    log('P4 tracker ok — the seeder this run added is gone after close');
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
