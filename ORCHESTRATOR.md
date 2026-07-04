# ORCHESTRATOR.md

Purpose
- This file is the durable source of truth for repository context used by the orchestrator workflow.
- Keep this document updated as architecture, conventions, risks, and decisions evolve.
- When chat context is compacted, restore working context from here first.

Scope And Rules
- Orchestrator does not implement tasks directly by default.
- For each requested task, spawn one or more subagents with explicit ownership and boundaries.
- Subagent prompts must include: goal, owned files, forbidden files, conventions, and verification steps.
- After subagents complete: review outputs, capture new insights here, and update decisions/risks.

Current Baseline (2026-07-04, v3.0.0 implemented on the `v3.0.0` branch)

Repository Overview
- Browser extension that finds magnet links on web pages and injects a "Send to Transmission"
  button next to each, sending the torrent to a user-configured Transmission instance via its RPC API.
- v3.0.0 is a completed ground-up rewrite following the conventions of the sibling repo
  `sonarr-radarr-lidarr-autosearch-browser-extension`. `V3_MIGRATION_PLAN.md` records the plan,
  implementation notes/deviations and remaining work (wiki, optional website, phase-11 release).
- Verified: jshint clean, 42 Jest unit tests green, 6 Playwright integration tests green
  (real extension in Chromium against Test/magnet-test.html), web-ext lint 0 errors.

Runtime Entry Points
- Chromium MV3 background (service worker bootstrap): src/eventPage.chrome.js
- Firefox MV2 background (event page bootstrap): src/eventPage.js
- Shared background implementation: src/content/js/background.js (initBackground())
- Transmission RPC client (background-only, fetch-based): src/content/js/transmission.js
- Content runtime: src/content/js/content_script.js
- Shared settings/helpers: src/content/js/core.js
- Options UI: src/options.html + src/content/js/options.js + options-1..8-*.js (one per tab)
- Popup UI: src/popup.html + src/content/js/popup.js

Core Module Boundaries
- core.js: v3 nested settings schema (config/api/search/sites/storage/notifications) under sync
  key magnetLinkerSettings; magnet history under local key magnetLinkerMagnets; additive
  migration-on-read via pure applySettingsDefaults()/settingsNeedMigration() (v2 flat shape and
  legacy sync magnets upgrade transparently); browser shim + module.exports guard for tests.
- transmission.js: fetch + Basic Authorization header, X-Transmission-Session-Id 409 retry,
  torrent-added/torrent-duplicate handling, descriptive failure messages.
- background.js: runtime.sendMessage handlers (addTorrent/getTorrents/testConnection/
  magnetsFound/settingsChanged), per-tab icon state (checkMagnets round-trip on tabs.onUpdated/
  onActivated), Chromium content-script registration sync on install/startup/permission events.
- content_script.js: candidate discovery (attributes + element types), idempotent injection with
  data-magnet-linker-* dedupe markers, delegated click -> sendMessage, self-contained toasts,
  1s URL-poll SPA re-runs. Styles are magnet-linker-prefixed (content_script.css); no framework
  CSS ever ships to pages.

Permission Model (hybrid — key v3 decision)
- Chromium MV3: permissions [storage, scripting]; optional_host_permissions [<all_urls>] granted
  at runtime from options banner/permissions tab/popup; content scripts registered
  programmatically (persistAcrossSessions).
- Firefox MV2: declarative content scripts + required <all_urls> (install-time consent),
  data_collection_permissions: none — MV2 contentScripts.register() dies with the event page,
  so programmatic registration is not viable there.
- No tabs permission anywhere.

