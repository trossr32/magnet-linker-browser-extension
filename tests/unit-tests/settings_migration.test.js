const { applySettingsDefaults, settingsNeedMigration, defaultSettings } = require('../../src/content/js/core.js');

describe('applySettingsDefaults', () => {
    test('returns full defaults for undefined input', () => {
        const settings = applySettingsDefaults(undefined);

        expect(settings).toEqual(defaultSettings);
    });

    test('migrates a real v2-shaped settings object to the nested v3 shape', () => {
        // shape as stored by v2.0.1 (flat config keys, credentials in uriFormat, magnets in sync)
        const v2 = {
            api: {
                port: '9091',
                host: '192.168.0.10',
                username: 'rob',
                password: 'hunter2',
                uriFormat: 'http://[username]:[password]@[host]:[port]/transmission/rpc'
            },
            search: {
                attributes: 'href,data-magnet',
                elementTypes: 'code,pre'
            },
            magnets: ['magnet:?xt=urn:btih:59066769b9ad42da2e508611c33d7c4480b3857b'],
            sites: [{ id: 1, name: 'Zooqle', search: 'zooqle', insertBefore: '<br>', insertAfter: '', float: 'none' }],
            enabled: false,
            debug: true,
            storageEnabled: true,
            storageButtonsEnabled: false
        };

        const settings = applySettingsDefaults(v2);

        expect(settings.config).toEqual({ enabled: false, debug: true });
        expect(settings.storage).toEqual({ enabled: true, buttonsEnabled: false });
        expect(settings.api.host).toBe('192.168.0.10');
        expect(settings.api.username).toBe('rob');
        expect(settings.api.uriFormat).toBe('http://[host]:[port]/transmission/rpc');
        expect(settings.search.attributes).toBe('href,data-magnet');
        expect(settings.sites).toHaveLength(1);
        expect(settings.notifications).toEqual(defaultSettings.notifications);
        // magnets move to local storage, never live on settings in v3
        expect(settings.magnets).toBeUndefined();
        // flat v2 keys must not survive
        expect(settings.enabled).toBeUndefined();
        expect(settings.storageEnabled).toBeUndefined();
    });

    test('leaves a v3-shaped object unchanged', () => {
        const v3 = {
            config: { enabled: true, debug: false },
            api: { port: '9091', host: 'nas', username: '', password: '', uriFormat: 'http://[host]:[port]/transmission/rpc' },
            search: { attributes: 'href', elementTypes: 'code' },
            sites: [],
            storage: { enabled: false, buttonsEnabled: true },
            notifications: { showToasts: false, showErrorToasts: true, showSuccessToasts: true }
        };

        expect(applySettingsDefaults(v3)).toEqual(v3);
    });

    test('nested values win over legacy flat values when both exist', () => {
        const mixed = { enabled: true, config: { enabled: false, debug: false } };

        expect(applySettingsDefaults(mixed).config.enabled).toBe(false);
    });

    test('defaults missing branches without touching provided ones', () => {
        const partial = { api: { host: 'nas' } };
        const settings = applySettingsDefaults(partial);

        expect(settings.api.host).toBe('nas');
        expect(settings.api.uriFormat).toBe(defaultSettings.api.uriFormat);
        expect(settings.search).toEqual(defaultSettings.search);
        expect(settings.storage).toEqual(defaultSettings.storage);
    });
});

describe('settingsNeedMigration', () => {
    test.each`
        raw                                                                | expected
        ${undefined}                                                       | ${false}
        ${{}}                                                              | ${false}
        ${{ config: { enabled: true } }}                                   | ${false}
        ${{ enabled: true }}                                               | ${true}
        ${{ storageEnabled: false }}                                       | ${true}
        ${{ magnets: [] }}                                                 | ${false}
        ${{ magnets: ['magnet:?xt=urn:btih:abc'] }}                        | ${true}
        ${{ api: { uriFormat: 'http://[username]:[password]@[host]/x' } }} | ${true}
        ${{ api: { uriFormat: 'http://[host]:[port]/x' } }}                | ${false}
    `('returns $expected for $raw', ({ raw, expected }) => {
        expect(settingsNeedMigration(raw)).toBe(expected);
    });
});
