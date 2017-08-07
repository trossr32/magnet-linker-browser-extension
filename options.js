var defaultSettings = {
    api: {
        port: '49091',
        host: '192.168.1.20',
        username: 'qnap',
        password: 'qnap'
    },
    magnets: []
};

var getSettings = function(callback) {
    chrome.storage.sync.get({'magnetLinkerSettings' : defaultSettings}, function(data) {
        if (typeof callback === "function") {
            callback(data.magnetLinkerSettings);
        }
    });
};

var setSettings = function(data, callback) {
    var obj= {};
    obj['magnetLinkerSettings'] = data;

    chrome.storage.sync.set(obj, function() {
        if (typeof callback === "function") {
            callback();
        }
    });
};

$(function() {
    getSettings(function(settings) {
        $('#apiPort').val(settings.api.port);
        $('#apiHost').val(settings.api.host);
        $('#apiUsername').val(settings.api.username);
        $('#apiPassword').val(settings.api.password);
    });

    $('#saveOptions').click(function(e) {
        getSettings(function(settings) {
            settings.api.port = $('#apiPort').val();
            settings.api.host = $('#apiHost').val();
            settings.api.username = $('#apiUsername').val();
            settings.api.password = $('#apiPassword').val();

            console.log(settings);

            setSettings(settings);
        });
    });
});