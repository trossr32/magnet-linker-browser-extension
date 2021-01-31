/* jshint esversion: 8 */

browser.runtime.onConnect.addListener(async (port) => {
    console.log('port message received');

    switch (port.name) {
        case 'magnetCheck':
            await port.onMessage.addListener(async (request) => {
                console.log('at magnet check');

                try {
                    let settings = await getSettings();

                    console.log(request.magnets);

                    settings.pageHasMagnets = request.magnets;

                    settings = await setSettings(settings);
                    
                    await setIcon();

                    if (!settings.pageHasMagnets) {
                        return;
                    }

                    browser.tabs.insertCSS(null, { file: 'content/css/bootstrap-isolated.min.css' })
                    .then(() => browser.tabs.insertCSS(null, { file: 'content/css/content_script.css' }))
                    .then(() => browser.tabs.executeScript(null, { file: 'content/js/content_script.js' }))
                    .catch((e) => {
                        console.error(e);
                    });
                }
                catch (e) {
                    console.log(e);
                }
            });
            break;
    }
});

// listen for tab update/activation and amend icon to suit
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    await setIcon();
});

browser.tabs.onActivated.addListener(async (activeInfo) => {
    await setIcon();
});