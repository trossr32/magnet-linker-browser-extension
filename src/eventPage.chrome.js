/**
 * Chromium MV3 service worker bootstrap.
 * No jQuery here - service workers have no DOM; shared code is fetch/promise based.
 */
importScripts(
    'content/js/browser-polyfill.min.js',
    'content/js/core.js',
    'content/js/transmission.js',
    'content/js/background.js'
);

initBackground();
