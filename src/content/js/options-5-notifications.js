/**
 * Options tab: toast notification settings. Toggles auto-save.
 */

/**
 * Build the notifications tab.
 * @param {Setting} settings
 */
async function initNotificationsTab(settings) {
    $('#toggle-toasts-show').prop('checked', settings.notifications.showToasts);
    $('#toggle-toasts-error-show').prop('checked', settings.notifications.showErrorToasts);
    $('#toggle-toasts-success-show').prop('checked', settings.notifications.showSuccessToasts);

    const save = async function () {
        const s = await getSettings();

        s.notifications.showToasts = $('#toggle-toasts-show').prop('checked');
        s.notifications.showErrorToasts = $('#toggle-toasts-error-show').prop('checked');
        s.notifications.showSuccessToasts = $('#toggle-toasts-success-show').prop('checked');

        await setSettings(s);
    };

    initToggle('#toggle-toasts-show', {}, save);
    initToggle('#toggle-toasts-error-show', {}, save);
    initToggle('#toggle-toasts-success-show', {}, save);
}
