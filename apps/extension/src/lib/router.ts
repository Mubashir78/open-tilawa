/**
 * Four views, one document.
 *
 * A seeder has four questions and they are not one scroll: what do I hold, what
 * may it use, what arrived, who do I ask. Each gets a view, the hash says which
 * one (`#/reciters`, `#/settings`, `#/about`), and the back button works because
 * the browser is the router — no dependency, and a bad hash falls back rather
 * than showing a blank page.
 */

export type View = 'reciters' | 'settings' | 'about';

export const VIEWS: View[] = ['reciters', 'settings', 'about'];

export const DEFAULT_VIEW: View = 'reciters';

const isView = (value: string): value is View => (VIEWS as string[]).includes(value);

export function viewFromHash(hash: string): View {
  // `#/reciters`, `#reciters` and `#/` all resolve; anything unknown is the
  // first view rather than an empty screen.
  const clean = hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  return isView(clean) ? clean : DEFAULT_VIEW;
}

export function hrefFor(view: View): string {
  return `#/${view}`;
}

export function watchView(onChange: (view: View) => void): () => void {
  const handler = () => onChange(viewFromHash(window.location.hash));
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}
