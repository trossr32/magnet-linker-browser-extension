/**
 * Options page orchestrator: tab system, shared UI helpers, permission banner
 * and boot. Tab-specific logic lives in options-1..8-*.js, loaded before this
 * file; each exposes an initXxxTab(settings) function called from boot below.
 */

const entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
};

const escapeHtml = (string) =>
    String(string == null ? '' : string).replace(/[&<>"'`=\/]/g, s => entityMap[s]);

/**
 * Initialise the ARIA tab system. The active tab persists in sessionStorage.
 */
function initTabs() {
    const $tabs = $('[role="tab"]');

    function activate(name) {
        $tabs.each(function () {
            $(this).attr('aria-selected', String($(this).data('tab') === name));
        });

        $('[role="tabpanel"]').each(function () {
            $(this).toggleClass('hidden', $(this).attr('id') !== `panel-${name}`);
        });

        try {
            sessionStorage.setItem('magnetLinkerActiveTab', name);
        } catch (e) { /* private browsing */ }
    }

    $tabs.on('click', function () {
        activate($(this).data('tab'));
    });

    let initial = 'api';

    try {
        initial = sessionStorage.getItem('magnetLinkerActiveTab') || 'api';
    } catch (e) { /* private browsing */ }

    activate(initial);
}

/**
 * Convert a hidden checkbox into a styled toggle button.
 * @param {string} selector - checkbox selector
 * @param {{on?: string, off?: string, width?: string}} opts
 * @param {function(boolean)} [onChange] - called with the new checked state
 */
function initToggle(selector, opts, onChange) {
    const config = Object.assign({ on: 'Enabled', off: 'Disabled', width: '90px' }, opts);
    const $checkbox = $(selector);

    if (!$checkbox.length || $checkbox.next('.ml-toggle').length) {
        return;
    }

    const $button = $('<button type="button" class="ml-toggle" role="switch"></button>').css('width', config.width);

    const render = () => {
        const on = $checkbox.prop('checked');

        $button
            .text(on ? config.on : config.off)
            .attr('aria-checked', String(on))
            .removeClass('bg-emerald-600 hover:bg-emerald-500 bg-rose-600 hover:bg-rose-500')
            .addClass(on ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500');
    };

    $button.on('click', function () {
        $checkbox.prop('checked', !$checkbox.prop('checked'));

        render();

        if (onChange) {
            onChange($checkbox.prop('checked'));
        }
    });

    $checkbox.after($button);

    render();
}

/**
 * Request the all-sites optional host permission (Chromium). Must run from a
 * user gesture. Updates the banner and permissions tab, and tells the
 * background to (re)register the content scripts.
 * @returns {Promise<boolean>} granted
 */
async function requestAllSitesPermission() {
    let granted = false;

    try {
        granted = await browser.permissions.request({ origins: ['<all_urls>'] });
    } catch (e) {
        log(['[options.js] permission request failed', e], 'error');
    }

    if (granted) {
        browser.runtime.sendMessage({ name: 'settingsChanged' }).catch(function () {});
    }

    $('#permission-banner').toggleClass('hidden', granted);

    if (typeof renderPermissionState === 'function') {
        await renderPermissionState();
    }

    return granted;
}

$(async function () {
    initTabs();

    const version = browser.runtime.getManifest().version.split('.').slice(0, 3).join('.');
    $('[data-version]').text(version);

    const settings = await getSettings();

    // header extension enable/disable toggle
    $('#toggle-extension-enabled').prop('checked', settings.config.enabled);
    initToggle('#toggle-extension-enabled', { on: 'Enabled', off: 'Disabled' }, async function (checked) {
        const s = await getSettings();

        s.config.enabled = checked;

        await setSettings(s);

        browser.runtime.sendMessage({ name: 'settingsChanged' }).catch(function () {});
    });

    // permission banner (hidden when granted; always granted on Firefox MV2)
    const granted = await browser.permissions.contains({ origins: ['<all_urls>'] });
    $('#permission-banner').toggleClass('hidden', granted);
    $('#grant-permission-banner').on('click', requestAllSitesPermission);

    await initApiTab(settings);
    await initSearchTab(settings);
    await initSitesTab(settings);
    await initStorageTab(settings);
    await initNotificationsTab(settings);
    await initDebugTab(settings);
    await initBackupTab();
    await initPermissionsTab();
});
