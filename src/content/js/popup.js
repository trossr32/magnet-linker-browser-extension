var iconPort = browser.runtime.connect({ name: 'icon' });

let getCurrentCustomiser = function (settings) {
    var site = null;

    let query = browser.tabs.query({ active: true, currentWindow: true });
    query.then(function (tabs) {
        $.each(settings.sites, function (i, s) {
            if (s.search != '' && tabs[0].url.toLowerCase().includes(s.search.toLowerCase())) {
                site = s;
            }
        });

        $('#currentCustomiser').html(site == null ? 'No customiser in use' : `Using <b>${site.name}</b> customiser`);
    });

    return site;
};

let setEnabledDisabledButtonState = function(settings) {
    $('#toggleActive').removeClass('btn-success btn-danger').addClass(`btn-${(settings.enabled ? 'danger' : 'success')}`);
    $('#toggleActive').html(`<i class="fas fa-power-off"></i>&nbsp;&nbsp;&nbsp;&nbsp;${(settings.enabled ? 'Disable' : '&nbsp;Enable')}`);
};

$(async function () {
    // initialise page on load
    const settings = await getSettings();

    setEnabledDisabledButtonState(settings);

    getCurrentCustomiser(settings);
    
    $('#toggleActive').on('click', async function(e) {
        const settings = await getSettings();
        
        // update enabled setting
        settings.enabled = !settings.enabled;

        await setSettings(settings);

        // update popup ui
        setEnabledDisabledButtonState(settings);

        iconPort.postMessage({ x: "y" });

        browser.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            browser.tabs.update(tabs[0].id, { url: tabs[0].url });
        });
    });

    $('#btnSettings').on('click', async function() {
        await browser.runtime.openOptionsPage(); // add open flag in settings?
    });
});