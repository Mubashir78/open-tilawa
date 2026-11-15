/**
 * Screenshots for review, generated from the real build.
 *
 * Arabic first, because that is what the listing and the audience are. Each view
 * is a separate file so a change can be checked one screen at a time; the popup
 * is captured in its own page at its own width.
 *
 * Usage: npm run screenshots  (needs a build in .output/chrome-mv3)
 */

import { mkdirSync, mkdtempSync } from 'node:fs';
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
    const shot = async (name, options = {}) => {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: join(OUT, name), ...options });
      console.log(`screenshots: ${name}`);
    };

    await page.goto(`chrome-extension://${id}/options.html#/reciters`);
    await page.waitForSelector('ul.roster li', { timeout: 30_000 });
    await shot('view-reciters-ar.png');

    const rows = page.locator('ul.roster li');
    await rows.nth(0).locator('input[type=checkbox]').check();
    await shot('view-reciters-selected-ar.png');

    // The riwaya filter, open, over the roster.
    await page.locator('details.filter > summary').click();
    await page.locator('details.filter input[type=checkbox]').first().check();
    await page.waitForTimeout(300);
    await shot('view-riwaya-filter-ar.png');
    await page.locator('details.filter > summary').click();

    await page.goto(`chrome-extension://${id}/options.html#/settings`);
    await page.waitForSelector('#settings', { timeout: 10_000 });
    await shot('view-settings-ar.png');

    await page.goto(`chrome-extension://${id}/options.html#/about`);
    await page.waitForSelector('#about', { timeout: 10_000 });
    await page.evaluate(() => document.querySelectorAll('details.doc').forEach((d) => (d.open = true)));
    await shot('view-about-ar.png', { fullPage: true });

    // The popup is its own document at its own width.
    const popup = await context.newPage();
    await popup.setViewportSize({ width: 400, height: 620 });
    await popup.goto(`chrome-extension://${id}/popup.html`);
    await popup.waitForTimeout(1500);
    await popup.screenshot({ path: join(OUT, 'popup-ar.png') });
    console.log('screenshots: popup-ar.png');
  } finally {
    await context.close();
  }
};

main().then(
  () => console.log('screenshots: done'),
  (error) => {
    console.error(`screenshots: FAILED — ${error.message}`);
    process.exit(1);
  },
);
