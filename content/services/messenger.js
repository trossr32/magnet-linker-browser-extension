define([], function(){
    /**
     * Wraps chrome event page messaging to make it angular friendly.
     * @param $q - Dependency on $q in order to return promise and handle response in angular safe way.
     */
    function messengerService($q){
        this.send = function(message){
            return $q(function (resolve, reject) {
                var maxAttempts = 10;
                var timeoutMs = 250;
                var attempt = 1;

                var retryFunction = function(){
                    console.log('Attempting to wake.');
                    //Check if event page is loaded.  Loads if not loaded.
                    chrome.runtime.sendMessage({method: 'wake'}, function(data){
                        //When loaded, send message.
                        if (data){
                            console.log('Woken.');
                            chrome.runtime.sendMessage(message, function (data) {
                                resolve(data);
                            });
                        }
                        //If not loaded, attempt to load.
                        else if(attempt < maxAttempts){
                            console.log('Wake failed, retrying.');
                            var timeout = setTimeout(retryFunction, timeoutMs);
                            attempt++;
                        }
                        //Max of 10 attempts to wake event page.
                        else{
                            console.log('Wake did nothing.  Failure.');
                            reject('Failed to wake event page.');
                        }
                    });
                };

                retryFunction();
            });
        }
    }

    messengerService.$inject = ['$q'];

    return messengerService;
});