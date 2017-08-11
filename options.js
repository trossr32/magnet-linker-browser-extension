var settingsPort = chrome.runtime.connect({ name: 'settings' }),
    apiPort = chrome.runtime.connect({ name: 'api' });

settingsPort.onMessage.addListener(function(response) {
    if (response.request.method === 'get') {
        var settings = response.settings,
            api = response.settings.api;

        switch (response.request.caller) {
            case 'setFields':
                $('#apiPort').val(settings.api.port);
                $('#apiHost').val(settings.api.host);
                $('#apiUsername').val(settings.api.username);
                $('#apiPassword').val(settings.api.password);
                $('#apiUriFormat').val(settings.api.uriFormat);

                api.wrapFields = {}
                api.wrapFields.start = '<span style="color:orange;">';
                api.wrapFields.end = '</span>';

                apiPort.postMessage({ method: 'buildUri', api: api });
                break;
            case 'getFields':
                settings.api.port = $('#apiPort').val();
                settings.api.host = $('#apiHost').val();
                settings.api.username = $('#apiUsername').val();
                settings.api.password = $('#apiPassword').val();
                settings.api.uriFormat = $('#apiUriFormat').val();

                settingsPort.postMessage({ method: 'set', caller: 'setFields', settings: settings });
                break;
            case 'refreshUri':
                api.port = $('#apiPort').val();
                api.host = $('#apiHost').val();
                api.username = $('#apiUsername').val();
                api.password = $('#apiPassword').val();
                api.uriFormat = $('#apiUriFormat').val();
                
                api.wrapFields = { start: '<span style="color:orange;">', end: '</span>'};

                apiPort.postMessage({ method: 'buildUri', api: api });
                break;
        }
    }
});

apiPort.onMessage.addListener(function(response) {
    $('#apiUriPreview').html(response.uri);
});

$(function() {
    settingsPort.postMessage({ method: 'get', caller: 'setFields' });

    $('#saveOptions').click(function(e) {
        settingsPort.postMessage({ method: 'get', caller: 'getFields' });
    });

    $( "#apiUriFormat" ).keyup(function() {
        settingsPort.postMessage({ method: 'get', caller: 'refreshUri' });
    });
});