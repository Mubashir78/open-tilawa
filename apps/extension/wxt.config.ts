import { defineConfig } from 'wxt';

// The permission set is a product decision, not an implementation detail: the
// extension must never read pages, tabs, or history. `scripts/audit-manifest.mjs`
// fails the build when this list and the built manifest disagree, so adding a
// permission here means changing the audit in the same commit.
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  // `srcDir` is what makes `@/lib/...` mean `src/lib/...`, matching the site's
  // own alias. Entrypoints move with it (`src/entrypoints/**`).
  srcDir: 'src',
  publicDir: 'public',
  manifest: ({ manifestVersion }) => ({
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    short_name: 'Tilawah',
    // Manifest versions are integers only; the RC label is for humans and stores.
    version_name: '0.2.0 rc1',
    default_locale: 'en',
    permissions: [
      'storage',
      'unlimitedStorage',
      'alarms',
      'notifications',
      // Chrome MV3 hosts the seed engine in an offscreen document; Firefox MV2
      // has a persistent background page and no offscreen API at all.
      ...(manifestVersion === 3 ? ['offscreen' as const] : []),
    ],
    host_permissions: ['https://console.tilawah.cc/*', 'https://tilawah.cc/*'],
    // The picker is twelve rows tall; a 400px embedded panel is not a place to
    // choose what to keep for years.
    options_ui: { page: 'options.html', open_in_tab: true },
    action: { default_title: 'Tilawah Companion' },
  }),
});
