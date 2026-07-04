/**
 * Popup: enable/disable toggle, quick links, active site customisation and
 * permission state.
 */

/**
 * Reflect the enabled state on the toggle button.
 * @param {Setting} settings
 */
function setEnabledDisabledButtonState(settings) {
    const enabled = settings.config.enabled;

    $('#toggleActive')
        .removeClass('bg-rose-600 hover:bg-rose-500 bg-emerald-600 hover:bg-emerald-500')
        .addClass(enabled ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500')
        .html(`<i class="fas fa-power-off"></i> ${enabled ? 'Disable' : 'Enable'}`);
}

/**
 * Show which site customisation applies to the active tab, when the tab URL
 * is readable (requires the all-sites permission).
 * @param {Setting} settings
 */
async function showCurrentCustomiser(settings) {
    let text = 'No customiser in use';

    try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        const url = tabs.length ? tabs[0].url : null;

        if (url) {
            const site = findSiteCustomisation(settings.sites, new URL(url).hostname);

            if (site) {
                text = `Using '${site.name}' customiser`;
            }
        }
    } catch (e) { /* no permission to read the tab url */ }

    $('#currentCustomiser').text(text);
}

$(async function () {
    const version = browser.runtime.getManifest().version.split('.').slice(0, 3).join('.');
    $('[data-version]').text(version);

    const settings = await getSettings();

    setEnabledDisabledButtonState(settings);
    await showCurrentCustomiser(settings);

    const granted = await browser.permissions.contains({ origins: ['<all_urls>'] });
    $('#popup-permission').toggleClass('hidden', granted);

    $('#popupGrant').on('click', async function () {
        try {
            const nowGranted = await browser.permissions.request({ origins: ['<all_urls>'] });

            $('#popup-permission').toggleClass('hidden', nowGranted);

            if (nowGranted) {
                browser.runtime.sendMessage({ name: 'settingsChanged' }).catch(function () {});
            }
        } catch (e) {
            log(['[popup.js] permission request failed', e], 'error');
        }
    });

    $('#toggleActive').on('click', async function () {
        const s = await getSettings();

        s.config.enabled = !s.config.enabled;

        await setSettings(s);

        setEnabledDisabledButtonState(s);

        browser.runtime.sendMessage({ name: 'settingsChanged' }).catch(function () {});

        try {
            await browser.tabs.reload();
        } catch (e) { /* e.g. browser UI page */ }
    });

    $('#btnSettings').on('click', async function () {
        await browser.runtime.openOptionsPage();
    });
});
