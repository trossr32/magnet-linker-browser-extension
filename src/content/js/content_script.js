/**
 * Content script: finds magnet links on the page and injects
 * "Send to Transmission" buttons next to them.
 *
 * Injection is idempotent: source elements are marked with
 * data-magnet-linker-completed and injected containers with
 * data-magnet-linker-container, so SPA re-runs never duplicate buttons.
 *
 * Requires jQuery, browser-polyfill and core.js (loaded first - declaratively on
 * Firefox, via scripting.registerContentScripts on Chromium).
 */

let magnetLinkerButtonCount = 0,
    magnetLinkerHasMagnets = false,
    magnetLinkerLastUrl = window.location.href;

/**
 * Answer the background's checkMagnets queries so the toolbar icon can reflect
 * whether this page has magnet links.
 */
browser.runtime.onMessage.addListener(function (message) {
    if (message && message.name === 'checkMagnets') {
        return Promise.resolve({ hasMagnets: magnetLinkerHasMagnets });
    }
});

/**
 * Show a toast notification, respecting the notification settings.
 * @param {Setting} settings
 * @param {string} message
 * @param {string} theme - 'error', 'success' or 'info'
 */
function toast(settings, message, theme = 'info') {
    if (!shouldShowToast(settings.notifications, theme)) {
        return;
    }

    let container = document.querySelector('.magnet-linker-toasts');

    if (!container) {
        container = document.createElement('div');
        container.className = 'magnet-linker-toasts';
        document.body.appendChild(container);
    }

    const el = document.createElement('div');
    el.className = `magnet-linker-toast magnet-linker-toast--${theme}`;
    el.setAttribute('role', 'status');
    el.textContent = message;

    const close = document.createElement('button');
    close.className = 'magnet-linker-toast-close';
    close.setAttribute('aria-label', 'Dismiss');
    close.textContent = '×';
    el.appendChild(close);

    const remove = () => {
        if (el.parentNode) {
            el.parentNode.removeChild(el);
        }
    };

    close.addEventListener('click', remove);
    setTimeout(remove, 5000);

    container.appendChild(el);
}

/**
 * Find magnet link candidates on the page.
 * - elements whose configured attribute contains a magnet URI
 * - elements of a configured type whose text contains a magnet URI
 * Elements already processed (data-magnet-linker-completed) are excluded.
 * @param {SearchSetting} search
 * @returns {{magnet: string, element: JQuery}[]}
 */
function findMagnetCandidates(search) {
    const candidates = [];
    const attributePattern = /^[a-zA-Z_][-a-zA-Z0-9_:.]*$/;

    String(search.attributes || '').split(',').forEach(function (attribute) {
        const attr = attribute.trim();

        if (!attr || !attributePattern.test(attr)) {
            return;
        }

        $(`[${attr}]`).each(function () {
            const $el = $(this);

            if ($el.attr('data-magnet-linker-completed') || $el.closest('[data-magnet-linker-container]').length) {
                return;
            }

            const magnets = extractMagnetUris($el.attr(attr));

            if (magnets.length > 0) {
                candidates.push({ magnet: magnets[0], element: $el });
            }
        });
    });

    String(search.elementTypes || '').split(',').forEach(function (elementType) {
        const type = elementType.trim();

        if (!type || !attributePattern.test(type)) {
            return;
        }

        $(type).each(function () {
            const $el = $(this);

            if ($el.attr('data-magnet-linker-completed') || $el.closest('[data-magnet-linker-container]').length) {
                return;
            }

            const magnets = extractMagnetUris($el.text());

            if (magnets.length > 0) {
                candidates.push({ magnet: magnets[0], element: $el });
            }
        });
    });

    return candidates;
}

/**
 * Generate the injected markup for a magnet link button.
 * @param {string} magnet - the magnet link
 * @param {string} id - the button element id
 * @param {SiteSetting} site - the site customisation in effect
 * @param {boolean} alreadySent - the magnet is in the sent-magnet history
 * @param {Setting} settings
 * @returns {string} HTML for the button and its customisation wrapper
 */
