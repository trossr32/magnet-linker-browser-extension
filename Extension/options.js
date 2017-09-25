var settingsPort = chrome.runtime.connect({ name: 'settings' }),
    apiPort = chrome.runtime.connect({ name: 'api' }),
    site = {
        id: 0,
        name: '',
        search: '',
        insertBefore: '',
        insertAfter: '',
        float: 'left'
    },
    entityMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };

var getMax = function (arr, prop) {
    var max;

    for (var i = 0; i < arr.length; i++) {
        if (!max || parseInt(arr[i][prop]) > parseInt(max[prop]))
            max = arr[i];
    }

    return max;
}

var escapeHtml = function (string) {
    return String(string).replace(/[&<>"'`=\/]/g, function (s) {
        return entityMap[s];
    });
}

var setApiFields = function (settings) {
    $('#apiPort').val(settings.api.port);
    $('#apiHost').val(settings.api.host);
    $('#apiUsername').val(settings.api.username);
    $('#apiPassword').val(settings.api.password);
    $('#apiUriFormat').val(settings.api.uriFormat);
}

var buildStorageTab = function (settings) {
    $('#magnetCount').html(settings.magnets.length);
    $('#clearMagnets').attr('disabled', settings.magnets.length === 0);

    $('.easyPaginateNav').remove();
    $('#easyPaginate').empty();

    $.each(settings.magnets, function (i, v) {
        $('#easyPaginate').append('<div class="well well-sm">' + v + '</div>');
    });

    $('#easyPaginate').easyPaginate({
        paginateElement: 'div',
        elementsPerPage: 5,
        effect: 'climb'
    });
}

var buildCustomiserTab = function (settings) {
    $('.customiserPaginateNav').remove();
    $('#customiserPaginate').empty();

    $.each(settings.sites, function (i, s) {
        var wellContent = '<div><div class="wellData wd-header">' + s.name + '</div>' +
            '<div class="wellButtons">' +
            '<button id="edit_' + s.id + '" type="button" class="btn btn-primary wellButton" title="edit"><span class="glyphicon glyphicon-edit"></span></button>' +
            '<button id="delete_' + s.id + '" type="button" class="btn btn-danger wellButton" title="delete"><span class="glyphicon glyphicon-trash"></span></button>' +
            '</div></div><div class="clear"></div>' +
            '<div><div class="wellLabel">Search: </div><div class="wellData">' + s.search + '</div></div><div class="clear"></div>' +
            '<div><div class="wellLabel">Float: </div><div class="wellData">' + s.float + '</div></div><div class="clear"></div>' +
            '<div><div class="wellLabel">Insert before: </div><div class="wellData">' + escapeHtml(s.insertBefore) + '</div></div><div class="clear"></div>' +
            '<div><div class="wellLabel">Insert after: </div><div class="wellData">' + escapeHtml(s.insertAfter) + '</div></div><div class="clear"></div>';

        $('#customiserPaginate').append('<div id="customiserRecord_' + s.id + '" class="well well-sm paginate" data-site-search="' + s.search + '">' + wellContent + '</div>');
    });

    $('#customiserPaginate').easyPaginate({
        paginateElement: 'div',
        paginateClass: 'paginate',
        elementsPerPage: 5,
        effect: 'climb'
    });

    $('[id^="customiserRecord_"]').each(function (i) {
        var id = $(this).attr('id').replace('customiserRecord_', '');

        $(this).find('[id^="edit_"]').click(function (e) {
            settingsPort.postMessage({ method: 'get', caller: 'customiserModal_get', id: id });
        });

        $(this).find('[id^="delete_"]').click(function (e) {
            settingsPort.postMessage({ method: 'get', caller: 'customiserModal_delete', id: id });
        });
    });

    site = {
        id: 0,
        name: '',
        search: '',
        insertBefore: '',
        insertAfter: '',
        float: 'left'
    };

    populateModalFieldsFromSite();
}

var populateModalFieldsFromSite = function() {
    $('#customiserId').val(site.id);
    $('#customiserName').val(site.name);
    $('#customiserSearch').val(site.search);
    $('#customiserFloat').val(site.float);
    $('#customiserInsertBefore').val(site.insertBefore);
    $('#customiserInsertAfter').val(site.insertAfter);
}

var buildApiUri = function(settings) {
    settings.api.wrapFields = { start: '<span style="color:orange;">', end: '</span>' };

    apiPort.postMessage({ method: 'buildUri', api: settings.api });
}

var buildInjectedHtmlPreview = function () {
    $('#injectedHtmlPreview').empty();

    $('#injectedHtmlPreview').append('<div class="customiserInsertPreview">' + escapeHtml($('#customiserInsertBefore').val()) + '</div>');
    
    $('#injectedHtmlPreview').append('<div>' + escapeHtml('<div class="tw-bs" style="float:') + '<span style="color:orange;font-weight:bold;">' + $('#customiserFloat').val() + '</span>' + escapeHtml(';">') + '</div>');
    $('#injectedHtmlPreview').append('<div>&nbsp;&nbsp;&nbsp;&nbsp;' + escapeHtml('<button id="') + '<i>id</i>' + escapeHtml('" type="button" class="btn btn-primary btn-mini" data-magnet="') + '<i>magnet link</i>' + escapeHtml('">Send to transmission</button>') + '</div>');
    $('#injectedHtmlPreview').append('<div>' + escapeHtml('</div>') + '</div>');

    $('#injectedHtmlPreview').append('<div class="customiserInsertPreview">' + escapeHtml($('#customiserInsertAfter').val()) + '</div>');
}

