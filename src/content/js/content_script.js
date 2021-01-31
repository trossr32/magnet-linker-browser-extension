/* jshint esversion: 8 */

// var iconPort = browser.runtime.connect({ name: 'icon' });

// iconPort.onMessage.addListener(function(message, sender, callback) {
//     var hasMagnets = 
//         $("*").map(function () {
//             if (/magnet:\?xt=urn:btih:[a-zA-Z0-9]*/g.test($(this).text())) {
//                 return this;
//             }
//         }).get().length > 0;

//     callback({magnets: hasMagnets});
// });

var init = async () => {
    console.log('at init in content script');

    let site = {
        name: '',
        search: '',
        insertBefore: '',
        insertAfter: '',
        float: 'left'
    };

    let settings = await getSettings();

    // Check if this website matches our list of stored sites, and override the site object if found.
    $.each(settings.sites, function (i, s) {
        if (window.location.hostname.toLowerCase().includes(s.search)) {
            site = s;
        }
    });

    // find all elements where the text contains a magnet link
    let textElements = $("*").map(function () {
        if (/magnet:\?xt=urn:btih:[a-zA-Z0-9]*/g.test($(this).text())) {
            return this;
        }
    }).get();

    $.each(textElements, (i, v) => {
        let el = $(this),
            elementTypes = settings.search.elementTypes.split(','),
            elementTypeIsSearchable = false;

        $.each(elementTypes, (i, v) => {
            if ($(el).is(v.trim())) {
                elementTypeIsSearchable = true;
            }
        });

        if (!elementTypeIsSearchable)
            return;

        let id = `stt_btn${i}`,
            matchFound = false,
            magnet = el.text().match(/magnet:\?xt=urn:btih:[a-zA-Z0-9]*/);

        $.each(settings.magnets, function (i, m) {
            if (magnet == m) {
                matchFound = true;
            }
        });

        let startHtml = `${site.insertBefore}<div class="bootstrap-iso" style="float: ${site.float};">`, 
            endHtml = `</div>${site.insertAfter}`,
            button = `<button id="${id}" type="button" class="btn btn-${(matchFound ? 'danger' : 'info')} btn-mini" data-magnet="${link.attr(attr.trim())}"${(matchFound ? ' disabled' : '')}>${(matchFound ? 'Already sent' : 'Send to Transmission')}</button>`;

        let html = `${startHtml}${button}${endHtml}`;

        if (!settings.enabled) {
            html = `<div class="magnetLinkerHider">${html}</div>`; 
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
        
        $.each(attrElements, function(ie, v) {
            var link = $(this),
                id = `stt_btn${ia}${ie}`,
                matchFound = false;
    
            $.each(settings.magnets, function (i, m) {
                if (link.attr(attr.trim()) == m) {
                    matchFound = true;
                }
            });
    
            let startHtml = `${site.insertBefore}<div class="bootstrap-iso" style="float: ${site.float};">`,
                endHtml = `</div>${site.insertAfter}`,
                button = `<button id="${id}" type="button" class="btn btn-${(matchFound ? 'danger' : 'info')} btn-mini" data-magnet="${link.attr(attr.trim())}"${(matchFound ? ' disabled' : '')}>${(matchFound ? 'Already sent' : 'Send to Transmission')}</button>`;
    
            let html = `${startHtml}${button}${endHtml}`;
    
            if (!settings.enabled) {
                html = `<div class="magnetLinkerHider">${html}</div>`;
            }
    
            $(html).insertAfter(link);
        });
    
        $('[id^="stt_btn"]').on('click', async (e) => {
            let el = $(e.target);

            let response = await addTorrent(el.attr('data-magnet'));

            if (response.success) {
                $(`#${el.attr('id')}`)
                    .text('Sent successfully')
                    .removeClass('btn-info')
                    .addClass('btn-success')
                    .prop('disabled', true);
            }     
        });
    });
};

init();

// $(async () => {
//     await init();
// });