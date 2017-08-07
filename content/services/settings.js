define([], function(){
    function settingsService(messenger){
        var settings = null;

        this.getSettings = function(){
            return settings;
        };

        this.loadSettings = function(callback){
            messenger.send({
                method: 'settings.getSettings'
            }).then(function(data){
                if (data && data.success) {
                    settings = data.data;
                }
                callback(settings);
            }, function(data){
                callback();
                throw data;
            });
        };

        this.saveSettings = function(data, callback){
            messenger.send({
                method: 'settings.setSettings',
                data: data
            }).then(function(data){
                if (data && data.success){
                    settings = data.data;
                }
                callback(settings);
            }, function(data){
                callback();
                throw data;
            });
        };

        this.resetSettings = function(callback){
            messenger.send({
                method: 'settings.resetSettings'
            }).then(function (data) {
                if (data && data.success) {
                    settings = data.data;
                }
                callback(settings);
            }, function (data) {
                callback();
                throw data;
            })
        };
    }

    settingsService.$inject = ['messenger'];

    return settingsService;
});