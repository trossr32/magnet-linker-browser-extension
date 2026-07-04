const { extractMagnetUris } = require('../../src/content/js/core.js');

const hash1 = '59066769b9ad42da2e508611c33d7c4480b3857b';
const hash2 = '4344503b7e797ebf31582327a5baae35b11bda01';

describe('extractMagnetUris', () => {
    test('extracts a magnet uri from an href-style value with trackers', () => {
        const href = `magnet:?xt=urn:btih:${hash1}&dn=ubuntu-17.04-desktop-amd64.iso&tr=udp%3A%2F%2Ftracker.example%3A6969`;

        expect(extractMagnetUris(href)).toEqual([`magnet:?xt=urn:btih:${hash1}`]);
    });

    test('extracts a magnet uri written out as text', () => {
        const text = `Here you go: magnet:?xt=urn:btih:${hash1} enjoy!`;

        expect(extractMagnetUris(text)).toEqual([`magnet:?xt=urn:btih:${hash1}`]);
    });

    test('extracts multiple distinct magnet uris', () => {
        const text = `magnet:?xt=urn:btih:${hash1} and magnet:?xt=urn:btih:${hash2}`;

        expect(extractMagnetUris(text)).toEqual([
            `magnet:?xt=urn:btih:${hash1}`,
            `magnet:?xt=urn:btih:${hash2}`
        ]);
    });

    test('deduplicates repeated magnet uris', () => {
        const text = `magnet:?xt=urn:btih:${hash1} magnet:?xt=urn:btih:${hash1}`;

        expect(extractMagnetUris(text)).toHaveLength(1);
    });

    test.each`
        input                          | description
        ${''}                          | ${'empty string'}
        ${null}                        | ${'null'}
        ${undefined}                   | ${'undefined'}
        ${'no magnets here'}           | ${'plain text'}
        ${'magnet:?xt=urn:sha1:abc'}   | ${'non-btih magnet'}
    `('returns [] for $description', ({ input }) => {
        expect(extractMagnetUris(input)).toEqual([]);
    });

    test('is not tripped up by global-regex lastIndex state across calls', () => {
        const text = `magnet:?xt=urn:btih:${hash1}`;

        expect(extractMagnetUris(text)).toHaveLength(1);
        expect(extractMagnetUris(text)).toHaveLength(1);
        expect(extractMagnetUris(text)).toHaveLength(1);
    });
});
