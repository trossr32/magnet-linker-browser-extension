/*
 service_worker wrapper for MV3.
 It imports the minimal polyfill/core scripts then loads the existing eventPage logic.
 If eventPage.js uses DOM APIs (window, document, $) it must be refactored out.
*/
importScripts('content/js/browser-polyfill.min.js');
/* core.js must not use DOM either. If it does, move DOM parts into content_script.js */
importScripts('content/js/core.js');
importScripts('./eventPage.js' /* path relative to build output; adjust if necessary */);
