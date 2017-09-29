// check to see if there are any magnet links on the page and if
// there are, post a message to the event script to load the main
// content script

var port = chrome.runtime.connect({name: 'magnetCheck'});

var checkMagnets = function() {
    port.postMessage({ magnets: $("a[href^='magnet:']").length > 0 });
}

$(function () {
    checkMagnets();
});