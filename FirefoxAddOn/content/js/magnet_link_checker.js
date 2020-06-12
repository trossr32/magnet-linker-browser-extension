// check to see if there are any magnet links on the page and if
// there are, post a message to the event script to load the main
// content script

var port = browser.runtime.connect({name: 'magnetCheck'});

var checkMagnets = function() {
    port.postMessage({ magnets: 
        // check if any elements have a magnet link in their text
        ($("*")
            .map(function () {
                if (/magnet:\?xt=urn:btih:[a-zA-Z0-9]*/g.test($(this).text())) {
                    return this;
                }
            })
            .get()
            .length > 0) || 
        // check if any elements have a magnet link the their href attribute
        ($("*")
            .map(function () {
                if (/magnet:\?xt=urn:btih:[a-zA-Z0-9]*/g.test($(this).attr('href'))) {
                    return this;
                }
            })
            .get()
            .length > 0)});
}

$(function () {
    $("*")
    .map(function () {
        if (/magnet:\?xt=urn:btih:[a-zA-Z0-9]*/g.test($(this).text())) {
            return this;
        }
    })
    .get();
    checkMagnets();
});