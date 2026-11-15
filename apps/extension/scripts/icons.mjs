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

/**
 * Two candidate marks, both square and both readable at 16 px:
 *  A — inverted: the letter ت knocked out of an ink tile, one wave underline.
 *  B — wave: three bars rising, in the wave hue, inside an ink tile.
 * The tile is ink in both, because a toolbar is light and a white tile vanishes.
 */
const variant = process.env.ICON_VARIANT === 'b' ? 'b' : 'a';

const waveBars = (size, pad, box) => {
  const bar = box * 0.16;
  const gap = box * 0.1;
  const base = pad + box * 0.68;
  const heights = [box * 0.26, box * 0.42, box * 0.56];
  const start = size / 2 - (bar * 3 + gap * 2) / 2;
  return heights
    .map((h, index) => {
      const x = start + index * (bar + gap);
      return `<rect x="${x}" y="${base - h}" width="${bar}" height="${h}" rx="${bar / 2}" fill="${PAPER}"/>`;
    })
    .join('');
};

const svg = (size, padded) => {
  const pad = padded ? size * 0.12 : 0;
  const box = size - pad * 2;
  const radius = box * 0.22;
  const font = `600 ${box * 0.62}px "Noto Naskh Arabic", "Segoe UI", system-ui, sans-serif`;

  const tile = `<rect x="${pad}" y="${pad}" width="${box}" height="${box}" rx="${radius}" fill="${INK}"/>`;

  const mark =
    variant === 'b'
      ? waveBars(size, pad, box)
      : `<text x="${size / 2}" y="${pad + box * 0.47}" fill="${PAPER}"
        font-family='"Noto Naskh Arabic","Segoe UI",system-ui,sans-serif' font-size="${box * 0.6}" font-weight="600"
        text-anchor="middle" dominant-baseline="central">ت</text>
     <rect x="${size / 2 - box * 0.16}" y="${pad + box * 0.74}" width="${box * 0.32}" height="${Math.max(2, box * 0.05)}"
        rx="${box * 0.025}" fill="${WAVE}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${tile}
  ${mark}
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
