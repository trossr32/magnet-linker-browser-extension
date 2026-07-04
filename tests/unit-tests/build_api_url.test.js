const { buildApiUrl } = require('../../src/content/js/core.js');

describe('buildApiUrl', () => {
    test('replaces host and port tokens', () => {
        const url = buildApiUrl({
            host: '192.168.0.10',
            port: '9091',
            username: '',
            password: '',
            uriFormat: 'http://[host]:[port]/transmission/rpc'
        });

        expect(url).toBe('http://192.168.0.10:9091/transmission/rpc');
    });

    test('still supports legacy formats containing username/password tokens', () => {
        const url = buildApiUrl({
            host: 'nas',
            port: '9091',
            username: 'rob',
            password: 'pw',
            uriFormat: 'http://[username]:[password]@[host]:[port]/transmission/rpc'
        });

        expect(url).toBe('http://rob:pw@nas:9091/transmission/rpc');
    });

    test('wraps substituted values when wrapFields is provided', () => {
        const url = buildApiUrl(
            { host: 'nas', port: '9091', username: '', password: '', uriFormat: 'http://[host]:[port]/rpc' },
            { start: '<b>', end: '</b>' }
        );

        expect(url).toBe('http://<b>nas</b>:<b>9091</b>/rpc');
    });

    test('returns an empty string for a missing format', () => {
        expect(buildApiUrl({ host: 'nas', port: '9091', username: '', password: '', uriFormat: '' })).toBe('');
    });
});
