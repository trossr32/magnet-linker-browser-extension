var settingsPort = chrome.runtime.connect({ name: 'settings' }),
    iconPort = chrome.runtime.connect({ name: 'icon' });

var getCurrentCustomiser = function (settings) {
    var site = null;

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        $.each(settings.sites, function (i, s) {
            if (s.search != '' && tabs[0].url.toLowerCase().includes(s.search.toLowerCase())) {
                site = s;
            }
        });

        $('#currentCustomiser').html(site == null ? 'No customiser in use' : 'Using <b>' + site.name + '</b> customiser');
    });

    return site;
}

var setEnabledDisabledButtonState = function(settings) {
    if (settings.enabled) {
        $('#toggleActive').removeClass('btn-success btn-danger').addClass('btn-danger');
        $('#toggleActive').html('<span class="glyphicon glyphicon-off"></span> Disable');
    } else {
        $('#toggleActive').removeClass('btn-success btn-danger').addClass('btn-success');
        $('#toggleActive').html('<span class="glyphicon glyphicon-off"></span> Enable');
    }
}

settingsPort.onMessage.addListener(function (response) {
    var settings = response.settings;

    switch (response.request.caller) {
        case 'initPopup':
            var site = getCurrentCustomiser(settings);

            //$('#magnetCount').html(settings.magnets.length);

            setEnabledDisabledButtonState(settings);
            break;
        case 'enableDisable':
            settings.enabled = !settings.enabled;

            settingsPort.postMessage({ method: 'set', caller: 'setFields', settings: settings });

            setEnabledDisabledButtonState(settings);

            iconPort.postMessage({ x: "y" });

            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                chrome.tabs.update(tabs[0].id, { url: tabs[0].url });
            });
            break;
    }
});

$(function () {
    // initialise page on load
    settingsPort.postMessage({ method: 'get', caller: 'initPopup' });
    
    $('#toggleActive').click(function(e) {
        settingsPort.postMessage({ method: 'get', caller: 'enableDisable' });
    });

    $('#btnSettings').click(function() {
        chrome.runtime.openOptionsPage(); // add open flag in settings?
    });
});