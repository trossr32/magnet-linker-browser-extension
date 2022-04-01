/**
 * Get settings, set the extension icon and execute the content script
 */
// async function initRun(evt) {
//     await log(`[eventPage.js] running init from ${evt} event`);

//     try {
//         await browser.tabs.insertCSS(null, { file: 'content/css/bootstrap.tw.min.css' });
//         await browser.tabs.insertCSS(null, { file: 'content/css/content_script.css' });
//         //await browser.tabs.executeScript(null, { file: 'content/js/jquery.min.js' });
//         await browser.tabs.executeScript(null, { file: 'content/js/bootstrap.micro.min.js' });
//         //await browser.tabs.executeScript({ file: 'content/js/browser-polyfill.min.js' });
//         //await browser.tabs.executeScript({ file: 'content/js/core.js' });
//         await browser.tabs.executeScript({ file: 'content/js/content_script.js' });
//     }
//     catch(e) {
//         await log(e.message, 'error');
//     }
// }

browser.runtime.onConnect.addListener(function(port) {
    log([`[eventPage.js] browser.runtime.onConnect`, port.name]);

    switch (port.name) {
        //case 'magnetCheck':
            // port.onMessage.addListener(async function (request) {
            //     await initRun('onConnect', request.magnets);
            // });
            // break;

        case 'icon':
            port.onMessage.addListener(function (request) {
                setIcon(request.magnets);
            });
            break;

        case 'torrent':
            port.onMessage.addListener(function(/** @type {TorrentRequest} */ request) {
                try {
                    switch (request.method) {
                        case 'add':
                            if (request.magnet) {
                                addTorrent(request.magnet, async function(addResponse) {
                                    addResponse.buttonId = request.buttonId;
                                    addResponse.magnet = request.magnet;

                                    getSettings()
                                        .then(function(settings) {
                                            if (settings.storageEnabled) {
                                                settings.magnets.push(addResponse.magnet);

                                                setSettings(settings);
                                            }

                                            port.postMessage(addResponse);
                                        });                                    
                                }); 
                            } else {
                                /** @type {ApiResponse} */
                                let addFailresponse = { 
                                    success: false,
                                    message: 'no magnet link supplied!', 
                                    buttonId: request.buttonId 
                                };
                                
                                port.postMessage(addFailresponse);
                            }
                            break;

                        case 'getAll':
                            getTorrents(function(getResponse) {
                                port.postMessage(getResponse);
                            });
                            break;

                        default:
                            /** @type {ApiResponse} */
                            let response = { 
                                success: false, 
                                message: `unknown method : ${request.method}`, 
                                buttonId: request.buttonId 
                            };

                            port.postMessage(response);
                            break;
                    }
                } catch (e) {
                    /** @type {ApiResponse} */
                    let exceptionResponse = { 
                        success: false, 
                        magnet: request.magnet, 
                        exception: e 
                    };

                    port.postMessage(exceptionResponse);
                }
            });
            break;
    }
});

// define a port to call the magnet_link_checker content script and update the extension's icon based on whether magnets exist within the tab
//var checkMagnetsPort = browser.tabs.connect({name: 'checkMagnets'});

// listen for tab update/activation and post a magnet check request
browser.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    log(['[eventPage.js] browser.tabs.onUpdated', 'change info status', changeInfo]);

    if (changeInfo.status == 'complete') {
        browser.tabs.sendMessage(tabId, {name: 'checkMagnets'})
            .then(function(response) {
                setIcon(response.hasMagnets);
            });
    }
});

browser.tabs.onActivated.addListener(function (activeInfo) {
    log(`[eventPage.js] browser.tabs.onActivated`);

    var tab = browser.tabs.query({
        currentWindow: true, active: true
    });

    tab.then(function (tabs) {
        log(['[eventPage.js] browser.tabs.onActivated', tabs])

        if (tabs.length > 0) {
            browser.tabs.sendMessage(tabs[0].id, {name: 'checkMagnets'})
                .then(function(response) {
                    setIcon(response.hasMagnets);
                });
        }
      }, function (error) {
          log(['tab connection error', error], 'error');
      });
});

