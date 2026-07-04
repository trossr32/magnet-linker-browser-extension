/**
 * Options tab: magnet search configuration. Fields auto-save on change.
 */

/**
 * Build the magnet search tab.
 * @param {Setting} settings
 */
async function initSearchTab(settings) {
    $('#searchAttributes').val(settings.search.attributes);
    $('#searchElementTypes').val(settings.search.elementTypes);

    $('#searchAttributes, #searchElementTypes').on('keyup blur change', async function () {
        const s = await getSettings();

        s.search.attributes = $('#searchAttributes').val();
        s.search.elementTypes = $('#searchElementTypes').val();

        await setSettings(s);
    });
}
