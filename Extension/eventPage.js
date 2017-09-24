chrome.runtime.onConnect.addListener(function(port) {
    switch (port.name) {
        case 'magnetCheck':
            port.onMessage.addListener(function(request) {
                chrome.tabs.getCurrent(function (tab){
                    var img = 'content/assets/images/Transmission' + (request.magnets ? '' : '-faded') + '16.png';
                    
                    chrome.browserAction.setIcon({path: img});
                });

                if (request.magnets) {
                    chrome.tabs.insertCSS(null, { file: 'content/css/bootstrap.tw.min.css' }, function() {
                        //chrome.tabs.insertCSS(null, { file: 'content/css/popover.min.css' }, function() {
                            chrome.tabs.executeScript(null, { file: 'content/js/bootstrap.micro.min.js' }, function() {
                                chrome.tabs.executeScript(null, { file: 'content/js/content_script.js' }, function() {
                                    chrome.browserAction.setIcon({path: 'content/assets/images/transmission.png'});
                                    port.postMessage('loaded new content-script');
                                });
                            });
                        //});
                    });
                }
            });
            break;

        case 'torrent':
            port.onMessage.addListener(function(request) {
                try {
                    switch (request.method) {
                        case 'add':
                            if (request.magnet) {
                                addTorrent(request.magnet, function(response) {
                                    response.buttonId = request.buttonId;
                                    response.magnet = request.magnet;

                                    getSettings(function(settings) {
                                        settings.magnets.push(response.magnet);

                                        setSettings(settings);

                                        response.settings = settings;

                                        port.postMessage(response);
                                    });
                                });
                            } else {
                                port.postMessage({ success: false, message: 'no magnet link supplied!' });
                            }
                            break;
                        case 'getAll':
                            getTorrents(function(response) {
                                port.postMessage(response);
                            });
                            break;
                        default:
                            port.postMessage({ success: false, message: 'unknown method : ' + request.method });
                            break;
                    }
                } catch (e) {
                    port.postMessage({ success: false, magnet: request.magnet, exception: e });
                }
            });
            break;

        case 'settings':
            port.onMessage.addListener(function(request) {
                switch (request.method) {
                    case 'get':
                        getSettings(function(settings) { 
                            port.postMessage({ request: request, settings: settings }); 
                        });
                        break;
                    case 'set':
                        setSettings(request.settings, function(settings) {
                            port.postMessage({ request: request, success: true });
                        });
                        break;
                }
            });
            break;

        case 'api':
            port.onMessage.addListener(function(request) {
                switch (request.method) {
                    case 'buildUri':
                        buildApiUrl(request.api, function(uri) { 
                            port.postMessage({ request: request, uri: uri }); 
                        });
                        break;
                }
            });
            break;

        case 'icon':
            port.onMessage.addListener(function(request) {
                chrome.tabs.getCurrent(function (tab){
                    var img = 'content/assets/images/Transmission' + (request.magnets ? '' : '-faded') + '16.png';
                    
                    chrome.browserAction.setIcon({path: img});
                });
            });
            break;
    }
});

// listen for tab selection so we can check whether the icon should be faded or not
// chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
//     chrome.tabs.sendMessage(tabId, { name: 'icon' }, {}, function (response) {
//         chrome.browserAction.setIcon({path: 'content/assets/images/Transmission' + (response.magnets ? '' : '-faded') + '16.png'});
//     });
// });

var sessionId,
    defaultSettings = {
        api: {
            port: '',
            host: '',
            username: '',
            password: '',
            uriFormat: 'http://[username]:[password]@[host]:[port]/transmission/rpc'
        },
        magnets: [],
        sites: []
    };

var buildApiUrl = function(request, callback) {
    var uri = '';

    if (request.wrapFields) {
        uri = request.uriFormat
            .replace('[username]', request.wrapFields.start + request.username + request.wrapFields.end)
            .replace('[password]', request.wrapFields.start + request.password + request.wrapFields.end)
            .replace('[host]', request.wrapFields.start + request.host + request.wrapFields.end)
            .replace('[port]', request.wrapFields.start + request.port + request.wrapFields.end);

        
    } else {
        uri = request.uriFormat
            .replace('[username]', request.username)
            .replace('[password]', request.password)
            .replace('[host]', request.host)
            .replace('[port]', request.port);
    }

    if (typeof callback === "function") {
        callback(uri);
    }
}

var getSettings = function(callback) {
    chrome.storage.sync.get({ 'magnetLinkerSettings': defaultSettings }, function(data) {
        if (typeof callback === "function") {
            if (!data.magnetLinkerSettings.hasOwnProperty('sites')) {
                data.magnetLinkerSettings.sites = [];
            }

            callback(data.magnetLinkerSettings);
        }
    });
};

var setSettings = function (data, callback) {
    if (!data.hasOwnProperty('sites')) {
        data.sites = [];
    }

    var obj = {};
    obj['magnetLinkerSettings'] = data;

    chrome.storage.sync.set(obj, function() {
        if (typeof callback === "function") {
            callback();
        }
    });
};

var addTorrent = function(magnet, callback) {
    callApi(JSON.stringify({
        arguments: { filename: magnet },
        method: "torrent-add",
        tag: 8
    }), function(response) {
        if (response.success) {
            response.message = 'Success! Added Torrent: "' + response.jsonResponse['arguments']['torrent-added']['name'] + '"';
        }

        callback(response);
    });
};

var getTorrents = function(callback) {
    callApi(JSON.stringify({
        arguments: { fields: 'id,name' },
        method: "torrent-get",
        tag: 8
    }), function(response) {
        callback(response);
    });
};

var callApi = function(data, callback) {
    getSettings(function(settings) {
        var xHttp = new XMLHttpRequest(),
            httpResponse,
            uri;

        buildApiUrl(settings.api, function(response) {
            uri = response;
            xHttp.open("POST", uri, true);
        });

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
                                    var jsonResponse = JSON.parse(httpResponse);

                                    // json key containing dash-hyphen '-' is an invalid javascript identifier, so we need to use array [' '] syntax instead
                                    if (jsonResponse.result.toLowerCase() == "success") {
                                        callback({ success: true, jsonResponse: jsonResponse, uri: uri });
                                    } else {
                                        callback({ success: false, jsonResponse: jsonResponse, uri: uri });
                                    }
                                    break;
                                case 409: // need new session-id
                                    sessionId = xHttp.getResponseHeader("X-Transmission-Session-Id");

                                    callApi(data, function(response) {
                                        callback(response);
                                    });
                                    break;
                                case 401:
                                    callback({ success: false, message: 'unauthorised user (401)', uri: uri });
                                    break;
                                default:
                                    callback({ success: false, message: 'unknown http.status: ' + xHttp.status, uri: uri });
                                    break;
                            }
                        } else {
                            callback({ success: false, message: 'error: empty response', uri: uri });
                        }
                    } catch (e) {
                        callback({ success: false, message: 'unknown error: ' + e.message, uri: uri });
                    }
                }
            }
        } catch (e) {
            callback({ success: false, message: 'unknown error: ' + e.message, uri: uri });
        }

        try {
            xHttp.send(data);
        } catch (e) {
            callback({ success: false, message: 'unknown error: ' + e.message, uri: uri });
        }
    });
};