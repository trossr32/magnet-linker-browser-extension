requirejs.config({
    "baseUrl": "js",
    "shim": {
        "bootstrap": {"deps": ["jquery"]}
    },
    "paths": {
        "jquery": "jquery-3.2.1.min",
        "bootstrap": "bootstrap.micro.min"
    }
});

requirejs(["main"], function () {
    'use strict';
});