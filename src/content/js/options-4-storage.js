/**
 * Options tab: sent-magnet storage. Toggles auto-save; the magnet history is
 * listed with simple client-side pagination.
 */

const MAGNET_PAGE_SIZE = 5;

let magnetListPage = 0;

/**
 * Render the current page of the stored-magnet list and pager state.
 */
async function renderMagnetList() {
    const magnets = await getMagnets();
    const pageCount = Math.max(1, Math.ceil(magnets.length / MAGNET_PAGE_SIZE));

    magnetListPage = Math.min(magnetListPage, pageCount - 1);

    const start = magnetListPage * MAGNET_PAGE_SIZE;
    const page = magnets.slice(start, start + MAGNET_PAGE_SIZE);

    const $list = $('#magnet-list');

    $list.empty();

    page.forEach(function (magnet) {
        $list.append(`<div class="rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-300 break-all">${escapeHtml(magnet)}</div>`);
    });

    $('#magnetCount').text(magnets.length);
    $('#clearMagnets').prop('disabled', magnets.length === 0);
    $('#magnetPrev').prop('disabled', magnetListPage === 0);
    $('#magnetNext').prop('disabled', magnetListPage >= pageCount - 1);
    $('#magnetPageInfo').text(magnets.length === 0 ? 'No stored magnets' : `Page ${magnetListPage + 1} of ${pageCount}`);
}

/**
 * Build the storage tab.
 * @param {Setting} settings
 */
async function initStorageTab(settings) {
    $('#toggle-storage-enabled').prop('checked', settings.storage.enabled);
    $('#toggle-storage-buttons-enabled').prop('checked', settings.storage.buttonsEnabled);

    initToggle('#toggle-storage-enabled', {}, async function (checked) {
        const s = await getSettings();

        s.storage.enabled = checked;

        await setSettings(s);
    });

    initToggle('#toggle-storage-buttons-enabled', {}, async function (checked) {
        const s = await getSettings();

        s.storage.buttonsEnabled = checked;

        await setSettings(s);
    });

    $('#refreshMagnets').on('click', renderMagnetList);

    $('#clearMagnets').on('click', async function () {
        if (!window.confirm('Clear all stored magnets?')) {
            return;
        }

        await clearMagnets();

        magnetListPage = 0;

        await renderMagnetList();
    });

    $('#magnetPrev').on('click', function () {
        magnetListPage = Math.max(0, magnetListPage - 1);

        renderMagnetList();
    });

    $('#magnetNext').on('click', function () {
        magnetListPage += 1;

        renderMagnetList();
    });

    await renderMagnetList();
}
