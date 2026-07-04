# Changelog

## 3.0.0

Full rewrite following the conventions of [sonarr-radarr-lidarr-autosearch-browser-extension](https://github.com/trossr32/sonarr-radarr-lidarr-autosearch-browser-extension).

### Added

- Chromium Manifest V3 support with a service-worker background, restoring the ability to ship updates to Chrome and Edge.
- Firefox for Android support (`gecko_android`, minimum version 142).
- Toast notifications on send success/failure, with master/error/success toggles on a new Notifications options tab.
- Per-tab dynamic toolbar icon: normal, faded (disabled) and magnets-found states driven by page content.
- Test connection button on the API options tab.
- Backup & restore tab: versioned JSON export/import (merge or replace) of settings and magnet history, plus reset to defaults.
- Permissions options tab showing granted state with grant/revoke controls (Chromium).
- SPA support: magnet buttons are injected after client-side navigation without a page reload.
- Jest unit tests and Playwright integration tests (run against a local fixture page, no third-party sites).
- GitHub Actions: CodeQL analysis, outdated-package checks and the Playwright suite with automatic failure-tracking issues.

### Changed

- On Chromium, site access is now an optional permission granted from the options page or popup instead of being required at install; content scripts are registered programmatically once granted. Firefox keeps install-time consent.
- Transmission credentials are sent as a Basic Authorization header instead of being embedded in the RPC URL; the RPC client moved from XMLHttpRequest to fetch with proper 409 session-id and error handling, including torrent-duplicate detection.
- Options and popup UI rebuilt with Tailwind CSS (dark theme, accessible tabs); every setting now auto-saves - all Save buttons removed.
- Settings schema restructured (nested `config`/`storage`/`notifications`); v2 settings are migrated automatically on first read.
- Magnet history moved from browser sync storage to local storage to avoid sync quota limits; existing history is migrated.
- Dual build outputs (`dist/chromium` MV2→MV3 and `dist/firefox` MV2) replace the single consolidated dist; packaging produces per-browser artifacts via web-ext.
- Minimum Firefox version raised to 140 (desktop) / 142 (Android); `data_collection_permissions` declared as `none`.

### Fixed

- Buttons no longer stack duplicate injections on re-run: injected elements carry dedupe markers.
- Failed API calls now show a failure state on the button and a descriptive error instead of appearing to do nothing.
- A stateful global regex could previously skip magnet links on repeated scans.

### Removed

- Bootstrap, bootstrap4-toggle, bootstrap-slider, paginationjs and sass dependencies; no framework CSS is injected into web pages any more.
- Dead `magnet_link_checker.js` content script.

## 2.0.1

### Fixed

- Remove activeTab permission from the manifest.

## 2.0.0

### Added

- Allow storage of magnets to be disabled.
- Allow found magnets in storage to not disable injected buttons.

### Changed

- Full rewrite: Grunt added as a task runner, all external libs added via npm, consolidated Chromium and Firefox dists.
