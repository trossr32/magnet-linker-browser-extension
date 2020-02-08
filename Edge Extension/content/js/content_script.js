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
    var hasMagnets = 
        $("*").map(function () {
            if (/magnet:\?xt=urn:btih:[a-zA-Z0-9]*/g.test($(this).text())) {
                return this;
            }
        }).get().length > 0;

    callback({magnets: hasMagnets});
});

var sendToTransmission = function(magnet, buttonId) {
    torrentPort.postMessage({ method: 'add', magnet: magnet, buttonId: buttonId });
};

var init = function(settings) {
    var site = {
        name: '',
        search: '',
        insertBefore: '',
        insertAfter: '',
        float: 'left'
    };

    // Check if this website matches our list of stored sites, and override the site object if found.
    $.each(settings.sites, function (i, s) {
        if (window.location.hostname.toLowerCase().includes(s.search)) {
            site = s;
        }
    });

    // find all elements where the text contains a magnet link
    var textElements = $("*").map(function () {
        if (/magnet:\?xt=urn:btih:[a-zA-Z0-9]*/g.test($(this).text())) {
            return this;
        }
    }).get();

    console.log('textElements', textElements);

    $.each(textElements, function(i, v) {
        var el = $(this),
            elementTypes = settings.search.elementTypes.split(','),
            elementTypeIsSearchable = false;

        $.each(elementTypes, function(i, v) {
            if ($(el).is(v.trim())) {
                elementTypeIsSearchable = true;
            }
        });

        if (!elementTypeIsSearchable)
            return;

        var id = 'stt_btn' + i,
            matchFound = false,
            magnet = el.text().match(/magnet:\?xt=urn:btih:[a-zA-Z0-9]*/);


            console.log('magnet', magnet);
            console.log('magnet[0]', magnet[0]);

        $.each(settings.magnets, function (i, m) {
            if (magnet == m) {
                matchFound = true;
            }
        });

        var startHtml = site.insertBefore + '<div class="tw-bs" style="float:' + site.float + ';">',
            endHtml = '</div>' + site.insertAfter,
            button = matchFound
                ? '<button id="' + id + '" type="button" class="btn btn-danger btn-mini" data-magnet="' + magnet + '" disabled>Already sent</button>'
                : '<button id="' + id + '" type="button" class="btn btn-info btn-mini" data-magnet="' + magnet + '">Send to Transmission</button>';

        var html = startHtml + button + endHtml;

        if (!settings.enabled) {
            html = '<div class="magnetLinkerHider">' + html + '</div>';
        }

        $(html).insertAfter(el);
    });

    // find all elements where an attribute contains a magnet link
    $.each(settings.search.attributes.split(','), function(ia, attr) {
        var attrElements = $("*").map(function () {
            if (/magnet:\?xt=urn:btih:[a-zA-Z0-9]*/g.test($(this).attr(attr.trim()))) {
                return this;
            }
        }).get();
        
        console.log('attrElements', attrElements);
    
        $.each(attrElements, function(ie, v) {
            var link = $(this),
                id = 'stt_btn' + ia + ie,
                matchFound = false;
    
            $.each(settings.magnets, function (i, m) {
                if (link.attr(attr.trim()) == m) {
                    matchFound = true;
                }
            });
    
            var startHtml = site.insertBefore + '<div class="tw-bs" style="float:' + site.float + ';">',
                endHtml = '</div>' + site.insertAfter,
                button = matchFound
                    ? '<button id="' + id + '" type="button" class="btn btn-danger btn-mini" data-magnet="' + link.attr(attr.trim()) + '" disabled>Already sent</button>'
                    : '<button id="' + id + '" type="button" class="btn btn-info btn-mini" data-magnet="' + link.attr(attr.trim()) + '">Send to Transmission</button>';
    
            var html = startHtml + button + endHtml;
    
            if (!settings.enabled) {
                html = '<div class="magnetLinkerHider">' + html + '</div>';
            }
    
            $(html).insertAfter(link);
        });
    
        $('[id^="stt_btn"]').click(function () {
            sendToTransmission($(this).attr('data-magnet'), $(this).attr('id'));        
        });

    });
};

settingsPort.postMessage({ method: 'get' });