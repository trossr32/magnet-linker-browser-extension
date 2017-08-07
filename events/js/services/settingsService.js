define([], function(){
    function settingsService(){
        var defaultSettings = {
            scrapeDefaults: {
                userAgent: 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:39.0) Gecko/20100101 Firefox/39.0',
                blockedSites:[]
            }
        };

        this.getSettings = function(data, callback){
            chrome.storage.sync.get(defaultSettings, function(settings){
                var response = {
                    success: true,
                    message: 'Settings loaded',
                    data: settings
                };

                callback(response);
            });
        };

        this.setSettings = function(data, callback){
            chrome.storage.sync.set(data, function(){
                chrome.storage.sync.get(defaultSettings, function(settings){
                    var response = {
                        success: true,
                        message: 'Settings saved',
                        data: settings
                    };

                    callback(response);
                });
            });
        };

        this.resetSettings = function(data, callback){
            chrome.storage.sync.set(defaultSettings, function(){
                chrome.storage.sync.get(defaultSettings, function(settings){
                    var response = {
                        success: true,
                        message: 'Settings reset',
                        data: settings
                    };

                    callback(response);
                });
            });
        }
    }

    return settingsService;
});