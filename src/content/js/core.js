/**
 * All settings
 * @typedef {Object} Setting
 * @property {ConfigSetting} config - general configuration
 * @property {ApiSetting} api - properties used to build the transmission API url
 * @property {SearchSetting} search - magnet link search configuration
 * @property {SiteSetting[]} sites - per-site injected HTML customisations
 * @property {StorageSetting} storage - sent-magnet storage settings
 * @property {NotificationSetting} notifications - toast notification settings
 */

/**
 * General configuration
 * @typedef {Object} ConfigSetting
 * @property {boolean} enabled - is the extension enabled
 * @property {boolean} debug - log to console
 */

/**
 * Transmission API settings
 * @typedef {Object} ApiSetting
 * @property {string} port - transmission API port
 * @property {string} host - transmission API host
 * @property {string} username - transmission API username
 * @property {string} password - transmission API password
 * @property {string} uriFormat - base format that will be used to build the url by having placeholders replaced
 */

/**
 * Magnet link search configuration
 * @typedef {Object} SearchSetting
 * @property {string} attributes - CSV list of element attributes to search for magnet links
 * @property {string} elementTypes - CSV list of element types whose text is searched for magnet links
 */

/**
 * A customised site setting
 * @typedef {Object} SiteSetting
 * @property {number} id - identifier
 * @property {string} name - display name
 * @property {string} search - string used to match the domain of the site
 * @property {string} insertBefore - HTML to insert before the magnet link button
 * @property {string} insertAfter - HTML to insert after the magnet link button
 * @property {string} float - position for the magnet link button; 'none', 'left' or 'right'
 */

/**
 * Sent-magnet storage settings
 * @typedef {Object} StorageSetting
 * @property {boolean} enabled - is magnet storage enabled
 * @property {boolean} buttonsEnabled - keep buttons enabled for magnets already in storage
 */

/**
 * Toast notification settings
 * @typedef {Object} NotificationSetting
 * @property {boolean} showToasts - master toggle; overrides the other two when false
 * @property {boolean} showErrorToasts - show error toasts
 * @property {boolean} showSuccessToasts - show success toasts
 */

/**
 * The response object returned by the transmission API client
 * @typedef {Object} ApiResponse
 * @property {boolean} success - success flag
 * @property {Object} [jsonResponse] - the response from the transmission API
 * @property {string} [uri] - the url used to call the transmission API
 * @property {string} [message] - a status message
 * @property {string} [buttonId] - the id of the button that triggered the request
 * @property {string} [exception] - the message of an exception thrown while calling the API
 */

// Minimal browser API shim for non-extension contexts (Jest, file:// pages).
if (typeof browser === 'undefined') {
    // eslint-disable-next-line no-var
    var browser = {};
    browser._listeners = { storage: [] };
    browser.storage = { _data: {} };
    ['sync', 'local'].forEach(function (area) {
        browser.storage[area] = {
            get: async (keys) => {
                if (keys && typeof keys === 'object' && !Array.isArray(keys)) {
                    const result = {};
                    for (const k in keys) {
                        result[k] = browser.storage._data[k] !== undefined ? browser.storage._data[k] : keys[k];
                    }
                    return result;
                }
                if (typeof keys === 'string') {
                    const result = {};
                    if (browser.storage._data[keys] !== undefined) {
                        result[keys] = browser.storage._data[keys];
                    }
                    return result;
                }
                return browser.storage._data;
            },
            set: async (obj) => {
                const changes = {};
                for (const k in obj) {
                    changes[k] = { oldValue: browser.storage._data[k], newValue: obj[k] };
                }
                Object.assign(browser.storage._data, obj);
                browser._listeners.storage.forEach(fn => fn(changes, area));
            }
        };
    });
    browser.storage.onChanged = { addListener: (fn) => browser._listeners.storage.push(fn) };
    browser.runtime = {
        sendMessage: async () => ({}),
        onMessage: { addListener: () => {} },
        getManifest: () => ({ version: '0.0.0.0' })
    };
}

/**
 * Global variables
 */
const magnetLinkPattern = /magnet:\?xt=urn:btih:[a-zA-Z0-9]*/g,
    settingsStorageKey = 'magnetLinkerSettings',
    magnetsStorageKey = 'magnetLinkerMagnets',
    /** @type {Setting} */
    defaultSettings = {
        config: {
            enabled: true,
            debug: false
        },
        api: {
            port: '',
            host: '',
            username: '',
            password: '',
            uriFormat: 'http://[host]:[port]/transmission/rpc'
        },
        search: {
            attributes: 'href',
            elementTypes: 'code'
        },
        sites: [],
        storage: {
            enabled: false,
            buttonsEnabled: true
        },
        notifications: {
            showToasts: true,
            showErrorToasts: true,
            showSuccessToasts: false
        }
    };

