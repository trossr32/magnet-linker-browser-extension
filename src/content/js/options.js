let site = {
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

let getMax = function(arr, prop) {
    let max;

    for (let i = 0; i < arr.length; i++) {
        if (!max || parseInt(arr[i][prop]) > parseInt(max[prop]))
            max = arr[i];
    }

    return max;
};

let escapeHtml = (string) =>
    String(string).replace(/[&<>"'`=\/]/g, function (s) {
        return entityMap[s];
    });

async function setApiFields(settings) {
    $('#apiPort').val(settings.api.port);
    $('#apiHost').val(settings.api.host);
    $('#apiUsername').val(settings.api.username);
    $('#apiPassword').val(settings.api.password);
    $('#apiUriFormat').val(settings.api.uriFormat);

    await setSettings(settings);
}

async function setSearchFields(settings) {
    $('#searchAttributes').val(settings.search.attributes);
    $('#searchElementTypes').val(settings.search.elementTypes);

    await setSettings(settings);
}

function magnetStorageTemplate(data) {
    let html = '';
    
    $.each(data, function (i, v) {
        html += `<div class="well well-sm">${v}</div>`;
    });

    return html;
}

/**
 * Build the storage tab
 * @param {Setting} data - settings
 */
async function buildStorageTab(settings) {
    $('#magnetCount').html(settings.magnets.length);
    $('#clearMagnets').attr('disabled', settings.magnets.length === 0);

    $('#magnet-data-container').empty();

    $('#magnet-pagination-container').pagination({
        dataSource: settings.magnets,
        pageSize: 5,
        callback: function(data, pagination) {
            let html = magnetStorageTemplate(data);

            $('#magnet-data-container').html(html);
        }
    });

    // enable toggle
    $.each(['', '-buttons'], function (i, v) {
        let idSelector = `#toggle-storage${v}-enabled`;

        // initialise toggle
        $(idSelector).bootstrapToggle({
            on: 'Enabled',
            off: 'Disabled',
            onstyle: 'success',
            offstyle: 'danger',
            width: '90px',
            size: 'small'
        });

        // storage enabled/disabled toggle change event
        $(idSelector).on('change', setSettingsPropertiesFromStorageForm);
    });
}

/**
 * Build the debug tab
 * @param {Setting} data - settings
 */
async function initialiseDebugForm(settings) {
    let wrapper = $('<div></div>')
        .append($('<h5 class="mb-4">Logging</h5>'))
        .append($('<div class="row"></div>')
            .append($('<label for="toggle-debug" class="col-4" style="margin-top: 2px;">Turn on console logging</label>'))
            .append($('<div class="col"></div>')
                .append($('<input type="checkbox" id="toggle-debug">').prop('checked', settings.debug))
            )
        );

    $('#debugOptionsForm').prepend(wrapper);

    // enable toggles
    $('#toggle-debug').bootstrapToggle({
        on: 'Enabled',
        off: 'Disabled',
        onstyle: 'success',
        offstyle: 'danger',
        width: '90px',
        size: 'small'
    });

    // site enabled/disabled toggle change event
    $('#toggle-debug').on('change', setSettingsPropertiesFromDebugForm);
}

function customiserTemplate(data) {
    let html = '';
    
    $.each(data, function (i, s) {
        html +=
        `<div id="customiserRecord_${s.id}" class="well well-sm paginate" data-site-search="${s.search}">
            <div>
                <div class="wellData wd-header">${s.name}</div>
                <div class="wellButtons">
                    <button id="edit_${s.id}" type="button" class="btn btn-primary wellButton" title="edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button id="delete_${s.id}" type="button" class="btn btn-danger wellButton" title="delete">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
            <div class="clear"></div>
            <div>
                <div class="wellLabel">Search: </div>
                <div class="wellData">${s.search}</div>
            </div>
            <div class="clear"></div>
            <div>
                <div class="wellLabel">Float: </div>
                <div class="wellData">${s.float}</div>
            </div>
            <div class="clear"></div>
            <div>
                <div class="wellLabel">Insert before: </div>
                <div class="wellData">${escapeHtml(s.insertBefore)}</div>
            </div>
            <div class="clear"></div>
            <div>
                <div class="wellLabel">Insert after: </div>
                <div class="wellData">${escapeHtml(s.insertAfter)}</div>
            </div>
            <div class="clear"></div>
        </div>`;
    });

    return html;
}

async function buildCustomiserTab(settings) {
    $('#customiser-data-container').empty();

    $('#customiser-pagination-container').pagination({
        dataSource: settings.sites,
        pageSize: 5,
        callback: function(data, pagination) {
            let html = customiserTemplate(data);

            $('#customiser-data-container').html(html);
        }
    });

    $('[id^="customiserRecord_"]').each(function (i) {
        let id = $(this).attr('id').replace('customiserRecord_', '');

        $(this).find('[id^="edit_"]').on('click', async function (e) {
            const settings = await getSettings();
                                
            await buildCustomiserTab(settings);

            site = {
                id: id,
                name: '',
                search: '',
                insertBefore: '',
                insertAfter: '',
                float: 'left'
            };

            $.each(settings.sites, function(i, s) {
                if (s.id == id) {
                    site = s;
                }
            });

            if (site.id == 0) {
                site.id = (settings.sites.length > 0) ? parseInt(getMax(settings.sites, 'id').id) + 1 : 1;
            }

            $('#customiserModal').modal('show');

            $('#customiserId').val(site.id);
        });

        $(this).find('[id^="delete_"]').on('click', async function (e) {
            const settings = await getSettings();
                
            settings.sites = settings.sites.filter(function (s) {
                return s.id !== parseInt(id);
            });

            await setSettings(settings);

            await buildCustomiserTab(settings);
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
}

async function populateModalFieldsFromSite() {
    $('#customiserId').val(site.id);
    $('#customiserName').val(site.name);
    $('#customiserSearch').val(site.search);
    $('#customiserFloat').val(site.float);
    $('#customiserInsertBefore').val(site.insertBefore);
    $('#customiserInsertAfter').val(site.insertAfter);
}

async function buildInjectedHtmlPreview() {
    $('#injectedHtmlPreview').empty();

    $('#injectedHtmlPreview').append(`<div class="customiserInsertPreview">${escapeHtml($('#customiserInsertBefore').val())}</div>`);
    
    $('#injectedHtmlPreview').append(`<div>${escapeHtml('<div class="tw-bs" style="float:')}<span style="color:orange;font-weight:bold;">${$('#customiserFloat').val()}</span>${escapeHtml(';">')}</div>`);
    $('#injectedHtmlPreview').append(`<div>&nbsp;&nbsp;&nbsp;&nbsp;${escapeHtml('<button id="')}<i>id</i>${escapeHtml('" type="button" class="btn btn-primary btn-mini" data-magnet="')}<i>magnet link</i>${escapeHtml('">Send to transmission</button>')}</div>`);
    $('#injectedHtmlPreview').append(`<div>${escapeHtml('</div>')}</div>`);

    $('#injectedHtmlPreview').append(`<div class="customiserInsertPreview">${escapeHtml($('#customiserInsertAfter').val())}</div>`);
}

async function setSettingsPropertiesFromApiForm(settings) {
    settings.api.port = $('#apiPort').val();
    settings.api.host = $('#apiHost').val();
    settings.api.username = $('#apiUsername').val();
    settings.api.password = $('#apiPassword').val();
    settings.api.uriFormat = $('#apiUriFormat').val();

    await setSettings(settings);
}

async function setSettingsPropertiesFromSearchForm(settings) {
    settings.search.attributes = $('#searchAttributes').val();
    settings.search.elementTypes = $('#searchElementTypes').val();

    await setSettings(settings);
}

/**
 * Update settings from the storage tab form fields
 */
async function setSettingsPropertiesFromStorageForm() {
    const settings = await getSettings();

    settings.storageEnabled = $('#toggle-storage-enabled').prop('checked');
    settings.storageButtonsEnabled = $('#toggle-storage-buttons-enabled').prop('checked');

    await setSettings(settings);
}

/**
 * Update settings from the debug tab form fields
 */
async function setSettingsPropertiesFromDebugForm() {
    const settings = await getSettings();

    settings.debug = $('#toggle-debug').prop('checked');

    await setSettings(settings);
}

$(async function () {
    // initialise page on load
    const settings = await getSettings();

    await setApiFields(settings);
    await setSearchFields(settings);
    await buildStorageTab(settings);
    await buildCustomiserTab(settings);
    await initialiseDebugForm(settings);
    await buildInjectedHtmlPreview();

    settings.api.wrapFields = { start: '<span style="color:orange;">', end: '</span>' };

    $('#apiUriPreview').html(buildApiUrl(settings.api));

    // save settings button click event
    $('#saveOptions').on('click', async function(e) {
        const settings = await getSettings();

        await setSettingsPropertiesFromApiForm(settings);
    });

    // save search settings button click event
    $('#saveSearchOptions').on('click', async function(e) {
        const settings = await getSettings();

        await setSettingsPropertiesFromSearchForm(settings);
    });

    // save search settings button click event
    $('#saveStorage').on('click', async function(e) {
        const settings = await getSettings();

        await setSettingsPropertiesFromStorageForm(settings);
    });

    // add uri preview builder events
    $.each([$("#apiUriFormat"), $("#apiHost"), $("#apiPort"), $("#apiUsername"), $("#apiPassword")],
        function (i, el) {
            el.on('keyup blur', async function() {
                const settings = await getSettings();
                
                await setSettingsPropertiesFromApiForm(settings);

                settings.api.wrapFields = { start: '<span style="color:orange;">', end: '</span>' };

                $('#apiUriPreview').html(buildApiUrl(settings.api));
            });
        });

    // add customiser preview builder events
    $.each([$("#customiserInsertBefore"), $("#customiserInsertAfter")], function (i, el) {
        el.on('keyup blur', buildInjectedHtmlPreview);
    });

    $('#customiserFloat').on('change', buildInjectedHtmlPreview);

    // storage tab button events
    $('#clearMagnets').on('click', async function (e) {
        const settings = await getSettings();
                
        settings.magnets = [];

        await setSettings(settings);

        await buildStorageTab(settings);
    });

    $('#refreshMagnets').on('click', async function (e) {
        const settings = await getSettings();
                
        await buildStorageTab(settings);
    });

    // customiser tab button events
    $('#addCustomiser').on('click', async function (e) {
        const settings = await getSettings();
                                
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
            if (s.id == 0) {
                site = s;
            }
        });

        if (site.id == 0) {
            site.id = (settings.sites.length > 0) ? parseInt(getMax(settings.sites, 'id').id) + 1 : 1;
        }

        $('#customiserModal').modal('show');

        $('#customiserId').val(site.id);
    });

    $('#saveCustomiser').on('click', async function (e) {
        const settings = await getSettings();
                                
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

        await setSettings(settings);

        await buildCustomiserTab(settings);
    });

    $('#customiserModal').on('show.bs.modal', async function () {
        await populateModalFieldsFromSite();

        await buildInjectedHtmlPreview();
    });

    // deactivate all other tabs on click. this shouldn't be required, but bootstrap 5 beta seems a bit buggy with tab deactivation.
    $('.tab-pane').on('click', function() {
        let id = $(this).attr('id');

        $('.tab-pane').each(function(t) {
            if (id == $(this).attr('id')) {
                return;
            }

            $(this).removeClass('show active');
        });
    });
});