/**
 * Set the extension icon
 * @param {bool} hasMagnets 
 */
 async function setIcon(hasMagnets) {
    log([`[eventPage.js] setIcon`, `hasMagnets: ${hasMagnets}`]);

    let i = ''; // enabled no magnets

    const settings = await getSettings();

    if (!settings.enabled) {
        i = '-faded'; // not enabled
    } else if (hasMagnets) {
        i = '-magnets'; // enabled with magnets
    }

    let img = `content/assets/images/Transmission${i}16.png`;

    await browser.browserAction.setIcon({ path: img });
};

/**
 * Add a torrent to transmission
 * @param {string} magnet - magnet link to add
 * @param {function} callback - callback function
 */
function addTorrent(magnet, callback) {
    log('[core.js] addTorrent');

    callApi(JSON.stringify({
        arguments: { filename: magnet },
        method: "torrent-add",
        tag: 8
    }), function(response) {
        if (response.success) {
            /* jshint ignore:start */
            response.message = `Success! Added Torrent: "${response.jsonResponse['arguments']['torrent-added']['name']}"`;
            /* jshint ignore:end */
        }

        callback(response);
    });
};

/**
 * Gets all torrents from transmission
 * @param {function} callback - callback function
 */
 function getTorrents(callback) {
    log('[core.js] getTorrents');

    callApi(JSON.stringify({
        arguments: { fields: 'id,name' },
        method: "torrent-get",
        tag: 8
    }), function(response) {
        callback(response);
    });
}

/**
 * Call transmission API
 * This MUST be called from the event page to obviate any issues arising from mixed http/https protocols
 * @param {ApiRequest} request
 * @param {function} callback - callback function
 */
function callApi(data, callback) {
    log(['[core.js] callApi', data]);

    getSettings()
        .then(async function(settings) {
            let uri = buildApiUrl(settings.api),
                xHttp = new XMLHttpRequest(),
                httpResponse;

            xHttp.open("POST", uri, true);

            if (sessionId) {
                xHttp.setRequestHeader("X-Transmission-Session-Id", sessionId);
            }

            try {
                xHttp.onreadystatechange = function() {
                    if (xHttp.readyState == 4) {
                        httpResponse = xHttp.responseText;

                        try {
                            if (httpResponse.length > 0) {
                                switch (xHttp.status) {
                                    case 200: // status OK
                                        httpResponse = xHttp.responseText;
                                        let jsonResponse = JSON.parse(httpResponse);

                                        // json key containing dash-hyphen '-' is an invalid javascript identifier, so we need to use array [' '] syntax instead
                                        if (jsonResponse.result.toLowerCase() == "success") {
                                            callback({ 
                                                success: true, 
                                                jsonResponse: jsonResponse, 
                                                uri: uri 
                                            });
                                        }

                                        callback({ 
                                            success: false, 
                                            jsonResponse: jsonResponse, 
                                            uri: uri 
                                        });

                                    case 409: // need new session-id
                                        sessionId = xHttp.getResponseHeader("X-Transmission-Session-Id");

                                        callApi(data, function(response) {
                                            callback(response);
                                        });;

                                    case 401:
                                        callback({ 
                                            success: false, 
                                            message: 'unauthorised user (401)', 
                                            uri: uri 
                                        });
                                        
                                    default:
                                        callback({ 
                                            success: false, 
                                            message: `unknown http.status: ${xHttp.status}`, 
                                            uri: uri 
                                        });
                                }
                            }

                            callback({ 
                                success: false, 
                                message: 'error: empty response', 
                                uri: uri 
                            });
                        } catch (e) {
                            callback({ 
                                success: false, 
                                message: `unknown error: ${e.message}`, 
                                uri: uri 
                            });
                        }
                    }
                };
            } catch (e) {
                callback({ 
                    success: false, 
                    message: `unknown error: ${e.message}`, 
                    uri: uri 
                });
            }

            try {
                xHttp.send(data);
            } catch (e) {
                callback({ 
                    success: false, 
                    message: `unknown error: ${e.message}`, 
                    uri: uri 
                });
            }
        });
}