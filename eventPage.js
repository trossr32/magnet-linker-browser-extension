chrome.windows.getCurrent(
    function (currentWindow) {
        chrome.tabs.query({active: true, windowId: currentWindow.id},
            function(activeTabs) {
                chrome.tabs.executeScript(activeTabs[0].id, {file: 'content/content_script.js', allFrames: true});
            });
    });

chrome.runtime.onConnect.addListener(function(port) {
    //if (port.name == "trpc") {
        port.onMessage.addListener(function (request) {
            try {
                switch(request.method) {
                    case 'add':
                        if (request.magnet) {
                            addTorrent(request.magnet, function (response) {
                                response.buttonId = request.buttonId;

                                port.postMessage(response);
                            });
                        } else {
                            port.postMessage({success: false, message: 'no magnet link supplied!'});
                        }
                        break;
                    case 'getAll':
                        getTorrents(function(response) {
                            port.postMessage(response);
                        });
                        break;
                    default:
                        port.postMessage({success:false, message: 'unknown method : ' + request.method});
                        break;
                }
            }
            catch (e) {
                port.postMessage({success:false, magnet:request.magnet, exception:e});
            }
        });
    //}
});

var sessionId;

var addTorrent = function(magnet, callback) {
    callApi(JSON.stringify({
        arguments: {filename:magnet},
        method:"torrent-add",
        tag:8
    }), function(response) {
        if (response.success) {
            response.message = 'Success! Added Torrent: "' + response.jsonResponse['arguments']['torrent-added']['name'] +'"';
        }

        callback(response);
    });
};

var getTorrents = function(callback) {
    callApi(JSON.stringify({
        arguments: {fields:'id,name'},
        method:"torrent-get",
        tag:8
    }), function(response) {
        callback(response);
    });
};

var callApi = function(data, callback) {
    var xHttp = new XMLHttpRequest(),
        httpResponse;

    xHttp.open("POST", "http://qnap:qnap@192.168.1.20:49091/transmission/rpc", true);

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
                                    callback({success:true, jsonResponse:jsonResponse});
                                } else {
                                    callback({success:false, jsonResponse:jsonResponse});
                                }
                                break;
                            case 409: // need new session-id
                                sessionId = xHttp.getResponseHeader("X-Transmission-Session-Id");

                                callApi(data, function(response) {
                                    callback(response);
                                });
                                break;
                            case 401:
                                callback({success:false, message:'unauthorised user (401)'});
                                break;
                            default:
                                callback({success:false, message:'unknown http.status: ' + xHttp.status});
                                break;
                        }
                    }
                    else {
                        callback({success:false, message:'error: empty response'});
                    }
                }
                catch (e) {
                    callback({success:false, message:'unknown error: ' + e.message});
                }
            }
        }
    }
    catch (e) {
        callback({success:false, message:'unknown error: ' + e.message});
    }

    try {
        xHttp.send(data);
    }
    catch (e) {
        callback({success:false, message:'unknown error: ' + e.message});
    }
};