define([], function(){
    function contentService(){
        this.loadContentScript = function(data, callback){
            if (data.magnets) {
                chrome.tabs.insertCSS(null, {file: 'content/css/bootstrap.micro.min.css'}, function () {
                    chrome.tabs.executeScript(null, {file: 'content/js/bootstrap.micro.min.js'}, function () {
                        chrome.tabs.executeScript(null, {file: 'content/js/content_script.js'}, function () {
                            //callback(response);
                        });
                    });
                });
            }
        };
    }

    return contentService;
});