/**
 * Options tab: Transmission API settings.
 * Fields auto-save on change; the URL preview highlights substituted tokens;
 * the Test connection button round-trips through the background RPC client.
 */

/**
 * Render the API URL preview with substituted values highlighted and escaped.
 * @param {Setting} settings
 */
function renderApiPreview(settings) {
    const api = {
        host: escapeHtml(settings.api.host),
        port: escapeHtml(settings.api.port),
        username: escapeHtml(settings.api.username),
        password: settings.api.password ? '****' : '',
        uriFormat: escapeHtml(settings.api.uriFormat)
    };

    $('#apiUriPreview').html(buildApiUrl(api, { start: '<span class="text-amber-400">', end: '</span>' }));
}

/**
 * Save the API form fields to settings and refresh the preview.
 */
async function saveApiForm() {
    const settings = await getSettings();

    settings.api.host = $('#apiHost').val().trim();
    settings.api.port = $('#apiPort').val().trim();
    settings.api.username = $('#apiUsername').val();
    settings.api.password = $('#apiPassword').val();
    settings.api.uriFormat = $('#apiUriFormat').val().trim();

    await setSettings(settings);

    renderApiPreview(settings);
}

/**
 * Build the API tab.
 * @param {Setting} settings
 */
async function initApiTab(settings) {
    $('#apiHost').val(settings.api.host);
    $('#apiPort').val(settings.api.port);
    $('#apiUsername').val(settings.api.username);
    $('#apiPassword').val(settings.api.password);
    $('#apiUriFormat').val(settings.api.uriFormat);

    renderApiPreview(settings);

    $('#apiHost, #apiPort, #apiUsername, #apiPassword, #apiUriFormat').on('keyup blur change', saveApiForm);

    $('#apiTest').on('click', async function () {
        const $result = $('#apiTestResult');

        // site access also covers the Transmission host; request inside this user gesture if missing
        const granted = await browser.permissions.contains({ origins: ['<all_urls>'] }) || await requestAllSitesPermission();

        if (!granted) {
            $result.attr('class', 'text-sm text-rose-400').text('Site access is required to reach the Transmission API.');
            return;
        }

        $result.attr('class', 'text-sm text-slate-400').html('<i class="fas fa-spinner fa-spin"></i> Testing&hellip;');

        try {
            const response = await browser.runtime.sendMessage({ name: 'testConnection' });

            if (response && response.success) {
                $result.attr('class', 'text-sm text-emerald-400').text(response.message || 'Connected');
            } else {
                $result.attr('class', 'text-sm text-rose-400').text((response && response.message) || 'Connection failed');
            }
        } catch (e) {
            $result.attr('class', 'text-sm text-rose-400').text(`Connection failed: ${e.message}`);
        }
    });
}
