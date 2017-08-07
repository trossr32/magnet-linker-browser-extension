define([
    'messageHandler',
    'services/settingsService',
    'services/contentService'
], function(
    messageHandler,
    settingsService,
    contentService
){
    var handler = new messageHandler();
    handler.service('settings', settingsService);
    handler.service('content', contentService);
});