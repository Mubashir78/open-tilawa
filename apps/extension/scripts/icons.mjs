/**
 * The extension's mark: a square lettermark, generated rather than drawn by hand
 * at five sizes.
 *
 * The site's `apps/web/public/images/icon.png` is an 812×385 wordmark — it cannot
 * be a square icon, and cropping a logotype at 16 px produces a smudge. So: the
 * letter ت in ink on the site's paper, one wave-blue accent, rasterised by the
 * Playwright Chromium already installed for the probe. Reproducible, no new
 * dependency, and the same token values as `globals.css`.
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { chromium } from 'playwright';

const SIZES = [16, 32, 48, 96, 128];
const INK = '#111111';
const PAPER = '#ffffff';
const WAVE = '#1c4d78';

const svg = (size, padded) => {
  const pad = padded ? size * 0.12 : 0;
  const box = size - pad * 2;
  const radius = box * 0.22;
  const font = `600 ${box * 0.62}px "Noto Naskh Arabic", "Segoe UI", system-ui, sans-serif`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect x="${pad}" y="${pad}" width="${box}" height="${box}" rx="${radius}" fill="${PAPER}"/>
  <rect x="${pad}" y="${pad}" width="${box}" height="${box}" rx="${radius}" fill="none" stroke="${INK}" stroke-opacity="0.08"/>
  <text x="${size / 2}" y="${pad + box * 0.5}" fill="${INK}"
        font-family='"Noto Naskh Arabic","Segoe UI",system-ui,sans-serif' font-size="${box * 0.62}" font-weight="600"
        text-anchor="middle" dominant-baseline="central">ت</text>
  <rect x="${size / 2 - box * 0.17}" y="${pad + box * 0.76}" width="${box * 0.34}" height="${Math.max(2, box * 0.055)}"
        rx="${box * 0.03}" fill="${WAVE}"/>
</svg>`;
};

const main = async () => {
  mkdirSync(join(process.cwd(), 'public', 'icon'), { recursive: true });
  mkdirSync(join(process.cwd(), 'store'), { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const render = async (size, path, padded = false) => {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${svg(size, padded)}</body></html>`,
    );
    await page.locator('svg').screenshot({ path, omitBackground: true });
    console.log(`icons: ${path} (${size}×${size})`);
  };

  for (const size of SIZES) {
    await render(size, join(process.cwd(), 'public', 'icon', `${size}.png`));
  }
  await render(128, join(process.cwd(), 'store', 'icon-128.png'), true);

  await browser.close();
};

main().then(
  () => console.log('icons: done'),
  (error) => {
    console.error(`icons: FAILED — ${error.message}`);
    process.exit(1);
  },
);
