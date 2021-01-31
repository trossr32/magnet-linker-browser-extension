/* jshint esversion: 8 */

var site = {
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

var getMax = (arr, prop) => {
    let max;

    for (var i = 0; i < arr.length; i++) {
        if (!max || parseInt(arr[i][prop]) > parseInt(max[prop]))
            max = arr[i];
    }

    return max;
};

var escapeHtml = (string) => {
    return String(string).replace(/[&<>"'`=\/]/g, function (s) {
        return entityMap[s];
    });
};

var setApiFields = async (settings) => {
    $('#apiPort').val(settings.api.port);
    $('#apiHost').val(settings.api.host);
    $('#apiUsername').val(settings.api.username);
    $('#apiPassword').val(settings.api.password);
    $('#apiUriFormat').val(settings.api.uriFormat);
};

var setSearchFields = async (settings) => {
    $('#searchAttributes').val(settings.search.attributes);
    $('#searchElementTypes').val(settings.search.elementTypes);
};

var buildCustomiserTab = async (settings = null) => {
    if (settings == null) {
        settings = await getSettings();
    }
    
    $('.customiserPaginateNav').remove();
    $('#customiserPaginate').empty();

    $.each(settings.sites, function (i, s) {
        var wellContent = `<div><div class="wellData wd-header">${s.name}</div>'
            '<div class="wellButtons">'
            '<button id="edit_${s.id}" type="button" class="btn btn-primary wellButton" title="edit"><span class="glyphicon glyphicon-edit"></span></button>'
            '<button id="delete_${s.id}" type="button" class="btn btn-danger wellButton" title="delete"><span class="glyphicon glyphicon-trash"></span></button>'
            '</div></div><div class="clear"></div>'
            '<div><div class="wellLabel">Search: </div><div class="wellData">${s.search}</div></div><div class="clear"></div>'
            '<div><div class="wellLabel">Float: </div><div class="wellData">${s.float}</div></div><div class="clear"></div>'
            '<div><div class="wellLabel">Insert before: </div><div class="wellData">${escapeHtml(s.insertBefore)}</div></div><div class="clear"></div>'
            '<div><div class="wellLabel">Insert after: </div><div class="wellData">${escapeHtml(s.insertAfter)}</div></div><div class="clear"></div>`;

        $('#customiserPaginate').append(`<div id="customiserRecord_${s.id}" class="well well-sm paginate" data-site-search="${s.search}">${wellContent}</div>`);
    });

    $('#customiserPaginate').easyPaginate({
        paginateElement: 'div',
        paginateClass: 'paginate',
        elementsPerPage: 5,
        effect: 'climb'
    });

    $('[id^="customiserRecord_"]').each(function (i) {
        var id = $(this).attr('id').replace('customiserRecord_', '');

        $(this).find('[id^="edit_"]').on('click', async (e) => {
            await buildCustomiserTab();
        });

        $(this).find('[id^="delete_"]').on('click', async (e) => { 
            await deleteCustomiserModal();
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

    await populateModalFieldsFromSite();
};

var populateModalFieldsFromSite = async () => {
    $('#customiserId').val(site.id);
    $('#customiserName').val(site.name);
    $('#customiserSearch').val(site.search);
    $('#customiserFloat').val(site.float);
    $('#customiserInsertBefore').val(site.insertBefore);
    $('#customiserInsertAfter').val(site.insertAfter);
};

var buildInjectedHtmlPreview = async () => {
    $('#injectedHtmlPreview').empty();

    $('#injectedHtmlPreview').append(`<div class="customiserInsertPreview">${escapeHtml($('#customiserInsertBefore').val())}</div>`);
    
    $('#injectedHtmlPreview').append(`<div>${escapeHtml('<div class="tw-bs" style="float:')}<span style="color:orange;font-weight:bold;">${$('#customiserFloat').val()}</span>${escapeHtml(';">')}</div>`);
    $('#injectedHtmlPreview').append(`<div>&nbsp;&nbsp;&nbsp;&nbsp;${escapeHtml('<button id="')}<i>id</i>${escapeHtml('" type="button" class="btn btn-primary btn-mini" data-magnet="')}<i>magnet link</i>${escapeHtml('">Send to transmission</button>')}</div>`);
    $('#injectedHtmlPreview').append(`<div>${escapeHtml('</div>')}</div>`);

    $('#injectedHtmlPreview').append(`<div class="customiserInsertPreview">${escapeHtml($('#customiserInsertAfter').val())}</div>`);
};

var setSettingsPropertiesFromApiForm = async () => {
    let settings = await getSettings();

    settings.api.port = $('#apiPort').val();
    settings.api.host = $('#apiHost').val();
    settings.api.username = $('#apiUsername').val();
    settings.api.password = $('#apiPassword').val();
    settings.api.uriFormat = $('#apiUriFormat').val();

    settings = await setSettings(settings);

    return settings;
};

var setSettingsPropertiesFromSearchForm = async () => {
    let settings = await getSettings();

    settings.search.attributes = $('#searchAttributes').val();
    settings.search.elementTypes = $('#searchElementTypes').val();

    settings = await setSettings(settings);

    return settings;
};

var getCustomiserModal = async () => {
    let settings = await getSettings();

    await buildCustomiserTab(settings);

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

    if (site.id == 0) {
        site.id = (settings.sites.length > 0) ? parseInt(getMax(settings.sites, 'id').id) + 1 : 1;
    }

    $('#customiserModal').modal();

    $('#customiserId').val(site.id);
};

var deleteCustomiserModal = async () => {
    let settings = await getSettings();
    
    settings.sites = settings.sites.filter(function (s) {
        return s.id !== parseInt(response.request.id);
    });

    settings = await setSettings(settings);
        
    await buildCustomiserTab(settings);
};

var saveCustomiserModal = async () => {
    let settings = await getSettings();

    site.id = parseInt($('#customiserId').val());
    site.name = $('#customiserName').val();
    site.search = $('#customiserSearch').val();
    site.float = $('#customiserFloat').val();
    site.insertBefore = $('#customiserInsertBefore').val();
    site.insertAfter = $('#customiserInsertAfter').val();

    let siteFound = false;

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

    settings = await setSettings(settings);
        
    await buildCustomiserTab(settings);
};

$(async () => {
    // initialise page on load    
    let settings = await getSettings();

    await setApiFields(settings);

    settings.api.wrapFields = { start: '<span style="color:orange;">', end: '</span>' };

    await buildApiUri(settings.api);

    await setSearchFields(settings);

    await buildCustomiserTab(settings);

    await buildInjectedHtmlPreview();

    // save settings button click event
    $('#saveOptions').on('click', async (e) => {
        await setSettingsPropertiesFromSearchForm();
    });

    // add uri preview builder events
    $.each([$("#apiUriFormat"), $("#apiHost"), $("#apiPort"), $("#apiUsername"), $("#apiPassword")],
        function (i, el) {
            el.on('keyup blur', async (e) => {
                let settings = await setSettingsPropertiesFromApiForm();

                settings.api.wrapFields = { start: '<span style="color:orange;">', end: '</span>' };

                let url = await buildApiUrl(settings.api);
                
                $('#apiUriPreview').html(url);
            });
    });

    // add customiser preview builder events
    $.each([$("#customiserInsertBefore"), $("#customiserInsertAfter")], function (i, el) {
        el.on('keyup blur', buildInjectedHtmlPreview);
    });

    $('#customiserFloat').on('change', buildInjectedHtmlPreview);

    // customiser tab button events
    $('#addCustomiser').on('click', getCustomiserModal);

    $('#saveCustomiser').on('click', saveCustomiserModal);

    $('#customiserModal').on('show.bs.modal', async (e) => {
        await populateModalFieldsFromSite();

        await buildInjectedHtmlPreview();
    });

    // show first tab on load
    $('#settingsTabs a:first').tab('show');
});