/**
 * Options tab: debug logging. Toggle auto-saves.
 */

/**
 * Build the debug tab.
 * @param {Setting} settings
 */
async function initDebugTab(settings) {
    $('#toggle-debug').prop('checked', settings.config.debug);

    initToggle('#toggle-debug', {}, async function (checked) {
        const s = await getSettings();

        s.config.debug = checked;

        await setSettings(s);
    });
}
