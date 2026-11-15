/**
 * Privacy and terms, in place.
 *
 * Rendered from `lib/legal.ts` — the same source the Pages files are generated
 * from — so a person reading the extension and a reviewer reading the store URL
 * get the same words. Arabic first, English second, both collapsed by default:
 * the About view is for finding them, not for reading them twice.
 */

import { PRIVACY, TERMS, LEGAL_UPDATED, type LegalDoc } from '@/lib/legal';

function Document({ doc, title }: { doc: { ar: LegalDoc; en: LegalDoc }; title: string }) {
  return (
    <details className="doc">
      <summary>{title}</summary>
      <div dir="rtl" lang="ar">
        {doc.ar.sections.map((part) => (
          <div key={part.heading}>
            <h3>{part.heading}</h3>
            {part.body.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ))}
      </div>
      <div dir="ltr" lang="en">
        {doc.en.sections.map((part) => (
          <div key={part.heading}>
            <h3>{part.heading}</h3>
            {part.body.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ))}
      </div>
      <p className="meta">
        {LEGAL_UPDATED}
      </p>
    </details>
  );
}

export function LegalBlock({ privacy, terms }: { privacy: string; terms: string }) {
  return (
    <>
      <Document doc={PRIVACY} title={privacy} />
      <Document doc={TERMS} title={terms} />
    </>
  );
}
