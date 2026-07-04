/**
 * Transmission RPC client.
 *
 * Runs only in the background (MV2 event page / MV3 service worker) so requests
 * are never blocked as mixed content when triggered from an https page, and so
 * credentials never touch content-script contexts. Uses fetch with a Basic
 * Authorization header (v2 embedded credentials in the url) and handles the
 * X-Transmission-Session-Id 409 handshake.
 *
 * Requires core.js (getSettings, buildApiUrl, log).
 */

let transmissionSessionId = null;

/**
 * POST a payload to the transmission RPC endpoint.
 * @param {Object} payload - RPC body, e.g. { method: 'torrent-add', arguments: {...} }
 * @param {boolean} [isRetry] - true when retrying after a 409 session-id refresh
 * @returns {Promise<ApiResponse>}
 */
async function callTransmissionApi(payload, isRetry = false) {
    const settings = await getSettings();
    const uri = buildApiUrl(settings.api);

    log(['[transmission.js] callTransmissionApi', payload.method, uri]);

    const headers = { 'Content-Type': 'application/json' };

    if (transmissionSessionId) {
        headers['X-Transmission-Session-Id'] = transmissionSessionId;
    }

    if (settings.api.username) {
        headers.Authorization = 'Basic ' + btoa(`${settings.api.username}:${settings.api.password}`);
    }

    let httpResponse;

    try {
        httpResponse = await fetch(uri, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });
    } catch (e) {
        log(['[transmission.js] fetch failed', e], 'error');

        return {
            success: false,
            uri: uri,
            message: 'Could not reach the Transmission API. Check the API settings, that Transmission is running, and that site access has been granted on the options page.',
            exception: e.message
        };
    }

    if (httpResponse.status === 409) {
        transmissionSessionId = httpResponse.headers.get('X-Transmission-Session-Id');

        if (isRetry || !transmissionSessionId) {
            return { success: false, uri: uri, message: 'Transmission session handshake failed (409).' };
        }

        return callTransmissionApi(payload, true);
    }

    if (httpResponse.status === 401) {
        return { success: false, uri: uri, message: 'Transmission rejected the configured credentials (401).' };
    }

    if (!httpResponse.ok) {
        return { success: false, uri: uri, message: `Unexpected response from Transmission (${httpResponse.status}).` };
    }

    let jsonResponse;

    try {
        jsonResponse = await httpResponse.json();
    } catch (e) {
        return { success: false, uri: uri, message: 'Transmission returned an unreadable response.', exception: e.message };
    }

    if (String(jsonResponse.result).toLowerCase() !== 'success') {
        return { success: false, uri: uri, jsonResponse: jsonResponse, message: `Transmission error: ${jsonResponse.result}` };
    }

    return { success: true, uri: uri, jsonResponse: jsonResponse };
}

/**
 * Add a torrent to transmission.
 * @param {string} magnet - magnet link to add
 * @returns {Promise<ApiResponse>}
 */
async function addTorrent(magnet) {
    log('[transmission.js] addTorrent');

    const response = await callTransmissionApi({
        method: 'torrent-add',
        arguments: { filename: magnet },
        tag: 8
    });

    if (response.success) {
        const args = response.jsonResponse.arguments || {};

        if (args['torrent-duplicate']) {
            response.message = `Torrent already added: "${args['torrent-duplicate'].name}"`;
        } else if (args['torrent-added']) {
            response.message = `Torrent sent successfully: "${args['torrent-added'].name}"`;
        } else {
            response.message = 'Torrent sent successfully';
        }
    }

    return response;
}

/**
 * Get all torrents from transmission.
 * @returns {Promise<ApiResponse>}
 */
async function getTorrents() {
    log('[transmission.js] getTorrents');

    return callTransmissionApi({
        method: 'torrent-get',
        arguments: { fields: ['id', 'name'] },
        tag: 8
    });
}

/**
 * Cheap connectivity/auth check used by the options page Test button.
 * @returns {Promise<ApiResponse>}
 */
async function testConnection() {
    log('[transmission.js] testConnection');

    const response = await callTransmissionApi({ method: 'session-get', tag: 8 });

    if (response.success) {
        const args = response.jsonResponse.arguments || {};

        response.message = args.version ? `Connected to Transmission ${args.version}` : 'Connected to Transmission';
    }

    return response;
}
