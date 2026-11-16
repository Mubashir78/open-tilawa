/**
 * The nav is the browser's: three links, the hash decides, and the active one is
 * announced with `aria-current`. Nothing here holds state.
 */

import type { ReactNode } from 'react';

import type { View } from '@/lib/router';
import { hrefFor } from '@/lib/router';
import { InfoIcon, ListIcon, SlidersIcon } from '@/components/icons';

export function Nav({
  view,
  labels,
}: {
  view: View;
  labels: { label: string; reciters: string; settings: string; about: string };
}) {
  const items: { id: View; label: string; icon: ReactNode }[] = [
    { id: 'reciters', label: labels.reciters, icon: <ListIcon /> },
    { id: 'settings', label: labels.settings, icon: <SlidersIcon /> },
    { id: 'about', label: labels.about, icon: <InfoIcon /> },
  ];

  return (
    <nav className="nav" aria-label={labels.label}>
      {items.map((item) => (
        <a
          key={item.id}
          href={hrefFor(item.id)}
          aria-current={view === item.id ? 'page' : undefined}
          className={view === item.id ? 'is-active' : undefined}
        >
          {item.icon} {item.label}
        </a>
      ))}
    </nav>
  );
}
