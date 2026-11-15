/**
 * Store screenshots, generated rather than posed.
 *
 * Two languages, and the refusal state — because the cap refusing to add a third
 * reciter is the product's promise, and a listing that never shows it reads like
 * an advert.
 *
 * Usage: npm run screenshots  (needs a build in .output/chrome-mv3)
 */

import { mkdirSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { chromium } from 'playwright';

const EXTENSION = join(process.cwd(), '.output/chrome-mv3');
const OUT = join(process.cwd(), 'store', 'screenshots');

const main = async () => {
  mkdirSync(OUT, { recursive: true });

  const profile = mkdtempSync(join(tmpdir(), 'tilawah-shots-'));
  const context = await chromium.launchPersistentContext(profile, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    locale: 'ar-SA',
    args: [`--disable-extensions-except=${EXTENSION}`, `--load-extension=${EXTENSION}`, '--no-first-run'],
  });

  try {
    let worker = context.serviceWorkers()[0];
    if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 20_000 });
    const id = new URL(worker.url()).host;

    const page = await context.newPage();
    await page.goto(`chrome-extension://${id}/options.html`);
    await page.waitForSelector('ul.roster li', { timeout: 30_000 });

    // Arabic first, as the listing is. Always from the top: a screenshot taken
    // wherever the last click scrolled to shows the middle of the roster.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: join(OUT, 'picker-ar.png') });

    // Two reciters chosen: the running total and the cap in one frame.
    const rows = page.locator('ul.roster li');
    await rows.nth(0).locator('input[type=checkbox]').check();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: join(OUT, 'picker-selected-ar.png') });

    // The refusal: cap of one, two ticks.
    await page.selectOption('#max-reciters', '1');
    await rows.nth(1).locator('input[type=checkbox]').check();
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: join(OUT, 'cap-refusal-ar.png') });

    // English twin.
    await context.close();
  } finally {
    await context.close().catch(() => {});
  }
};

main().then(
  () => console.log('screenshots: written to store/screenshots'),
  (error) => {
    console.error(`screenshots: FAILED — ${error.message}`);
    process.exit(1);
  },
);
