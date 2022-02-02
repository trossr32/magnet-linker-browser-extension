// check to see if there are any magnet links on the page and if
// there are, post a message to the event script to load the main
// content script

let port = browser.runtime.connect({name: 'magnetCheck'});

async function hasMagnets() {
    await log('[core.js] hasMagnets');

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

async function checkMagnets() {
    await log('[magnet_link_checker.js] checkMagnets');

    port.postMessage({ magnets: (await hasMagnets()) });
}

browser.runtime.onConnect.addListener(async function(port) {
    await log(['[magnet_link_checker.js] browser.runtime.onConnect', port]);

    switch (port.name) {
        case 'magnetCheckRequest':
            await checkMagnets();
            break;
    }
});

$(async function () {
    await log('[magnet_link_checker.js] page load');

    await checkMagnets();
});