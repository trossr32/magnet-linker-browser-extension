var torrentPort = chrome.runtime.connect({ name: 'torrent' }),
    settingsPort = chrome.runtime.connect({ name: 'settings' }),
    iconPort = chrome.runtime.connect({ name: 'icon' });

torrentPort.onMessage.addListener(function(response) {
    //console.log(response);

    if (response.buttonId && response.success) {
        $('#' + response.buttonId)
            .text('Sent successfully')
            .removeClass('btn-info')
            .addClass('btn-success')
            .prop('disabled', true);
    }
});

settingsPort.onMessage.addListener(function(response) {
    //console.log(response);

    init(response.settings);
});

iconPort.onMessage.addListener(function(message, sender, callback) {
    //console.log(message);

    var hasMagnets = $("a[href^='magnet:']").length > 0;
    
    // iconPort.postMessage({magnets: hasMagnets});

    callback({magnets: hasMagnets});
});

var sendToTransmission = function(magnet, buttonId) {
    torrentPort.postMessage({ method: 'add', magnet: magnet, buttonId: buttonId });
};

var init = function(settings) {
    console.log('entered init');

    // find all magnet links and apply popovers
    $("a[href^='magnet:']").each(function(i) {
        var link = $(this),
            id = 'stt_btn' + i;

        var btnHtml = '<div class="tw-bs" style="float:left;"><button id="' + id + '" type="button" class="btn btn-info btn-mini" data-magnet="' + link.attr('href') + '">Send to Transmission</button></div>',
            btnHtmlDone = '<div class="tw-bs" style="float:left;"><button id="' + id + '" type="button" class="btn btn-danger btn-mini" data-magnet="' + link.attr('href') + '" disabled>Already sent</button></div>',
            matchFound = false;

        console.log('looping settings.magnets to find matches');
        
        $.each(settings.magnets, function(i, m) {
            console.log('inside loop');
            
            if (link.attr('href') == m) {
                matchFound = true;
            }
        });

        var html = matchFound ? btnHtmlDone : btnHtml;

        console.log('about to insert button');

        $(html).insertAfter(link);

        console.log('button inserted');

        // link.attr({
        //     'data-toggle': 'popover',
        //     'data-content': html,
        //     'data-original-title': '',
        //     'title': '',
        //     'ml-id': id
        // }).addClass('pop');

        // link.popover({ placement: 'auto', trigger: 'manual', html: true })
        //     .on('mouseenter', function() {
        //         var _this = this;
        //         $(this).popover("show");
        //         $(".popover").on("mouseleave", function() {
        //             $(_this).popover('hide');
        //         });
        //     })
        //     .on("mouseleave", function() {
        //         var _this = this;
        //         setTimeout(function() {
        //             if (!$(".popover:hover").length) {
        //                 $(_this).popover("hide");
        //             }
        //         }, 300);
        //     }).parent().delegate('button#' + id, 'click', function() {
        //         if (!matchFound) {
        //             sendToTransmission(link.attr('href'), id);
        //         }
        //     });
    });

    console.log('adding click events');

    $('[id^="stt_btn"]').click(function () {
        sendToTransmission($(this).attr('data-magnet'), $(this).attr('id'));        
    });
};

settingsPort.postMessage({ method: 'get' });