/**
 * The icons, from Phosphor — the same set the site uses.
 *
 * Imported one glyph at a time so the bundle carries six icons, not the library.
 * The wrappers exist for two reasons: one place decides weight and size, and
 * a screen that needs a different icon later changes this file, not five views.
 */

import {
  ArrowSquareOut,
  Info,
  ListBullets,
  Plus,
  SlidersHorizontal,
  Trash,
  type IconProps as PhosphorProps,
} from '@phosphor-icons/react';

const size = (value = 16) => value;

const common = { weight: 'regular', 'aria-hidden': true } as const;

export function ListIcon({ size: px = 16, className }: { size?: number; className?: string }) {
  return <ListBullets {...common} size={size(px)} className={className} />;
}

export function SlidersIcon({ size: px = 16, className }: { size?: number; className?: string }) {
  return <SlidersHorizontal {...common} size={size(px)} className={className} />;
}

export function InfoIcon({ size: px = 16, className }: { size?: number; className?: string }) {
  return <Info {...common} size={size(px)} className={className} />;
}

export function PlusIcon({ size: px = 16, className }: { size?: number; className?: string }) {
  return <Plus {...common} size={size(px)} className={className} />;
}

export function TrashIcon({ size: px = 16, className }: { size?: number; className?: string }) {
  return <Trash {...common} size={size(px)} className={className} />;
}

export function ArrowIcon({ size: px = 16, className }: { size?: number; className?: string }) {
  return <ArrowSquareOut {...common} size={size(px)} className={className} />;
}

export type IconProps = PhosphorProps;
