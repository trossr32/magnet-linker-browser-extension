# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A cross-browser extension (Chromium MV3 + Firefox MV2, incl. Firefox for Android) that finds
magnet links on web pages and injects a "Send to Transmission" button next to each one, sending
the torrent to a user-configured Transmission instance via its RPC API. Supporting features:
configurable magnet detection (by attribute and by element type), per-site injected-HTML
customisation, optional sent-magnet history with "already sent" button states, toast
notifications, a dynamic per-tab toolbar icon, settings backup/restore, and a permissions UI.

`ORCHESTRATOR.md` is a maintained repo-context document (architecture, fragile areas, decisions
log) — read it for current state and append discoveries after meaningful changes.
`V3_MIGRATION_PLAN.md` records the v3 rewrite plan, its implementation notes and remaining work.

## Commands

```powershell
npm i                 # install root deps
grunt debug           # jshint + build both browsers to dist/chromium and dist/firefox
grunt playwright      # build dist/ without jshint; promotes optional host perms in dist/chromium (test build)
grunt release         # full build + store packaging (CreatePackage_Grunt.ps1 on Windows) -> Publish/

npm test              # Jest unit tests (tests/unit-tests/; playwright dir excluded)
npx jest tests/unit-tests/settings_migration.test.js   # single unit test file

npm run chromium      # web-ext run from dist/chromium (build first)
npm run firefox       # web-ext run from dist/firefox
npm run firefox:android
npm run lint          # web-ext lint against dist/firefox (build first; expect ~16 jquery innerHTML warnings, 0 errors)
```

Playwright integration tests live in a separate package and load the extension from
`dist/chromium`, so build with `grunt playwright` first. They run against the local fixture page
`Test/magnet-test.html` (served automatically by the Playwright webServer) — no third-party sites:

```powershell
grunt playwright
cd tests/playwright
npm i
npx playwright install --with-deps chromium
npx playwright test                              # all specs
npx playwright test extension.tests/options.spec.ts   # single spec
```

Specs suffixed `.spec.NORUN.ts` are intentionally disabled (none currently exist).

## Architecture

**No bundler, no transpilation.** Plain JS + jQuery in UI/content contexts; script load order is
the module system. The content-script list lives in the Firefox manifest AND in
`contentScriptConfig` in `src/content/js/background.js` (Chromium registers programmatically) —
keep them identical: jQuery → browser-polyfill → `core.js` → `content_script.js`.

**Dual manifests, two backgrounds, one shared implementation:**
- Chromium MV3: `src/manifest-chromium/manifest.json`; service worker `src/eventPage.chrome.js`
  (importScripts polyfill/core/transmission/background — **no jQuery in the service worker**).
- Firefox MV2: `src/manifest-firefox/manifest.json`; event page `src/eventPage.js`
  (`background.scripts` loads the same files).
- Both bootstraps just call `initBackground()` from `src/content/js/background.js`.

**Permission model (hybrid — see V3_MIGRATION_PLAN.md deviations):**
- Chromium: `optional_host_permissions: ["<all_urls>"]`; the background registers/unregisters the
  content scripts via `scripting.registerContentScripts` on install/startup/permission changes.
  The options page (banner + permissions tab) and popup offer the grant.
- Firefox: declarative content scripts + required `<all_urls>` (install-time consent) because MV2
  `contentScripts.register()` registrations die with the event page.
- No `tabs` permission — don't add it; icon events and `tabs.reload()` work without it.

**Core modules (`src/content/js/`):**
- `core.js` — settings schema + `getSettings`/`setSettings` over `browser.storage.sync`
  (key `magnetLinkerSettings`), magnet history over `browser.storage.local`
  (key `magnetLinkerMagnets`), shared `log()`. Migration is **additive-on-read**
  (`applySettingsDefaults` is a pure function) and transparently upgrades the v2 flat shape,
  moving legacy sync magnets to local storage. Contains a `browser` shim for non-extension
  contexts and a `module.exports` guard so pure helpers are unit-testable.
- `transmission.js` — fetch-based RPC client (background-only): Basic auth header,
  `X-Transmission-Session-Id` 409 retry, torrent-added/duplicate messages.
- `background.js` — message handlers (`addTorrent`, `testConnection`, `checkMagnets` round-trip,
  `settingsChanged`), per-tab icon state (normal/`-faded`/`-magnets`), content-script
  registration sync.
- `content_script.js` — candidate discovery (attributes + element types over
  `extractMagnetUris`), idempotent injection (dedupe markers `data-magnet-linker-completed` /
  `data-magnet-linker-container`), delegated click → `runtime.sendMessage`, self-contained toast
  helper, URL-poll SPA re-runs. Injected styles are hand-written, `magnet-linker-`-prefixed
  (`src/content/css/content_script.css`) — **never inject framework CSS into pages**.
- `options-1..8-*.js` — one file per options tab (api, search, sites, storage, notifications,
  debug, backup, permissions); `options.js` owns tabs, the `initToggle()` shim and boot.
  Everything auto-saves on change; there are no Save buttons.

**Styling:** Tailwind v4, CSS-config only (no tailwind.config.js) — `src/content/css/tailwind.css`
holds `@plugin`/`@source`/`@theme` and the `ml-*` component classes. Dynamic classes composed in
JS are picked up because `@source` scans `src/**/*.js`; keep them as literal strings.

**Versioning:** manifests use 4-part `X.Y.Z.0`; options/popup display the version dynamically from
`runtime.getManifest()` — no HTML version strings to bump.

## Conventions and cautions

- ~8,000 Edge users have v2 settings in `browser.storage.sync` — never break settings reads.
  Any schema change extends `applySettingsDefaults` + `settingsNeedMigration` in `core.js` and
  gets a case in `tests/unit-tests/settings_migration.test.js`.
- MV2/MV3 parity: background/manifest changes usually need applying to both manifests and testing
  in both browsers. Chromium SW code must stay jQuery-free and DOM-free.
- Never edit `dist/` or `Publish/` — generated output.
- jshint (`.jshintrc`, esversion 11) runs over `src/content/**/*.js` + `Gruntfile.js` in
  `grunt debug`/`grunt release`.
- External PRs target the `staging` branch, not `master`.
- `Test/magnet-test.html` is the deterministic fixture for manual testing and Playwright — extend
  it when adding detection features (and assert new cases in `tests/playwright/extension.tests/`).

## Release process

Update **all** of the following when releasing X.Y.Z:
- `package.json` + `package-lock.json` (top-level and `packages[""]` version) — `X.Y.Z`
- `src/manifest-chromium/manifest.json` + `src/manifest-firefox/manifest.json` — `X.Y.Z.0`
- `README.md` — the static Edge add-ons version badge (`message=vX.Y.Z.0`); Chrome/Firefox badges
  auto-read from the stores; leave the Edge *users* badge alone
- `CHANGELOG.md` — new `## X.Y.Z` section with `### Added` / `### Changed` / `### Fixed`
  subsections; one bullet per PR, contributor PRs end with
  `- ([PR#N](<url>)). Thanks to [user](https://github.com/user).`

Then `grunt release` (packages to `Publish/magnet_linker-X.Y.Z.0.{xpi,zip}`), `npm run lint`,
smoke test both browsers, and verify the settings migration against a profile with v2 data.
