var torrentPort = browser.runtime.connect({ name: 'torrent' }),
    iconPort = browser.runtime.connect({name: 'icon'}),
    initPort = browser.runtime.connect({name: 'init'});

initPort.onMessage.addListener(function() {
    init();
});

torrentPort.onMessage.addListener(function(/** @type {ApiResponse} */response) {
    if (response.buttonId && response.success) {
        $(`#${response.buttonId}`)
            .text('Sent successfully')
            .removeClass('btn-info')
            .addClass('btn-success');

        getSettings().then(function(settings) {
            if (!settings.storageButtonsEnabled) {
                $(`#${response.buttonId}`).prop('disabled', true);
            }
        });
    }
});

/**
 * Generate a button for the magnet link.
 * @param {string} magnet - The magnet link.
 * @param {string} id - The id of the button.
 * @param {SiteSetting} site - The site setting.
 * @param {bool} matchFound - Whether or not the magnet link was found in the page.
 * @returns 
 */
function getHtml(magnet, id, site, matchFound, settings) {
    log('[content_script.js] getHtml');

    let startHtml = `${site.insertBefore}<div class="tw-bs" style="float:${site.float};">`,
            endHtml = `</div>${site.insertAfter}`,
            disabled = settings.storageButtonsEnabled ? '' : 'disabled',
            buttonsEnabledClass = settings.storageButtonsEnabled ? 'success' : 'danger';
    
    /* jshint ignore:start */
    let button = matchFound
        ? `<button id="${id}" type="button" class="btn btn-${buttonsEnabledClass} btn-mini" data-magnet="${magnet}" ${disabled}>Already sent</button>`
        : `<button id="${id}" type="button" class="btn btn-info btn-mini" data-magnet="${magnet}">Send to Transmission</button>`;
    /* jshint ignore:end */

    return `${startHtml}${button}${endHtml}`;
}

/**
 * Checks if there are any magnet links on the page
 * @returns {bool} - true if the current page has magnet links
 */
 async function hasMagnets() {
    log('[core.js] hasMagnets');

    return (
        $("*")
            .map(function () {
                if (magnetLinkPattern.test($(this).text())) {
                    return this;
                }
            })
            .get()
            .length > 0) || 
        // check if any elements have a magnet link the their href attribute
        ($("*")
            .map(function () {
                if (magnetLinkPattern.test($(this).attr('href'))) {
                    return this;
                }
            })
            .get()
            .length > 0);
}

async function init() {
    log('[content_script.js] init');

    let magnets = await hasMagnets();

    // call the event page to update the icon
    iconPort.postMessage({ magnets: magnets });

    if (!magnets) {
        return;
    }

    const settings = await getSettings();

    if (!settings.enabled) {
        return;
    }
    
    let site = {
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
    let textElements = $("*").map(function () {
        if (magnetLinkPattern.test($(this).text())) {
            return this;
        }
    }).get();

    $.each(textElements, function(i, v) {
        let el = $(this),
            elementTypes = settings.search.elementTypes.split(','),
            elementTypeIsSearchable = false;

        $.each(elementTypes, function(i, v) {
            if ($(el).is(v.trim())) {
                elementTypeIsSearchable = true;
            }
        });

        if (!elementTypeIsSearchable)
            return;

        let id = `stt_btn${i}`,
            matchFound = false,
            magnet = el.text().match(/magnet:\?xt=urn:btih:[a-zA-Z0-9]*/);

        if ($(`#stt_btn${i}`).length) {
            return;
        }

        $.each(settings.magnets, function (i, m) {
            if (magnet == m) {
                matchFound = true;
            }
        });

        $(getHtml(magnet, id, site, matchFound, settings)).insertAfter(el);
    });

    // find all elements where an attribute contains a magnet link
    $.each(settings.search.attributes.split(','), function(ia, attr) {
        let attrElements = $("*").map(function () {
            if (magnetLinkPattern.test($(this).attr(attr.trim()))) {
                return this;
            }
        }).get();
        
        $.each(attrElements, function(ie, v) {
            let link = $(this),
                id = `stt_btn${ia}${ie}`,
                matchFound = false;

            if ($(`#stt_btn${ia}${ie}`).length) {
                return;
            }
    
            $.each(settings.magnets, function (i, m) {
                if (link.attr(attr.trim()) == m) {
                    matchFound = true;
                }
            });

            let magnet = link.attr(attr.trim());
    
            $(getHtml(magnet, id, site, matchFound, settings)).insertAfter(link);
        });
    });
    
    $('[id^="stt_btn"]').on('click', async function () {
        /** @type {TorrentRequest} */
        let request = { 
            method: 'add', 
            magnet: $(this).attr('data-magnet'), 
            buttonId: $(this).attr('id') 
        };

        torrentPort.postMessage(request);
    });
}

init();