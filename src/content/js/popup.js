/* jshint esversion: 8 */

var getCurrentCustomiser = async (settings) => {
    var site = null;

    let tabs = await browser.tabs.query({ active: true, currentWindow: true });

    $.each(settings.sites, function (i, s) {
        if (s.search != '' && tabs[0].url.toLowerCase().includes(s.search.toLowerCase())) {
            site = s;
        }
    });

    $('#currentCustomiser').html(site == null ? 'No customiser in use' : `Using <b>${site.name}</b> customiser`);

    return site;
};

var setEnabledDisabledButtonState = async (settings) => {
    if (settings == null) {
        settings = await getSettings();
    }

    if (settings.enabled) {
        $('#toggleActive').removeClass('btn-success btn-danger').addClass('btn-danger');
        $('#toggleActive').html('<span class="glyphicon glyphicon-off"></span> Disable');
    } else {
        $('#toggleActive').removeClass('btn-success btn-danger').addClass('btn-success');
        $('#toggleActive').html('<span class="glyphicon glyphicon-off"></span> Enable');
    }
};

$(async () => {
    // initialise page on load
    let settings = await getSettings();

    let site = await getCurrentCustomiser(settings);

    await setEnabledDisabledButtonState(settings);
        
    $('#toggleActive').on('click', async (e) => {
        let settings = await getSettings();

        settings.enabled = !settings.enabled;

        settingsPort.postMessage({ method: 'set', caller: 'setFields', settings: settings });

        await setEnabledDisabledButtonState(settings);

        await setIcon();

        let tabs = await browser.tabs.query({ active: true, currentWindow: true });
        
        await browser.tabs.update(tabs[0].id, { url: tabs[0].url });
    });

    $('#btnSettings').on('click', async () => {
        await browser.runtime.openOptionsPage(); // add open flag in settings?
    });
});