function getButtonHtml(magnet, id, site, alreadySent, settings) {
    const variant = alreadySent ? (settings.storage.buttonsEnabled ? 'success' : 'danger') : 'info',
        disabled = alreadySent && !settings.storage.buttonsEnabled ? 'disabled' : '',
        label = alreadySent ? 'Already sent' : 'Send to Transmission';

    return `${site.insertBefore}<span class="magnet-linker" style="float:${site.float};" data-magnet-linker-container="true">` +
        `<button id="${id}" type="button" class="magnet-linker-btn magnet-linker-btn--${variant}" data-magnet-linker-btn="true" data-magnet="${magnet}" ${disabled}>${label}</button>` +
        `</span>${site.insertAfter}`;
}

/**
 * Update a button's state from an ApiResponse and toast the outcome.
 * @param {ApiResponse} response
 * @param {Setting} settings
 */
function applySendResult(response, settings) {
    const $button = $(`#${response.buttonId}`);

    if (response.success) {
        $button
            .text('Sent successfully')
            .removeClass('magnet-linker-btn--info magnet-linker-btn--danger')
            .addClass('magnet-linker-btn--success');

        if (settings.storage.enabled && !settings.storage.buttonsEnabled) {
            $button.prop('disabled', true);
        }

        toast(settings, response.message || 'Torrent sent successfully', 'success');
    } else {
        $button
            .text('API call failed')
            .removeClass('magnet-linker-btn--info magnet-linker-btn--success')
            .addClass('magnet-linker-btn--danger');

        toast(settings, response.message || 'An unknown error occurred', 'error');

        log(['[content_script.js] send failed', response.message, response.exception], 'error');
    }
}

/**
 * Detect magnets, report icon state, and inject buttons. Safe to call
 * repeatedly (SPA navigation) - already-processed elements are skipped.
 */
async function init() {
    log('[content_script.js] init');

    const settings = await getSettings();
    const candidates = findMagnetCandidates(settings.search);

    magnetLinkerHasMagnets = magnetLinkerHasMagnets || candidates.length > 0;

    // let the background know so the toolbar icon can be updated
    browser.runtime.sendMessage({ name: 'magnetsFound', hasMagnets: magnetLinkerHasMagnets }).catch(function () {});

    if (!settings.config.enabled || candidates.length === 0) {
        return;
    }

    const site = findSiteCustomisation(settings.sites, window.location.hostname) || {
        name: '',
        search: '',
        insertBefore: '',
        insertAfter: '',
        float: 'left'
    };

    const sentMagnets = settings.storage.enabled ? await getMagnets() : [];

    candidates.forEach(function (candidate) {
        const id = `magnet-linker-btn-${magnetLinkerButtonCount++}`,
            alreadySent = sentMagnets.includes(candidate.magnet);

        candidate.element.attr('data-magnet-linker-completed', 'true');

        $(getButtonHtml(candidate.magnet, id, site, alreadySent, settings)).insertAfter(candidate.element);
    });
}

// One delegated click handler for all injected buttons, bound once.
$(document).on('click', '[data-magnet-linker-btn]', async function () {
    const $button = $(this);

    const settings = await getSettings();

    $button.text('Sending...');

    try {
        const response = await browser.runtime.sendMessage({
            name: 'addTorrent',
            magnet: $button.attr('data-magnet'),
            buttonId: $button.attr('id')
        });

        applySendResult(response, settings);
    } catch (e) {
        applySendResult({ success: false, buttonId: $button.attr('id'), message: 'Could not reach the extension background.', exception: e.message }, settings);
    }
});

// Re-run injection when SPA navigation changes the URL without a page load.
setInterval(function () {
    if (window.location.href !== magnetLinkerLastUrl) {
        magnetLinkerLastUrl = window.location.href;
        magnetLinkerHasMagnets = false;

        init();
    }
}, 1000);

init();
