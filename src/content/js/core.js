/**
 * All settings
 * @typedef {Object} Setting
 * @property {ApiSetting} api - properties used to build the transmission API url
 * @property {string[]} magnets - magnets sent to transmission
 * @property {SiteSetting[]} sites - all site settings
 * @property {bool} enabled - is enabled
 * @property {bool} debug - log to console
 * @property {StorageSetting} storage - storage settings
 * @property {NotificationSetting} notification - notification settings
 */

/**
 * A customised storage setting
 * @typedef {Object} StorageSetting
 * @property {bool} storageEnabled - is magnet storage enabled
 * @property {bool} storageButtonsEnabled - disable buttons matching stored magnets
 */

/**
 * A customised notification setting
 * @typedef {Object} NotificationSetting
 * @property {bool} showToasts - show toasts
 * @property {bool} showErrorToasts - show error toasts
 * @property {bool} showSuccessToasts - show success toasts
 */

/**
 * A customised site setting
 * @typedef {Object} ApiSetting
 * @property {string} port - transmission API port
 * @property {string} host - transmission API host
 * @property {string} username - transmission API username
 * @property {string} password - transmission API password
 * @property {string} uriFormat - base format that will be used to build the url by having placeholders replaced
 */

/**
 * A customised site setting
 * @typedef {Object} SiteSetting
 * @property {string} name - identifier
 * @property {string} search - string used to match the domain of the site
 * @property {string} insertBefore - HTML to insert before the magnet link button
 * @property {string} insertAfter - HTML to insert after the magnet link button
 * @property {string} float - position for the magnet link button; 'none', 'left' or 'right'
 */

/**
 * The response object returned by the function that calls the transmission API
 * @typedef {Object} ApiResponse
 * @property {bool} success - success flag
 * @property {Object} jsonResponse - the response from the transmission API
 * @property {string} uri - the url used to call the transmission API
 * @property {string} message - a status message
 * @property {string} buttonId - the id of the button that triggered the request
 * @property {Object} exception - the exception thrown by the transmission API
 */

/**
 * The response object returned by the function that calls the transmission API
 * @typedef {Object} TorrentRequest
 * @property {string} method - the functionality to perform when the message is received by the event page
 * @property {string} buttonId - the id of the button that triggered the request
 * @property {string} magnet - the magnet url
 */

/**
 * Global variables
 */
 let sessionId,
    /** @type {Setting} */
    defaultSettings = {
        api: {
            port: '',
            host: '',
            username: '',
            password: '',
            uriFormat: 'http://[username]:[password]@[host]:[port]/transmission/rpc'
        },
        search: {
            attributes: 'href',
            elementTypes: 'code'
        },
        magnets: [],
        sites: [],
        enabled: true,
        debug: true,
        storage: {
            storageEnabled: false,
            storageButtonsEnabled: true
        },
        notifications: {
            showToasts: true,
            showErrorToasts: true,
            showSuccessToasts: false
        }
    },
    magnetLinkPattern = /magnet:\?xt=urn:btih:[a-zA-Z0-9]*/g;

/**
 * Logs to console if the debug flag is set. 
 * Always warns or errors regardless of if the debug flag is set. 
 * Should be a string or array of objects.
 * Adds an identifier to the start of the content if it's a string, otherwise as a string object at the beginning of the array.
 * @param {any[]} content 
 * @param {string} logLevel
 */
async function log(content, logLevel = 'info') {
    const settings = await getSettings();

    if (!settings.debug && logLevel === 'info') {
        return;
    }

    const identifier = `[MagnetLinkExt ${new Date().toISOString()}]`;

    // concat identifier if it's a string
    if (typeof content === "string" || content instanceof String) {
        content = `${identifier} ${content}`;
    } 
    // otherwise it's an array
    else {
        content.unshift(identifier);
    }

    switch (logLevel) {
        case 'info':
            console.log(content);
            return;
          
        case 'warn':
            console.warn(content);
            return;
          
        case 'error':
            console.error(content);
            return;  
    }
}

/*
* Log old and new values when an item in a storage area is changed
*/
let logStorageChange = function(changes, area) {
    let changedItems = Object.keys(changes);
  
    for (let item of changedItems) {
        log(`Change in storage area: ${area} to item ${item}`);
        log(['Old value: ', changes[item].oldValue]);
        log(['New value: ', changes[item].newValue]);
    }
};

browser.storage.onChanged.addListener(logStorageChange);

/**
 * Retrieves settings from local storage
 * Checks for potentially missing properties in the settings object (caused by new properties being added on new versions of the code) 
 * and create those properties as defaults or from the defaultSettings object.
 * @returns {Promise<Setting>} settings
 */
async function getSettings() {
    let data = await browser.storage.sync.get({ 'magnetLinkerSettings': defaultSettings });

    if (!data.magnetLinkerSettings.hasOwnProperty('sites')) {
        data.magnetLinkerSettings.sites = [];
    }

    if (!data.magnetLinkerSettings.hasOwnProperty('enabled')) {
        data.magnetLinkerSettings.enabled = true;
    }

    if (!data.magnetLinkerSettings.hasOwnProperty('debug')) {
        data.magnetLinkerSettings.debug = false;
    }

    if (!data.magnetLinkerSettings.hasOwnProperty('storage')) {
        data.magnetLinkerSettings.storage = defaultSettings.storage;
    }

    if (!data.magnetLinkerSettings.hasOwnProperty('notifications')) {
        data.magnetLinkerSettings.notifications = defaultSettings.notifications;
    }

    return data.magnetLinkerSettings;
}

/**
 * Saves settings to local storage
 * Checks for potentially missing properties in the settings object (caused by new properties being added on new versions of the code) 
 * and create those properties as defaults or from the defaultSettings object.
 * @param {Setting} data - settings to save
 * @returns {Promise<Setting>} settings
 */
async function setSettings(data) {
    if (!data.hasOwnProperty('sites')) {
        data.sites = [];
    }

    if (!data.hasOwnProperty('enabled')) {
        data.enabled = true;
    }

    if (!data.hasOwnProperty('debug')) {
        data.debug = false;
    }

    if (!data.hasOwnProperty('storage')) {
        data.storage = defaultSettings.storage;
    }

    if (!data.hasOwnProperty('notifications')) {
        data.notifications = defaultSettings.notifications;
    }

    let obj = {
        'magnetLinkerSettings': data
    };

    await browser.storage.sync.set(obj);

    return data;
}

/**
 * Build a URL to call the transmission API or display on the options page
 * @param {string} siteId 
 * @param {string} endpoint 
 * @returns {URL} - the url
 */
 let buildApiUrl = function(request) {
    log(['[core.js] buildApiUrl', request]);

    if (request.wrapFields) {
        return request.uriFormat
            .replace('[username]', `${request.wrapFields.start}${request.username}${request.wrapFields.end}`)
            .replace('[password]', `${request.wrapFields.start}${request.password}${request.wrapFields.end}`)
            .replace('[host]', `${request.wrapFields.start}${request.host}${request.wrapFields.end}`)
            .replace('[port]', `${request.wrapFields.start}${request.port}${request.wrapFields.end}`);        
    }
    
    return request.uriFormat
            .replace('[username]', request.username)
            .replace('[password]', request.password)
            .replace('[host]', request.host)
            .replace('[port]', request.port);
};