/**
 * Extract all magnet URIs from a string.
 * @param {string} text
 * @returns {string[]} unique magnet URIs found in the text
 */
function extractMagnetUris(text) {
    if (!text) {
        return [];
    }

    const matches = String(text).match(magnetLinkPattern) || [];

    return matches.filter((m, i) => matches.indexOf(m) === i);
}

/**
 * Apply defaults to a raw stored settings object, migrating the flat v2 shape
 * (enabled/debug/storageEnabled/storageButtonsEnabled at the top level, credentials
 * embedded in api.uriFormat) to the nested v3 shape. Pure function.
 * @param {Object} raw - raw object from storage (may be undefined or v2-shaped)
 * @returns {Setting} settings with every property present
 */
function applySettingsDefaults(raw) {
    const s = (raw && typeof raw === 'object') ? raw : {};

    /** @type {Setting} */
    const settings = {
        config: {
            enabled: s.config && s.config.hasOwnProperty('enabled') ? s.config.enabled : (s.hasOwnProperty('enabled') ? s.enabled : defaultSettings.config.enabled),
            debug: s.config && s.config.hasOwnProperty('debug') ? s.config.debug : (s.hasOwnProperty('debug') ? s.debug : defaultSettings.config.debug)
        },
        api: Object.assign({}, defaultSettings.api, s.api),
        search: Object.assign({}, defaultSettings.search, s.search),
        sites: Array.isArray(s.sites) ? s.sites : [],
        storage: {
            enabled: s.storage && s.storage.hasOwnProperty('enabled') ? s.storage.enabled : (s.hasOwnProperty('storageEnabled') ? s.storageEnabled : defaultSettings.storage.enabled),
            buttonsEnabled: s.storage && s.storage.hasOwnProperty('buttonsEnabled') ? s.storage.buttonsEnabled : (s.hasOwnProperty('storageButtonsEnabled') ? s.storageButtonsEnabled : defaultSettings.storage.buttonsEnabled)
        },
        notifications: Object.assign({}, defaultSettings.notifications, s.notifications)
    };

    // v2 embedded credentials in the url; v3 sends a Basic Authorization header instead
    if (settings.api.uriFormat && settings.api.uriFormat.includes('[username]:[password]@')) {
        settings.api.uriFormat = settings.api.uriFormat.replace('[username]:[password]@', '');
    }

    return settings;
}

/**
 * True when the raw stored object still carries v2-only shape that should be
 * migrated (flat config keys or a legacy magnets array). Pure function.
 * @param {Object} raw
 * @returns {boolean}
 */
function settingsNeedMigration(raw) {
    if (!raw || typeof raw !== 'object') {
        return false;
    }

    return raw.hasOwnProperty('enabled') ||
        raw.hasOwnProperty('debug') ||
        raw.hasOwnProperty('storageEnabled') ||
        raw.hasOwnProperty('storageButtonsEnabled') ||
        (Array.isArray(raw.magnets) && raw.magnets.length > 0) ||
        (typeof raw.api === 'object' && raw.api && String(raw.api.uriFormat || '').includes('[username]:[password]@'));
}

/**
 * Logs to console if the debug flag is set.
 * Always warns or errors regardless of the debug flag.
 * @param {any} content - string or array of objects
 * @param {string} logLevel - 'info', 'warn' or 'error'
 */
async function log(content, logLevel = 'info') {
    if (logLevel === 'info') {
        const settings = await getSettings();

        if (!settings.config.debug) {
            return;
        }
    }

    const identifier = `[MagnetLinkExt ${new Date().toISOString()}]`;

    if (typeof content === 'string' || content instanceof String) {
        content = `${identifier} ${content}`;
    } else {
        content = [identifier].concat(content);
    }

    switch (logLevel) {
        case 'warn':
            console.warn(content);
            return;

        case 'error':
            console.error(content);
            return;

        default:
            console.log(content);
    }
}

/**
 * Retrieves settings from sync storage, applying defaults for missing properties
 * and migrating the v2 flat shape (including moving the legacy magnets array to
 * local storage) the first time it is seen.
 * @returns {Promise<Setting>} settings
 */
