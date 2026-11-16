/**
 * The toolbar badge, and the sentence behind it.
 *
 * Four colours, no text. A text badge is capped at four characters, flickers as
 * numbers change, and reads as an unread count — none of which is what this is.
 * The badge answers one question at a glance ("is it helping?") and the tooltip
 * carries the sentence for anyone who hovers.
 *
 * The catalogue has a fifth thing to say — "a new reciter exists" — and it does
 * not get a colour: all four already mean a seeding state, so a fifth would make
 * the badge mean two different kinds of thing. That news is a notification and a
 * count in the popup.
 */

import type { HeldState } from './state';

export type { HeldState } from './state';

export type BadgeColor = 'green' | 'blue' | 'grey' | 'red';

export type Badge = { color: BadgeColor; title: string; text: '' };

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  return `${Math.round(bytes / 1e6)} MB`;
}

const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

const PAUSE_REASON: Record<string, string> = {
  paused: 'paused by you',
  battery: 'paused on battery',
  metered: 'paused on a metered connection',
  schedule: 'paused outside your hours',
};

export function badgeFor(states: HeldState[], reason: string | null): Badge {
  const failures = states.filter((state) => state.state === 'error');
  const downloading = states.filter((state) => state.state === 'downloading');
  const seeding = states.filter((state) => state.state === 'seeding');

  const color: BadgeColor =
    failures.length > 0 ? 'red' : downloading.length > 0 ? 'blue' : seeding.length > 0 ? 'green' : 'grey';

  const peers = states.reduce((sum, state) => sum + state.peers, 0);
  const uploadedToday = states.reduce((sum, state) => sum + state.uploadedToday, 0);

  if (color === 'red') {
    return {
      color,
      text: '',
      title: `${plural(failures.length, 'reciter', 'reciters')} failed · ${formatBytes(uploadedToday)} uploaded today`,
    };
  }

  if (seeding.length > 0) {
    return {
      color,
      text: '',
      title: `Seeding ${plural(seeding.length, 'reciter', 'reciters')} · ${plural(peers, 'peer', 'peers')} · ${formatBytes(uploadedToday)} uploaded today`,
    };
  }

  if (downloading.length > 0) {
    const percent = Math.round(
      (downloading.reduce((sum, state) => sum + state.progress, 0) / downloading.length) * 100,
    );
    return {
      color,
      text: '',
      title: `Downloading ${plural(downloading.length, 'reciter', 'reciters')} · ${percent}% · ${formatBytes(uploadedToday)} uploaded today`,
    };
  }

  const why = reason ? (PAUSE_REASON[reason] ?? reason) : 'idle';
  return {
    color,
    text: '',
    title: `Seeder ${why} · ${formatBytes(uploadedToday)} uploaded today`,
  };
}
