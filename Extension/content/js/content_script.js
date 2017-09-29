var torrentPort = chrome.runtime.connect({ name: 'torrent' }),
    settingsPort = chrome.runtime.connect({ name: 'settings' }),
    iconPort = chrome.runtime.connect({ name: 'icon' });

torrentPort.onMessage.addListener(function(response) {
    if (response.buttonId && response.success) {
        $('#' + response.buttonId)
            .text('Sent successfully')
            .removeClass('btn-info')
            .addClass('btn-success')
            .prop('disabled', true);
    }
});

settingsPort.onMessage.addListener(function(response) {
    init(response.settings);
});

iconPort.onMessage.addListener(function(message, sender, callback) {
    var hasMagnets = $("a[href^='magnet:']").length > 0;

    callback({magnets: hasMagnets});
});

var sendToTransmission = function(magnet, buttonId) {
    torrentPort.postMessage({ method: 'add', magnet: magnet, buttonId: buttonId });
};

var init = function(settings) {
    // find all magnet links and apply popovers
    $("a[href^='magnet:']").each(function(i) {
        var link = $(this),
            id = 'stt_btn' + i,
            site = {
                name: '',
                search: '',
                insertBefore: '',
                insertAfter: '',
                float: 'left'
            },
            matchFound = false;

        $.each(settings.sites, function (i, s) {
            if (window.location.hostname.toLowerCase().includes(s.search)) {
                site = s;
            }
        });

        $.each(settings.magnets, function (i, m) {
            if (link.attr('href') == m) {
                matchFound = true;
            }
        });

        var startHtml = site.insertBefore + '<div class="tw-bs" style="float:' + site.float + ';">',
            endHtml = '</div>' + site.insertAfter,
            button = matchFound
                ? '<button id="' + id + '" type="button" class="btn btn-danger btn-mini" data-magnet="' + link.attr('href') + '" disabled>Already sent</button>'
                : '<button id="' + id + '" type="button" class="btn btn-info btn-mini" data-magnet="' + link.attr('href') + '">Send to Transmission</button>';

        var html = startHtml + button + endHtml;

        if (!settings.enabled) {
            html = '<div class="magnetLinkerHider">' + html + '</div>';
        }

        $(html).insertAfter(link);
    });

    $('[id^="stt_btn"]').click(function () {
        sendToTransmission($(this).attr('data-magnet'), $(this).attr('id'));        
    });
};

settingsPort.postMessage({ method: 'get' });