async function getSettings() {
    const data = await browser.storage.sync.get(settingsStorageKey);
    const raw = data[settingsStorageKey];
    const settings = applySettingsDefaults(raw);

    if (settingsNeedMigration(raw)) {
        if (Array.isArray(raw.magnets) && raw.magnets.length > 0) {
            const existing = await getMagnets();
            const merged = existing.concat(raw.magnets.filter(m => !existing.includes(m)));

            await browser.storage.local.set({ [magnetsStorageKey]: merged });
        }

        await setSettings(settings);
    }

    return settings;
}

/**
 * Saves settings to sync storage, applying defaults for missing properties.
 * @param {Setting} data - settings to save
 * @returns {Promise<Setting>} settings as saved
 */
async function setSettings(data) {
    const settings = applySettingsDefaults(data);

    await browser.storage.sync.set({ [settingsStorageKey]: settings });

    return settings;
}

/**
 * Resets settings to defaults. Does not clear stored magnets.
 * @returns {Promise<Setting>} the default settings
 */
async function resetSettings() {
    return setSettings(JSON.parse(JSON.stringify(defaultSettings)));
}

/**
 * Retrieves the sent-magnet history from local storage.
 * @returns {Promise<string[]>} magnets
 */
async function getMagnets() {
    const data = await browser.storage.local.get({ [magnetsStorageKey]: [] });

    return data[magnetsStorageKey];
}

/**
 * Adds a magnet to the sent-magnet history if not already present.
 * @param {string} magnet
 * @returns {Promise<string[]>} the updated magnet list
 */
async function addMagnet(magnet) {
    const magnets = await getMagnets();

    if (!magnets.includes(magnet)) {
        magnets.push(magnet);

        await browser.storage.local.set({ [magnetsStorageKey]: magnets });
    }

    return magnets;
}

/**
 * Replaces the sent-magnet history.
 * @param {string[]} magnets
 */
async function setMagnets(magnets) {
    await browser.storage.local.set({ [magnetsStorageKey]: Array.isArray(magnets) ? magnets : [] });
}

/**
 * Clears the sent-magnet history.
 */
async function clearMagnets() {
    await setMagnets([]);
}

/**
 * Build a URL to call the transmission API or display on the options page.
 * Replaces [host], [port], [username] and [password] tokens in the uriFormat.
 * Pure function.
 * @param {ApiSetting} api - api settings
 * @param {{start: string, end: string}} [wrapFields] - optional wrapping for display purposes
 * @returns {string} the url
 */
function buildApiUrl(api, wrapFields) {
    const wrap = (value) => wrapFields ? `${wrapFields.start}${value}${wrapFields.end}` : value;

    return (api.uriFormat || '')
        .replace('[username]', wrap(api.username))
        .replace('[password]', wrap(api.password))
        .replace('[host]', wrap(api.host))
        .replace('[port]', wrap(api.port));
}

/**
 * Find the site customisation matching a hostname. Last match wins, mirroring
 * v2 behaviour. Pure function.
 * @param {SiteSetting[]} sites
 * @param {string} hostname
 * @returns {SiteSetting|null}
 */
function findSiteCustomisation(sites, hostname) {
    let match = null;

    (sites || []).forEach(function (site) {
        if (site.search && String(hostname).toLowerCase().includes(String(site.search).toLowerCase())) {
            match = site;
        }
    });

    return match;
}

/**
 * Whether a toast should be shown for the given theme under the given
 * notification settings. The master toggle overrides both others. Pure function.
 * @param {NotificationSetting} notifications
 * @param {string} theme - 'error', 'success' or 'info'
 * @returns {boolean}
 */
function shouldShowToast(notifications, theme) {
    if (!notifications || !notifications.showToasts) {
        return false;
    }

    return theme === 'error' ? notifications.showErrorToasts : notifications.showSuccessToasts;
}

/*
 * Log old and new values when an item in a storage area is changed
 */
browser.storage.onChanged.addListener(function (changes, area) {
    for (const item of Object.keys(changes)) {
        log([`change in storage area '${area}' to item '${item}'`, 'old:', changes[item].oldValue, 'new:', changes[item].newValue]);
    }
});

// Export pure helpers for Jest unit tests (no-op inside the extension runtime).
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        defaultSettings,
        extractMagnetUris,
        applySettingsDefaults,
        settingsNeedMigration,
        buildApiUrl,
        findSiteCustomisation,
        shouldShowToast
    };
}
