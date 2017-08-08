var port = chrome.runtime.connect({name: 'trpc'}),
    defaultSettings = {
        api: {
            port: '49091',
            host: '192.168.1.20',
            username: 'qnap',
            password: 'qnap'
        },
        magnets: []
    };

port.onMessage.addListener(function(response) {
    console.log(response);

    if (response.buttonId && response.success) {
        $('#' + response.buttonId)
            .text('Sent successfully. Disabling link.')
            .removeClass('btn-info')
            .addClass('btn-success')
            .prop('disabled', true);

        $('[ml-id="' + response.buttonId + '"]')
            .prop('disabled', true)
            .css('text-decoration', 'line-through');

        getSettings(function(settings) {
            settings.magnets.push(response.magnet);

            setSettings(settings);
        });
    }
});

var sendToTransmission = function(magnet, buttonId) {
    port.postMessage({method: 'add', magnet: magnet, buttonId: buttonId});
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

var init = function(settings) {
    // find all magnet links and apply popovers
    $("a[href^='magnet:']").each(function(i) {
        var link = $(this),
            id = 'pop' + i;

        var btnHtml = '<button id="'+id+'" type="button" class="btn btn-info">Send to Transmission</button>',
            btnHtmlDone = '<button id="'+id+'" type="button" class="btn btn-success" disabled="true">Sent successfully.</button>',
            matchFound = false;

        $.each(settings.magnets, function(i, m) {
            if (link.attr('href') == m)
                matchFound = true;
        });

        var html = matchFound ? btnHtmlDone : btnHtml;

        link.attr({
                'data-toggle': 'popover',
                'data-content': html,
                'data-original-title': '',
                'title': '',
                'ml-id': id
            }).addClass('pop');

        link.popover({placement: 'auto', trigger: 'manual', html: true})
            .on('mouseenter', function () {
                var _this = this;
                $(this).popover("show");
                $(".popover").on("mouseleave", function () {
                    $(_this).popover('hide');
                });
            })
            .on("mouseleave", function () {
                var _this = this;
                setTimeout(function () {
                    if (!$(".popover:hover").length) {
                        $(_this).popover("hide");
                    }
                }, 300);
            }).parent().delegate('button#' + id, 'click', function() {
                sendToTransmission(link.attr('href'), id);
            });
    });
};

getSettings(function(settings) {
    init(settings);
});