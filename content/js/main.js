define([
        //Script Dependencies
        "jquery",
        "bootstrap",

        //Services
        "../services/messenger",
        "../services/settings"
    ],
    function(
        //Script Dependencies
        $,
        bootstrap,

        //Services
        messenger,
        settings
    ){
        $("a[href^='magnet:']").each(function(i) {
            var link = $(this),
                id = 'pop' + i;

            var btnHtml = '<button id="'+id+'" type="button" class="btn btn-info">Send to Transmission</button>',
                btnHtmlDone = '<button id="'+id+'" type="button" class="btn btn-success" disabled="true">Sent successfully. Disabling link.</button>';

            link.attr({
                'data-toggle': 'popover',
                'data-content': btnHtml,
                'data-original-title': '',
                'title': '',
                'ml-id': id
            })
                .addClass('pop');

            if (link.css('text-decoration') != 'line-through') {
                link.attr({'data-content': btnHtml})
            } else {
                link.attr({'data-content': btnHtmlDone})
            }

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
    });