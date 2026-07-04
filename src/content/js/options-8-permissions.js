/**
 * Options tab: permissions overview.
 * Shows the required API permissions from the manifest and the state of the
 * all-sites host permission. On Chromium the host permission is optional and
 * can be granted/revoked here; on Firefox it is granted at install time.
 */

const apiPermissionDescriptions = {
    storage: 'Save your settings (browser sync storage) and magnet history (local storage).',
    scripting: 'Inject the magnet-link buttons into pages once you grant site access.'
};

/**
 * Render the current permission state (badge, buttons, notes).
 */
async function renderPermissionState() {
    const manifest = browser.runtime.getManifest();
    const optionalModel = Array.isArray(manifest.optional_host_permissions); // Chromium MV3
    const granted = await browser.permissions.contains({ origins: ['<all_urls>'] });

    $('#allSitesStatus')
        .removeClass('bg-slate-600 bg-emerald-600 bg-rose-600')
        .addClass(granted ? 'bg-emerald-600' : 'bg-rose-600')
        .text(granted ? 'Granted' : 'Not granted');

    if (optionalModel) {
        $('#grantAllSites').toggleClass('hidden', granted);
        $('#revokeAllSites').toggleClass('hidden', !granted);
        $('#allSitesNote').text(granted ? '' : 'The extension cannot add buttons to pages until this is granted.');
    } else {
        $('#grantAllSites, #revokeAllSites').addClass('hidden');
        $('#allSitesNote').text('Granted when the extension was installed. Manage it from the browser’s add-ons manager.');
    }

    const $list = $('#apiPermissionsList');

    $list.empty();

    (manifest.permissions || [])
        .filter(p => !p.includes('://') && p !== '<all_urls>')
        .forEach(function (permission) {
            $list.append(`<div><span class="ml-badge bg-slate-700 text-white mr-2">${escapeHtml(permission)}</span>${escapeHtml(apiPermissionDescriptions[permission] || '')}</div>`);
        });
}

/**
 * Build the permissions tab.
 */
async function initPermissionsTab() {
    $('#grantAllSites').on('click', requestAllSitesPermission);

    $('#revokeAllSites').on('click', async function () {
        try {
            await browser.permissions.remove({ origins: ['<all_urls>'] });
        } catch (e) {
            log(['[options-8-permissions.js] revoke failed', e], 'error');
        }

        browser.runtime.sendMessage({ name: 'settingsChanged' }).catch(function () {});

        await renderPermissionState();

        $('#permission-banner').removeClass('hidden');
    });

    await renderPermissionState();
}
