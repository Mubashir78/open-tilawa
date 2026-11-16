# Release 0.2.0 — files and steps

## Files to upload

| Store | File | What it is |
| --- | --- | --- |
| Chrome Web Store | `tilawah-companion-0.2.0-chrome.zip` | the built MV3 extension, `npm run zip` |
| Firefox AMO | `tilawah-companion-0.2.0-firefox.zip` | the built MV2 extension, `npm run zip:firefox` |

Both are served from the build host beside this checkout; regenerate any time with:

```bash
cd apps/extension
npm run build && npm run zip            # Chrome
npm run build:firefox && npm run zip:firefox   # Firefox
```

## Steps, in order

1. **Firefox first.** AMO is free, review is human, and a signed build can be installed in release Firefox. Upload the zip at `addons.mozilla.org/developers/`, choose **On this site** (listed) only after P1 passes; for testing use **On your own** (unlisted).
2. **P1 gate.** Ten minutes with Firefox seeding, then read `tracker.tilawah.cc/stats`. Still recorded as NOT RUN in `docs/PROBES.md`. Do not publish on AMO before it passes.
3. **Chrome.** Upload the zip, category **Productivity**, visibility **Public**, fill the privacy practices form from `store/store-fields.md`, add the five screenshots.
4. **Source archive (AMO).** The bundle is minified, so AMO will ask for readable source: upload a zip of `apps/extension` (without `node_modules`, `.output`) plus a line saying `npm install && npm run build:firefox`.
5. **After approval — set the links.** `src/constants/brand.ts` has `chromeStore` and `firefoxAddons` deliberately empty; the About view renders a store link only when one exists. Fill both, rebuild, and cut `0.2.1`. The same day, add the two links to the site's `/seed` page and to `apps/extension/README.md`.

## Reminder

**When both listings are approved, send me the two URLs** — I will update `brand.ts`, the About view, the site's `/seed` page and the READMEs, then cut the follow-up release. Nothing in the extension points at a listing today, so there is no dead link to fix in a hurry.