Build And Packaging
- Grunt: copy:firefox/copy:chromium (vendor libs from node_modules + src, excluding the other
  browser's eventPage) + Tailwind v4 CLI per target. Tasks: debug (jshint+build),
  playwright (build + promotes optional host perms in dist/chromium for tests),
  release (platform-aware packaging via CreatePackage_Grunt.ps1 / create_package_Grunt.sh -> 
  Publish/magnet_linker-{version}.{xpi,zip}), review.
- Tailwind v4 CSS-config only (no tailwind.config.js): src/content/css/tailwind.css with ml-*
  component classes.

Test Architecture
- tests/unit-tests/*.test.js (Jest, root package): settings migration, magnet extraction,
  buildApiUrl, toast gating, site customisation matching.
- tests/playwright (separate package): fixtures load dist/chromium in a persistent context;
  webServer serves Test/magnet-test.html; specs cover injection counts/dedupe, SPA re-runs,
  failure state + error toast, options auto-save and toggle persistence.
- CI: .github/workflows/ codeql-analysis.yml, outdated.yml, playwright.yml (setup -> discover
  matrix with failed-tests/confirmed-failing issue tracking -> parallel spec jobs).

Store Presence
- Chrome Web Store: magnet-linker (id neokhcngmjnlbnphpfmiidlljbpffecd)
- Firefox AMO: magnet-linker (gecko id magnet-linker-extension@robgreen.me)
- Edge Add-ons: id iagaihihgeloakmheonacpldkpogggen (~7.6k users — largest install base; take care with migrations)

Conventions And Patterns (target — from sonarr-radarr-lidarr-autosearch-browser-extension)
- No bundler/transpilation; plain JS + jQuery; script load order is the module system and must be
  identical in both manifests.
- Dual manifests: src/manifest-chromium (MV3, service worker) + src/manifest-firefox (MV2, event page).
- One options-N-<name>.js file per options tab; auto-save on change, no Save buttons.
- Tailwind v4 dark UI (`#1d1e22`), ARIA-compliant tabs, initToggle()/bootstrapToggle shim.
- Injected elements carry dedupe data-attributes so reinjection is safe (v3: `data-magnet-linker-*`).
- Additive settings migration on read; never a migration framework.
- External PRs target `staging`, not `master`.
- Never edit dist/ — generated output.

Known Fragile Areas
- Settings migration for ~8k existing users: applySettingsDefaults/settingsNeedMigration in
  core.js must keep reading the v2 flat shape; every schema change needs a migration unit test.
- Content-script list duplication: the Firefox manifest content_scripts and contentScriptConfig
  in background.js must stay identical (load order is the module system).
- Any-page injection: content CSS must stay magnet-linker-prefixed and minimal; never ship
  framework CSS to pages.
- MV3 service worker: no jQuery/DOM; long-lived state does not survive SW restarts (only
  transmissionSessionId is transient by design).
- Toggle/badge Tailwind classes composed in JS must remain literal strings or @source scanning
  misses them and they vanish from the compiled CSS.

Critical Path Files
- src/content/js/core.js
- src/content/js/content_script.js
- src/content/js/background.js
- src/content/js/transmission.js
- src/eventPage.js + src/eventPage.chrome.js
- src/manifest-chromium/manifest.json + src/manifest-firefox/manifest.json
- src/content/js/options.js + options-1..8-*.js
- Gruntfile.js
- tests/playwright/**/*
- V3_MIGRATION_PLAN.md

Subagent Execution Template
- Goal:
- Owned files (allowed to modify):
- Forbidden files (must not touch):
- Constraints/conventions:
  - Keep edits minimal and localized.
  - Preserve existing behavior unless explicitly requested.
  - Respect MV2/MV3 parity where relevant.
  - Follow existing naming/marker patterns.
- Verification:
  - Run only targeted tests first.
  - Summarize risks and any unverified assumptions.

Review Checklist For Subagent Output
- Did changes stay within owned files?
- Any unintended architecture or API contract changes?
- MV2/MV3 parity maintained where required?
- Settings migration path preserved for existing v2 users?
- Tests added/updated and relevant tests executed?
- Clear rollback or follow-up noted for uncertain areas?

Decisions Log
- 2026-07-04: Abandoned the `15_v2-bugs` branch. Its two in-flight features — toast notifications
  (toastr) and a dynamic magnet-detect toolbar icon via tabs.onUpdated/onActivated messaging — are
  carried into the v3 plan as requirements, to be re-implemented cleanly (the branch code had bugs:
  `notification` vs `notifications` schema mismatch; content listener referenced `request` instead
  of `message`). Do not merge or cherry-pick from that branch.
- 2026-07-04: Created `v3.0.0` branch from master. Established orchestrator-first workflow with
  this ORCHESTRATOR.md and CLAUDE.md, mirroring sonarr-radarr-lidarr-autosearch-browser-extension.
- 2026-07-04: Wrote V3_MIGRATION_PLAN.md — full rewrite plan adopting the reference repo's
  conventions (dual manifests, Tailwind v4 UI, per-tab options modules, Jest + Playwright,
  GitHub Actions CI, README/CHANGELOG/PRIVACY/REVIEWER_GUIDE/wiki docs set).
- 2026-07-04: Bumped version to 3.0.0 (package.json, package-lock.json, manifest 3.0.0.0,
  README Edge badge).
- 2026-07-04: Implemented the full v3 rewrite (plan phases 1-10 except wiki/website). Decisions
  made during implementation, recorded in V3_MIGRATION_PLAN.md "Implementation notes & deviations":
  hybrid permission model (Chromium optional+programmatic, Firefox declarative install-time,
  because MV2 contentScripts.register dies with the event page); no tabs permission; magnet
  history moved to storage.local; Tailwind v4 CSS-config without tailwind.config.js; dynamic
  version display from runtime.getManifest(); paginationjs dropped; grunt playwright promotes
  optional host permissions in dist/chromium so Playwright can exercise the real registration path.
- 2026-07-04: Verified: jshint clean, 42 Jest tests, 6 Playwright tests (extension loaded in
  Chromium, buttons/SPA/toasts/options exercised for real), web-ext lint 0 errors / 16 warnings
  (all innerHTML notices inside bundled jquery.min.js — accepted, same as reference repo).

Open Risks Queue
- Transmission RPC fetch from the MV3 service worker against a real http:// LAN Transmission host
  is still unverified end-to-end (Playwright covers the failure path only). Smoke test against a
  live Transmission before store submission (plan phase 11).
- Store re-review friction: v2 -> v3 is a large diff with permission changes; REVIEWER_GUIDE.md
  and reproducible builds are the mitigation.
- Settings migration is unit-tested against the captured v2 shape; still verify once by loading
  v3 over a real v2 profile (plan phase 11).
- Firefox options_ui open_in_tab:false — check the options page layout inside about:addons on
  first Firefox smoke test. Mitigated 2026-07-04: html gets background #1d1e22 + color-scheme:dark
  (tailwind.css base layer + meta color-scheme in options/popup HTML) so the inline frame and
  native widgets render dark regardless of the Firefox theme; visual confirmation still pending.

Update Protocol
- After every meaningful task:
  - Append a brief decision or discovery.
  - Update fragile areas and critical-path files if changed.
  - Record any new convention a future subagent should follow.
