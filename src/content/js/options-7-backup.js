/**
 * Options tab: backup and restore.
 * Exports settings + magnet history in a versioned envelope; restores with
 * merge (default) or replace semantics after showing a summary of the file.
 */

const BACKUP_ENVELOPE_TYPE = 'magnet-linker-settings';

let pendingBackup = null;

/**
 * Deep-merge source into target (objects only; arrays and scalars replace).
 * @param {Object} target
 * @param {Object} source
 * @returns {Object} merged copy
 */
function deepMerge(target, source) {
    const output = Object.assign({}, target);

    Object.keys(source || {}).forEach(function (key) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
            output[key] && typeof output[key] === 'object' && !Array.isArray(output[key])) {
            output[key] = deepMerge(output[key], source[key]);
        } else {
            output[key] = source[key];
        }
    });

    return output;
}

/**
 * Build the backup & restore tab.
 */
async function initBackupTab() {
    $('#backupExport').on('click', async function () {
        const envelope = {
            type: BACKUP_ENVELOPE_TYPE,
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            appVersion: browser.runtime.getManifest().version,
            data: {
                settings: await getSettings(),
                magnets: await getMagnets()
            }
        };

        const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const stamp = new Date().toISOString().slice(0, 10);

        const a = document.createElement('a');
        a.href = url;
        a.download = `magnet-linker-settings-${stamp}.json`;
        a.click();

        URL.revokeObjectURL(url);
    });

    $('#backupFile').on('change', function () {
        pendingBackup = null;

        $('#backupApply').prop('disabled', true);
        $('#backupResult').text('');
        $('#backupSummary').addClass('hidden').text('');

        const file = this.files && this.files[0];

        if (!file) {
            return;
        }

        const reader = new FileReader();

        reader.onload = function () {
            let envelope;

            try {
                envelope = JSON.parse(reader.result);
            } catch (e) {
                $('#backupSummary').removeClass('hidden').text('This file is not valid JSON.');
                return;
            }

            if (!envelope || envelope.type !== BACKUP_ENVELOPE_TYPE || !envelope.data) {
                $('#backupSummary').removeClass('hidden').text('This file is not a Magnet Linker settings export.');
                return;
            }

            pendingBackup = envelope;

            const settings = envelope.data.settings || {};
            const magnets = Array.isArray(envelope.data.magnets) ? envelope.data.magnets : [];
            const sites = Array.isArray(settings.sites) ? settings.sites : [];

            $('#backupSummary')
                .removeClass('hidden')
                .text(`Exported ${envelope.exportedAt || 'unknown date'} from version ${envelope.appVersion || 'unknown'}: ` +
                    `${sites.length} site customisation(s), ${magnets.length} stored magnet(s), API host '${settings.api && settings.api.host || ''}'.`);

            $('#backupApply').prop('disabled', false);
        };

        reader.readAsText(file);
    });

    $('#backupApply').on('click', async function () {
        if (!pendingBackup) {
            return;
        }

        const replace = $('#backupReplace').prop('checked');
        const imported = pendingBackup.data.settings || {};
        const importedMagnets = Array.isArray(pendingBackup.data.magnets) ? pendingBackup.data.magnets : [];

        const current = await getSettings();
        const merged = replace ? applySettingsDefaults(imported) : applySettingsDefaults(deepMerge(current, imported));

        await setSettings(merged);

        if (replace) {
            await setMagnets(importedMagnets);
        } else {
            const magnets = await getMagnets();

            await setMagnets(magnets.concat(importedMagnets.filter(m => !magnets.includes(m))));
        }

        browser.runtime.sendMessage({ name: 'settingsChanged' }).catch(function () {});

        $('#backupResult').attr('class', 'text-sm text-emerald-400').text('Restored. Reloading…');

        setTimeout(() => window.location.reload(), 800);
    });

    $('#backupReset').on('click', async function () {
        if (!window.confirm('Reset all settings to defaults? Stored magnets are kept.')) {
            return;
        }

        await resetSettings();

        browser.runtime.sendMessage({ name: 'settingsChanged' }).catch(function () {});

        window.location.reload();
    });
}
