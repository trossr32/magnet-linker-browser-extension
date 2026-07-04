/**
 * Shared background logic for both browsers.
 *
 * Loaded by eventPage.chrome.js (Chromium MV3 service worker, via importScripts)
 * and eventPage.js (Firefox MV2 event page, via manifest background.scripts).
 * Requires core.js and transmission.js.
 *
 * Responsibilities:
 * - Chromium only: register/unregister the content scripts programmatically when
 *   the optional <all_urls> host permission is granted/revoked. Firefox declares
 *   its content scripts in the manifest (host access is granted at install time),
 *   so registration is a no-op there.
 * - Handle messages from content scripts, options and popup.
 * - Keep the per-tab toolbar icon in sync (normal / faded / magnets-found).
 */

const backgroundAction = browser.action || browser.browserAction;

const contentScriptConfig = {
    id: 'magnet-linker',
    matches: ['<all_urls>'],
    js: [
        'content/js/jquery.min.js',
        'content/js/browser-polyfill.min.js',
        'content/js/core.js',
        'content/js/content_script.js'
    ],
    css: ['content/css/content_script.css'],
    runAt: 'document_idle'
};

/**
 * True when the extension can run on all sites.
 * @returns {Promise<boolean>}
 */
async function hasAllSitesPermission() {
    return browser.permissions.contains({ origins: ['<all_urls>'] });
}

/**
 * Register the content scripts on Chromium when the all-sites permission is
 * granted; unregister them when it is not. No-op on Firefox MV2 (declarative).
 */
async function syncContentScriptRegistration() {
    if (!browser.scripting || !browser.scripting.registerContentScripts) {
        return;
    }

    const granted = await hasAllSitesPermission();
    const registered = await browser.scripting.getRegisteredContentScripts({ ids: [contentScriptConfig.id] });

    if (granted && registered.length === 0) {
        log('[background.js] registering content scripts');

        await browser.scripting.registerContentScripts([{
            id: contentScriptConfig.id,
            matches: contentScriptConfig.matches,
            js: contentScriptConfig.js,
            css: contentScriptConfig.css,
            runAt: contentScriptConfig.runAt,
            persistAcrossSessions: true
        }]);
    } else if (!granted && registered.length > 0) {
        log('[background.js] unregistering content scripts');

        await browser.scripting.unregisterContentScripts({ ids: [contentScriptConfig.id] });
    }
}

/**
 * Set the toolbar icon for a tab based on enabled state and magnet presence.
 * @param {number} tabId
 * @param {boolean} hasMagnets
 */
async function setIcon(tabId, hasMagnets) {
    const settings = await getSettings();

    let variant = ''; // enabled, no magnets

    if (!settings.config.enabled) {
        variant = '-faded';
    } else if (hasMagnets) {
        variant = '-magnets';
    }

    const details = { path: `content/assets/images/Transmission${variant}16.png` };

    if (typeof tabId === 'number') {
        details.tabId = tabId;
    }

    try {
        await backgroundAction.setIcon(details);
    } catch (e) {
        // tab may have closed between the event and the update
    }
}

/**
 * Ask the content script in a tab whether the page has magnet links and update
 * the tab's icon accordingly. Tabs without the content script resolve to false.
 * @param {number} tabId
 */
async function refreshIconForTab(tabId) {
    let hasMagnets = false;

    try {
        const response = await browser.tabs.sendMessage(tabId, { name: 'checkMagnets' });

        hasMagnets = !!(response && response.hasMagnets);
    } catch (e) {
        // no content script in this tab (not granted, browser UI page, etc.)
    }

    await setIcon(tabId, hasMagnets);
}

/**
 * Refresh the icon for the active tab (used after settings changes).
 */
async function refreshIconForActiveTab() {
    try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });

        if (tabs.length > 0) {
            await refreshIconForTab(tabs[0].id);
        }
    } catch (e) {
        log(['[background.js] refreshIconForActiveTab failed', e], 'error');
    }
}

/**
 * Wire up all background listeners. Called once by each browser's eventPage.
 */
function initBackground() {
    browser.runtime.onInstalled.addListener(async function (details) {
        log(['[background.js] onInstalled', details.reason]);

        await syncContentScriptRegistration();

        // Walk new Chromium users through granting site access; Firefox grants at install.
        if (details.reason === 'install') {
            const granted = await hasAllSitesPermission();

            if (!granted) {
                await browser.runtime.openOptionsPage();
            }
        }
    });

    if (browser.runtime.onStartup) {
        browser.runtime.onStartup.addListener(function () {
            syncContentScriptRegistration();
        });
    }

    if (browser.permissions.onAdded) {
        browser.permissions.onAdded.addListener(function () {
            syncContentScriptRegistration();
        });
    }

    if (browser.permissions.onRemoved) {
        browser.permissions.onRemoved.addListener(function () {
            syncContentScriptRegistration();
        });
    }

    browser.runtime.onMessage.addListener(function (message, sender) {
        log(['[background.js] onMessage', message && message.name]);

        if (!message || !message.name) {
            return;
        }

        switch (message.name) {
            case 'addTorrent':
                return handleAddTorrent(message);

            case 'getTorrents':
                return getTorrents();

            case 'testConnection':
                return testConnection();

            case 'magnetsFound':
                if (sender.tab && typeof sender.tab.id === 'number') {
                    setIcon(sender.tab.id, !!message.hasMagnets);
                }
                return;

            case 'settingsChanged':
                return Promise.all([syncContentScriptRegistration(), refreshIconForActiveTab()]).then(() => ({}));
        }
    });

    browser.tabs.onUpdated.addListener(function (tabId, changeInfo) {
        if (changeInfo.status === 'complete') {
            refreshIconForTab(tabId);
        }
    });

    browser.tabs.onActivated.addListener(function (activeInfo) {
        refreshIconForTab(activeInfo.tabId);
    });

    // catch registration drift on service worker wake
    syncContentScriptRegistration();
}

/**
 * Handle an add-torrent request from a content script.
 * @param {{name: string, magnet: string, buttonId: string}} message
 * @returns {Promise<ApiResponse>}
 */
async function handleAddTorrent(message) {
    if (!message.magnet) {
        return { success: false, message: 'No magnet link supplied.', buttonId: message.buttonId };
    }

    const response = await addTorrent(message.magnet);

    response.buttonId = message.buttonId;
    response.magnet = message.magnet;

    if (response.success) {
        const settings = await getSettings();

        if (settings.storage.enabled) {
            await addMagnet(message.magnet);
        }
    }

    return response;
}
