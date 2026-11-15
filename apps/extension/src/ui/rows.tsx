/**
 * One held reciter, in a line.
 *
 * The state word is the whole row: a volunteer opens this to answer "is it
 * working", not to manage a torrent. The bar appears only while bytes are
 * moving, because a full bar on a finished torrent is decoration.
 */

import type { HeldState } from '@/lib/state';

const WORDS = {
  ar: {
    queued: 'في الانتظار',
    downloading: (percent: number) => `جارٍ التنزيل ${percent}%`,
    seeding: (peers: number) => `يشارك · ${peers} ${peers === 1 ? 'قرين' : 'أقران'}`,
    paused: 'متوقف',
    error: 'تعذّر الاتصال',
  },
  en: {
    queued: 'Queued',
    downloading: (percent: number) => `Downloading ${percent}%`,
    seeding: (peers: number) => `Sharing · ${peers} ${peers === 1 ? 'peer' : 'peers'}`,
    paused: 'Paused',
    error: 'Cannot reach the swarm',
  },
} as const;

export type Lang = keyof typeof WORDS;

export function stateWord(state: HeldState, lang: Lang): string {
  const words = WORDS[lang];
  switch (state.state) {
    case 'downloading':
      return words.downloading(Math.round(state.progress * 100));
    case 'seeding':
      return words.seeding(state.peers);
    case 'queued':
      return words.queued;
    case 'paused':
      return words.paused;
    case 'error':
    default:
      return words.error;
  }
}

export function HeldRow({
  name,
  size,
  state,
  lang,
}: {
  name: string;
  size: string;
  state: HeldState;
  lang: Lang;
}) {
  return (
    <li>
      <span className="name">{name}</span>
      <span className="state">
        <span className="meta">{size}</span>
        <span className="meta">{stateWord(state, lang)}</span>
      </span>
      {state.state === 'downloading' ? (
        <span className="progress" aria-hidden="true">
          <span style={{ inlineSize: `${Math.round(state.progress * 100)}%` }} />
        </span>
      ) : null}
    </li>
  );
}
