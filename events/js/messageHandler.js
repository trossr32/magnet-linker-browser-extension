define([], function(){
    function ServiceException(message){
        return {
            message: message,
            name: 'ServiceException'
        };
    }

    /**
     * Handler for messages that are then distributed to the appropriate services.
     * Services must have functions that follow the format function(data, callback).
     * The request.method should be in the format "serviceName.functionName".
     * @constructor
     */
    function MessageHandler(timeoutMs){
        var _timeoutMs = timeoutMs || 30000;
        var services = {};

        /**
         * Register a service to the MessageHandler.
         * @param serviceName - The name of the service.  Will be used when calling from the devtools ui.
         * @param service - The service itself.  Must only expose functions in the format function(data, callback).
         */
        this.service = function(serviceName, service){
            if (!serviceName){
                throw new ServiceException('serviceName is mandatory.');
            }
            if (typeof(serviceName) !== 'string'){
                throw new ServiceException('serviceName must be a string.');
            }
            if (!service){
                throw new ServiceException('service is mandatory.');
            }
            if (typeof(service) !== 'function'){
                throw new ServiceException('service must be a function.');
            }

            services[serviceName] = new service();
        };

        //Register listener to wait for messages from the devtools ui.
        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
            var async = false;
            if (request.method === 'wake'){
                sendResponse(true);
            }
            else {
                var parts = request.method.split('.');

                if (Object.prototype.hasOwnProperty.call(services, parts[0])) {
                    var service = services[parts[0]];

                    if (Object.prototype.hasOwnProperty.call(service, parts[1])) {
                        async = true;
                        var requestTimeout = _timeoutMs;
                        if (Object.prototype.hasOwnProperty.call(request, 'timeout')) {
                            var requestTimeout = request.timeout;
                        }
                        if (requestTimeout) {
                            var timeout = setTimeout(sendResponse, requestTimeout);
                        }
                        else{
                            console.log('No timeout set for request.');
                        }

                        var callback = function(data){
                            clearTimeout(timeout);
                            sendResponse(data);
                        };
                        service[parts[1]](request.data, callback);
                    }
                }
            }
            return async;
        });
    }

    return MessageHandler;
});