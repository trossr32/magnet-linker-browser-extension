define([], function(){
    function transmissionService(messenger){
        var settings = null;

        this.send = function(magnet, buttonId, callback){
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

            messenger.send({
                method: 'content.loadContentScript',
                magnet: magnet,
                buttonId: buttonId
            }).then(function(data){
                console.log(data);

                if (data.buttonId && data.success) {
                    $('#' + data.buttonId)
                        .text('Sent successfully. Disabling link.')
                        .removeClass('btn-info')
                        .addClass('btn-success')
                        .prop('disabled', true);

                    $('[ml-id="' + data.buttonId + '"]')
                        .prop('disabled', true)
                        .css('text-decoration', 'line-through');
                }
            }, function(data){
                throw data;
            });
        };
    }

    transmissionService.$inject = ['messenger'];

    return transmissionService;
});