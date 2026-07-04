const { findSiteCustomisation } = require('../../src/content/js/core.js');

const sites = [
    { id: 1, name: 'Zooqle', search: 'zooqle', insertBefore: '', insertAfter: '', float: 'none' },
    { id: 2, name: 'Reddit', search: 'reddit', insertBefore: '<br>', insertAfter: '', float: 'left' },
    { id: 3, name: 'Empty search', search: '', insertBefore: '', insertAfter: '', float: 'left' }
];

describe('findSiteCustomisation', () => {
    test('matches a hostname containing the search value', () => {
        expect(findSiteCustomisation(sites, 'www.zooqle.com').name).toBe('Zooqle');
    });

    test('matches case-insensitively in both directions', () => {
        expect(findSiteCustomisation(sites, 'WWW.REDDIT.COM').name).toBe('Reddit');
        expect(findSiteCustomisation([{ id: 1, name: 'X', search: 'RedDit', insertBefore: '', insertAfter: '', float: 'left' }], 'old.reddit.com').name).toBe('X');
    });

    test('ignores sites with an empty search value', () => {
        expect(findSiteCustomisation(sites, 'example.com')).toBeNull();
    });

    test('returns null for no match, empty list or missing list', () => {
        expect(findSiteCustomisation(sites, 'example.org')).toBeNull();
        expect(findSiteCustomisation([], 'zooqle.com')).toBeNull();
        expect(findSiteCustomisation(undefined, 'zooqle.com')).toBeNull();
    });

    test('last match wins when multiple sites match (v2 behaviour)', () => {
        const overlapping = [
            { id: 1, name: 'First', search: 'tracker', insertBefore: '', insertAfter: '', float: 'left' },
            { id: 2, name: 'Second', search: 'tracker.example', insertBefore: '', insertAfter: '', float: 'left' }
        ];

        expect(findSiteCustomisation(overlapping, 'tracker.example.com').name).toBe('Second');
    });
});
