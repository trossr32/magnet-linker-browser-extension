/* jshint esversion: 8 */

/**
 * A setting
 * @typedef {Object} Setting
 * @property {APISetting} api - 
 * @property {Search} search - 
 * @property {string[]} magnets - 
 * @property {string[]} sites - 
 * @property {bool} enabled - is enabled
 * @property {bool} pageHasMagnets - is enabled
 * @property {bool} debug - show debug logging
 */

/**
 * API settings
 * @typedef {Object} APISetting
 * @property {string} port - Transmission port
 * @property {string} host - Transmission host
 * @property {string} username - Transmission user
 * @property {string} password - Transmission password
 * @property {string} uriFormat - Transmission API URL format
 */

/**
 * Search settings
 * @typedef {Object} Search
 * @property {string} attributes - 
 * @property {string} elementTypes - 
 */

/**
 * Global variables
 */
var sessionId,
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
        pageHasMagnets: false,
        debug: false
    };

/**
 * logs to console if the debug flag is set
 * @param {any[]} content 
 */
var log = async (content) => {
    const settings = await getSettings();

    if (!settings.debug) {
        return;
    }

    console.log(content);
};

/*
* Log old and new values when an item in a storage area is changed
*/
var logStorageChange = async (changes, area) => {
    let changedItems = Object.keys(changes);
  
    for (let item of changedItems) {
        await log(`Change in storage area: ${area} to item ${item}`);
        await log(['Old value: ', changes[item].oldValue]);
        await log(['New value: ', changes[item].newValue]);
    }
};

browser.storage.onChanged.addListener(logStorageChange);

/**
 * Retrieves settings from local storage
 * Checks for potentially missing properties in the settings object (caused by new properties being added on new versions of the code) 
 * and create those properties as defaults or from the defaultSettings object.
 */
var getSettings = async () => {
    var data = await browser.storage.local.get({ 'magnetLinkerSettings': defaultSettings });

    if (!data.magnetLinkerSettings.hasOwnProperty('sites')) {
        data.magnetLinkerSettings.sites = [];
    }

    if (!data.magnetLinkerSettings.hasOwnProperty('enabled')) {
        data.magnetLinkerSettings.enabled = true;
    }

    if (!data.magnetLinkerSettings.hasOwnProperty('pageHasMagnets')) {
        data.magnetLinkerSettings.pageHasMagnets = false;
    }

    if (!data.magnetLinkerSettings.hasOwnProperty('debug')) {
        data.magnetLinkerSettings.debug = false;
    }

    return data.magnetLinkerSettings;
};

/**
 * Saves settings to local storage
 * Checks for potentially missing properties in the settings object (caused by new properties being added on new versions of the code) 
 * and create those properties as defaults or from the defaultSettings object.
 * @param {Setting} data - settings to save
 */
var setSettings = async (data) => {
    if (!data.hasOwnProperty('sites')) {
        data.sites = [];
    }

    if (!data.hasOwnProperty('enabled')) {
        data.enabled = true;
    }

    if (!data.hasOwnProperty('pageHasMagnets')) {
        data.pageHasMagnets = false;
    }

    if (!data.hasOwnProperty('debug')) {
        data.enabled = false;
    }
        
    var obj = {
        magnetLinkerSettings: data
    };

    await browser.storage.local.set(obj);

    return data;
};

var buildApiUrl = async (request) => {
    if (request.wrapFields) {
        return request.uriFormat
            .replace('[username]', request.wrapFields.start + request.username + request.wrapFields.end)
            .replace('[password]', request.wrapFields.start + request.password + request.wrapFields.end)
            .replace('[host]', request.wrapFields.start + request.host + request.wrapFields.end)
            .replace('[port]', request.wrapFields.start + request.port + request.wrapFields.end);            
    }
    
    return request.uriFormat
        .replace('[username]', request.username)
        .replace('[password]', request.password)
        .replace('[host]', request.host)
        .replace('[port]', request.port);
};

var setIcon = async () => {
    const tab = await browser.tabs.getCurrent();
    const settings = await getSettings();

    var i = ''; // enabled no magnets

    if (!settings.enabled) {
        i = `${i}-faded`; // not enabled
    } else if (settings.pageHasMagnets) {
        i = `${i}-magnets`; // enabled with magnets
    }

    let img = `content/assets/images/Transmission${i}16.png`;

    await browser.browserAction.setIcon({ path: img });
};

var addTorrent = async (magnet) => {
    let response = await callApi(JSON.stringify({ 
        arguments: { filename: magnet },
        method: "torrent-add",
        tag: 8
    }));
            
    if (response.success) {
        response.message = `Success! Added Torrent: "${response.jsonResponse.arguments.torrent-added.name}"`;
    }

    response.magnet = request.magnet;

    var settings = await getSettings();

    settings.magnets.push(response.magnet);

    response.settings = await setSettings(settings);

    return response;
};

var getTorrents = async () => {
    let response = await callApi(JSON.stringify({
        arguments: { fields: 'id,name' },
        method: "torrent-get",
        tag: 8
    }));

    return response;
};

async function callApi(data) {
    let settings = await getSettings();
            
    let xHttp = new XMLHttpRequest(),
        httpResponse,
        uri = await buildApiUrl(settings.api);
        
    xHttp.open("POST", uri, true);

    if (sessionId) {
        xHttp.setRequestHeader("X-Transmission-Session-Id", sessionId);
    }

    try {
        xHttp.onreadystatechange = async () => {
            if (xHttp.readyState == 4) {
                httpResponse = xHttp.responseText;

                try {
                    if (httpResponse.length > 0) {
                        switch (xHttp.status) {
                            case 200: // status OK
                                httpResponse = xHttp.responseText;
                                var jsonResponse = JSON.parse(httpResponse);

                                // json key containing dash-hyphen '-' is an invalid javascript identifier, so we need to use array [' '] syntax instead
                                return { success: (jsonResponse.result.toLowerCase() == "success"), jsonResponse: jsonResponse, uri: uri };
                                
                            case 409: // need new session-id
                                sessionId = xHttp.getResponseHeader("X-Transmission-Session-Id");

                                let response = await callApi(data);

                                return response;

                            case 401:
                                return { success: false, message: 'unauthorised user (401)', uri: uri };
                              
                            default:
                                return { success: false, message: `unknown http.status: ${xHttp.status}`, uri: uri };
                        }
                    } else {
                        return { success: false, message: 'error: empty response', uri: uri };
                    }
                } catch (e) {
                    return { success: false, message: `unknown error: ${e.message}`, uri: uri };
                }
            }
        };
    } catch (e) {
        return { success: false, message: `unknown error: ${e.message}`, uri: uri };
    }

    try {
        xHttp.send(data);
    } catch (e) {
        return { success: false, message: `unknown error: ${e.message}`, uri: uri };
    }
}