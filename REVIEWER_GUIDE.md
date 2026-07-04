# Store Reviewer Guide — Magnet Linker

This document is for Chrome Web Store, Mozilla AMO and Microsoft Edge Add-ons reviewers. It explains what the extension does, how to reproduce the build, why each permission is requested, and how to test it.

## 1. Summary

Magnet Linker finds magnet links on web pages and injects a **Send to Transmission** button next to each one. Clicking the button sends the torrent to the user's own, self-hosted [Transmission](https://transmissionbt.com/) instance via its RPC API.

Data-handling guarantees:

- No analytics, telemetry or tracking of any kind.
- No remote code: every script is bundled from npm at build time; nothing is loaded from a CDN.
- The only network requests are POSTs to the Transmission server the user configures.
- Settings live in `browser.storage.sync`; the optional magnet history lives in `browser.storage.local`.

## 2. Repository layout

| Path | Purpose |
|------|---------|
| `src/` | All source: backgrounds, content script, options/popup UI |
| `src/manifest-chromium/manifest.json` | Chromium MV3 manifest |
| `src/manifest-firefox/manifest.json` | Firefox MV2 manifest |
| `src/eventPage.chrome.js` | MV3 service worker bootstrap (Chromium build only) |
| `src/eventPage.js` | MV2 event page bootstrap (Firefox build only) |
| `src/content/js/` | core (settings), transmission (RPC client), background (shared), content script, options tabs, popup |
| `dist/` | Build output (gitignored) — what is submitted to the stores |
| `tests/` | Jest unit tests and Playwright integration tests |
| `Gruntfile.js` | Build pipeline |

## 3. Build & verification (reproducible)

```bash
npm ci
npx grunt review     # builds dist/chromium and dist/firefox without packaging
```

Every file in `dist/` maps directly to a source file or an npm package:

| Built file | Origin |
|------------|--------|
| `content/js/jquery.min.js` | npm `jquery` (verbatim) |
| `content/js/browser-polyfill.min.js` | npm `webextension-polyfill` (verbatim) |
| `content/js/fontawesome.min.js`, `solid.min.js`, `brands.min.js` | npm `@fortawesome/fontawesome-free` (verbatim) |
| `content/css/tailwind.css` | compiled from `src/content/css/tailwind.css` by Tailwind CLI |
| everything else | copied unmodified from `src/` |

No minification or obfuscation is applied to first-party code.

## 4. Permissions & justification

### Chromium (MV3)

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | required | Save settings (sync) and optional magnet history (local). |
| `scripting` | required | Register the content scripts programmatically once the user grants site access. |
| `<all_urls>` | **optional** (`optional_host_permissions`) | Magnet links can appear on any website, so there is no meaningful host list to declare. The user grants this explicitly from the options page or popup (runtime consent); until then the extension does nothing on any page. The same grant allows the background to reach the user's own Transmission server. |

### Firefox (MV2)

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | required | As above. |
| `<all_urls>` | required (install-time consent) | As above; MV2 host permissions are consented to at install. `data_collection_permissions` is declared as `none`. |

The extension deliberately does not request `tabs` (it never reads tab URLs/titles beyond what host permissions already allow) or `activeTab`.

## 5. Architecture & data flow

1. **Content script** (`content_script.js`, runs at `document_idle`): scans the DOM for magnet URIs using user-configurable attribute/element-type lists, injects buttons (marked with `data-magnet-linker-*` attributes for idempotence), and shows toast notifications. It never talks to the network.
2. **Background** (`background.js` shared by both browsers): receives `addTorrent` messages, calls the Transmission RPC API via fetch (`transmission.js`) with Basic auth and the `X-Transmission-Session-Id` 409 handshake, stores sent magnets when enabled, and keeps the per-tab toolbar icon in sync. On Chromium it also registers/unregisters the content scripts when the optional host permission changes.
3. **Options/popup**: standard extension pages; every change auto-saves to `browser.storage`.

## 6. How to test functionally

1. Load `dist/chromium` (chrome://extensions, developer mode) or `dist/firefox` (about:debugging).
2. Chromium: the options page opens on install; click **Grant access**.
3. Serve the bundled fixture page: `npx http-server Test -p 8123`, then open `http://localhost:8123/magnet-test.html`.
4. Buttons appear next to the four magnet links (three anchors, one `<code>` element). The toolbar icon switches to the magnets variant.
5. Without a configured API, clicking a button shows **API call failed** and an error toast.
6. With a reachable Transmission instance configured on the API tab, **Test connection** reports the Transmission version and clicking a button reports success.

## 7. Security checklist

| Check | Result |
|-------|--------|
| Remote script loading | None — all scripts bundled |
| `eval` / `new Function` in first-party code | None |
| External endpoints | Only the user-configured Transmission host |
| Credentials handling | Stored in `browser.storage.sync`, sent only as a Basic Authorization header to the user's own server |
| Injected content isolation | All injected CSS/DOM is `magnet-linker-` prefixed; no framework stylesheets are injected into pages |

Quick audit greps: `grep -rn "eval(\|new Function\|fetch(" src/` — the only `fetch` is in `src/content/js/transmission.js` (background-only RPC client).

## 8. Automated tests

- `npm test` — Jest unit tests (settings migration, magnet extraction, URL building, toast gating).
- `tests/playwright/` — Playwright loads the built extension into Chromium and verifies injection, SPA behaviour, failure handling and options persistence against the local fixture page (`Test/magnet-test.html`); no third-party sites are contacted.

## 9. Contact

Questions: open an issue at <https://github.com/trossr32/magnet-linker-browser-extension/issues>.
