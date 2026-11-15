/**
 * The Pages copies of privacy and terms, rendered from `src/ui/legal.ts`.
 *
 * One source, two renderings: the About screen inside the extension and these
 * files for the store listings. Run by `npm run site` and by the Pages workflow
 * before upload; nothing here is hand-edited.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { LEGAL_UPDATED, PRIVACY, TERMS, type Legal } from '../src/ui/legal.ts';

const OUT = join(process.cwd(), 'site');

const escape = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const section = (doc, lang, dir) => `
      <section dir="${dir}" lang="${lang}" class="doc">
        <h1>${escape(doc.title)}</h1>
        <p class="lede">${escape(doc.lede)}</p>
${doc.sections
  .map(
    (part) => `        <h2>${escape(part.heading)}</h2>
${part.body.map((line) => `        <p>${escape(line)}</p>`).join('\n')}`,
  )
  .join('\n')}
        <p class="foot">${lang === 'ar' ? 'آخر تعديل' : 'Last updated'}: ${escape(LEGAL_UPDATED)} · ${
          lang === 'ar' ? 'للتواصل' : 'Contact'
        }: <a href="mailto:contact@tilawah.cc">contact@tilawah.cc</a></p>
      </section>`;

const page = (legal: Legal, title: { ar: string; en: string }) => `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escape(title.ar)} — ${escape(title.en)}</title>
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <main>
${section(legal.ar, 'ar', 'rtl')}
      <hr />
${section(legal.en, 'en', 'ltr')}
    </main>
  </body>
</html>
`;

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'privacy.html'), page(PRIVACY, { ar: 'الخصوصية', en: 'Privacy' }));
writeFileSync(join(OUT, 'terms.html'), page(TERMS, { ar: 'الشروط', en: 'Terms' }));
console.log('site: wrote privacy.html and terms.html from src/ui/legal.ts');
