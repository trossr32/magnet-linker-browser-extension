/**
 * Options tab: per-site injected-HTML customisations.
 * Renders one editable card per site; fields auto-save on change with a live,
 * escaped preview of the injected markup. Add/delete re-render the grid.
 */

/**
 * Build the escaped injection preview markup for a site.
 * @param {SiteSetting} site
 * @returns {string}
 */
function sitePreviewHtml(site) {
    return `<span class="text-slate-500">${escapeHtml(site.insertBefore)}</span>` +
        `${escapeHtml('<span class="magnet-linker" style="float:')}<span class="text-amber-400">${escapeHtml(site.float)}</span>${escapeHtml('">')}` +
        `${escapeHtml('<button>Send to Transmission</button></span>')}` +
        `<span class="text-slate-500">${escapeHtml(site.insertAfter)}</span>`;
}

/**
 * Build the card markup for a site customisation.
 * @param {SiteSetting} site
 * @returns {string}
 */
function siteCardHtml(site) {
    const floatOptions = ['none', 'left', 'right']
        .map(f => `<option value="${f}" ${site.float === f ? 'selected' : ''}>${f}</option>`)
        .join('');

    return `<div class="rounded-md border border-slate-700 bg-slate-900/50 p-3" data-site-id="${site.id}">
        <div class="flex items-center justify-between gap-2 mb-3">
            <input type="text" data-site-field="name" class="ml-input" placeholder="Name" value="${escapeHtml(site.name)}">
            <button type="button" data-site-delete class="ml-btn ml-btn--danger" title="Delete"><i class="fas fa-trash-can"></i></button>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 mb-3">
            <div>
                <label class="ml-label">URL search</label>
                <input type="text" data-site-field="search" class="ml-input" placeholder="zooqle" value="${escapeHtml(site.search)}">
            </div>
            <div>
                <label class="ml-label">Button float</label>
                <select data-site-field="float" class="ml-input">${floatOptions}</select>
            </div>
        </div>
        <div class="mb-3">
            <label class="ml-label">Insert before</label>
            <textarea data-site-field="insertBefore" rows="2" class="ml-input font-mono text-xs">${escapeHtml(site.insertBefore)}</textarea>
        </div>
        <div class="mb-3">
            <label class="ml-label">Insert after</label>
            <textarea data-site-field="insertAfter" rows="2" class="ml-input font-mono text-xs">${escapeHtml(site.insertAfter)}</textarea>
        </div>
        <div>
            <label class="ml-label">Preview</label>
            <code data-site-preview class="block rounded-md bg-slate-950 border border-slate-800 px-2 py-1.5 text-xxs text-slate-300 break-all">${sitePreviewHtml(site)}</code>
        </div>
    </div>`;
}

/**
 * Render all site cards.
 * @param {Setting} settings
 */
function renderSites(settings) {
    const $container = $('#sites-container');

    $container.empty();

    settings.sites.forEach(function (site) {
        $container.append(siteCardHtml(site));
    });

    $('#sites-empty').toggleClass('hidden', settings.sites.length > 0);
}

/**
 * Read a site object back out of its card.
 * @param {JQuery} $card
 * @returns {SiteSetting}
 */
function siteFromCard($card) {
    return {
        id: parseInt($card.attr('data-site-id'), 10),
        name: $card.find('[data-site-field="name"]').val(),
        search: $card.find('[data-site-field="search"]').val(),
        float: $card.find('[data-site-field="float"]').val(),
        insertBefore: $card.find('[data-site-field="insertBefore"]').val(),
        insertAfter: $card.find('[data-site-field="insertAfter"]').val()
    };
}

/**
 * Build the site customisation tab.
 * @param {Setting} settings
 */
async function initSitesTab(settings) {
    renderSites(settings);

    $('#addSite').on('click', async function () {
        const s = await getSettings();
        const nextId = s.sites.reduce((max, site) => Math.max(max, parseInt(site.id, 10) || 0), 0) + 1;

        s.sites.push({ id: nextId, name: '', search: '', insertBefore: '', insertAfter: '', float: 'left' });

        await setSettings(s);

        renderSites(s);
    });

    $('#sites-container').on('keyup blur change', '[data-site-field]', async function () {
        const $card = $(this).closest('[data-site-id]');
        const site = siteFromCard($card);
        const s = await getSettings();

        s.sites = s.sites.map(existing => parseInt(existing.id, 10) === site.id ? site : existing);

        await setSettings(s);

        $card.find('[data-site-preview]').html(sitePreviewHtml(site));
    });

    $('#sites-container').on('click', '[data-site-delete]', async function () {
        const $card = $(this).closest('[data-site-id]');
        const id = parseInt($card.attr('data-site-id'), 10);
        const s = await getSettings();

        s.sites = s.sites.filter(site => parseInt(site.id, 10) !== id);

        await setSettings(s);

        renderSites(s);
    });
}