var setSettingsPropertiesFromApiForm = function(settings) {
    settings.api.port = $('#apiPort').val();
    settings.api.host = $('#apiHost').val();
    settings.api.username = $('#apiUsername').val();
    settings.api.password = $('#apiPassword').val();
    settings.api.uriFormat = $('#apiUriFormat').val();
}

settingsPort.onMessage.addListener(function (response) {
    var settings = response.settings;

    switch (response.request.caller) {
        case 'initPage':
            setApiFields(settings);

            buildApiUri(settings);

            buildStorageTab(settings);

            buildCustomiserTab(settings);

            buildInjectedHtmlPreview();
            break;

        case 'setFields':
            setSettingsPropertiesFromApiForm(settings);

            settingsPort.postMessage({ method: 'set', caller: 'setFields', settings: settings });
            break;

        case 'refreshUri':
            setSettingsPropertiesFromApiForm(settings);

            buildApiUri(settings);
            break;

        case 'clearMagnets':
            settings.magnets = [];

            settingsPort.postMessage({ method: 'set', caller: 'clearMagnets', settings: settings });

            $('#magnetCount').html(settings.magnets.length);
            $('#clearMagnets').attr('disabled', settings.magnets.length === 0);
            break;

        case 'customiserModal_get':
            buildCustomiserTab(settings);

            site = {
                id: 0,
                name: '',
                search: '',
                insertBefore: '',
                insertAfter: '',
                float: 'left'
            };

            $.each(settings.sites, function(i, s) {
                if (s.id == response.request.id) {
                    site = s;
                }
            });

            if (site.id === 0 && settings.sites.length > 0) {
                site.id = parseInt(getMax(settings.sites, 'id').id) + 1;
            }

            $('#customiserModal').modal();
            break;

        case 'customiserModal_save':
            site.id = $('#customiserId').val();
            site.name = $('#customiserName').val();
            site.search = $('#customiserSearch').val();
            site.float = $('#customiserFloat').val();
            site.insertBefore = $('#customiserInsertBefore').val();
            site.insertAfter = $('#customiserInsertAfter').val();

            var siteFound = false;

            $.each(settings.sites, function (i, s) {
                if (s.id === site.id) {
                    settings.sites[i] = site;
                    siteFound = true;
                }
            });

            if (!siteFound) {
                settings.sites.push(site);
            }
                    
            $('#customiserModal').modal('hide');

            settingsPort.postMessage({ method: 'set', caller: '', settings: settings });

            buildCustomiserTab(settings);
            break;

        case 'customiserModal_delete':
            settings.sites = settings.sites.filter(function (s) {
                return s.id !== response.request.id;
            });

            settingsPort.postMessage({ method: 'set', caller: '', settings: settings });

            buildCustomiserTab(settings);
            break;
    }
});

apiPort.onMessage.addListener(function(response) {
    $('#apiUriPreview').html(response.uri);
});

$(function () {
    // initialise page on load
    settingsPort.postMessage({ method: 'get', caller: 'initPage' });

    // save settings button click event
    $('#saveOptions').click(function(e) {
        settingsPort.postMessage({ method: 'get', caller: 'setFields' });
    });

    // add uri preview builder events
    $.each([$("#apiUriFormat"), $("#apiHost"), $("#apiPort"), $("#apiUsername"), $("#apiPassword")],
        function (i, el) {
            el.keyup(function () {
                settingsPort.postMessage({ method: 'get', caller: 'refreshUri' });
            });

            el.blur(function () {
                settingsPort.postMessage({ method: 'get', caller: 'refreshUri' });
            });
        });

    // add customiser preview builder events
    $.each([$("#customiserInsertBefore"), $("#customiserInsertAfter")], function (i, el) {
        el.on('keyup blur', buildInjectedHtmlPreview);
    });

    $('#customiserFloat').change(buildInjectedHtmlPreview);

    // storage tab button events
    $('#clearMagnets').click(function (e) {
        settingsPort.postMessage({ method: 'get', caller: 'clearMagnets' });
    });

    $('#refreshMagnets').click(function (e) {
        settingsPort.postMessage({ method: 'get', caller: 'setFields' });
    });

    // customiser tab button events
    $('#addCustomiser').click(function (e) {
        settingsPort.postMessage({ method: 'get', caller: 'customiserModal_get', id: 0 });
    });

    $('#saveCustomiser').click(function (e) {
        settingsPort.postMessage({ method: 'get', caller: 'customiserModal_save' });
    });

    $('#customiserModal').on('show.bs.modal', function (e) {
        populateModalFieldsFromSite();

        buildInjectedHtmlPreview();
    });

    // show first tab on load
    $('#settingsTabs a:first').tab('show');
});