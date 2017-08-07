// check to see if there are any magnet links on the page and if
// there are, post a message to the event script to load the main
// content script

var port = chrome.runtime.connect({name: 'magnetCheck'});

port.onMessage.addListener(function(response) {
    //console.log(response);
});

if ($("a[href^='magnet:']").length) {
    //console.log('found magnets, posting success message.');
    port.postMessage({magnets: true});
}