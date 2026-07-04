const { shouldShowToast } = require('../../src/content/js/core.js');

describe('shouldShowToast', () => {
    test.each`
        showToasts | showErrorToasts | showSuccessToasts | theme        | expected
        ${false}   | ${true}         | ${true}           | ${'error'}   | ${false}
        ${false}   | ${true}         | ${true}           | ${'success'} | ${false}
        ${true}    | ${true}         | ${false}          | ${'error'}   | ${true}
        ${true}    | ${false}        | ${true}           | ${'error'}   | ${false}
        ${true}    | ${false}        | ${true}           | ${'success'} | ${true}
        ${true}    | ${true}         | ${false}          | ${'success'} | ${false}
        ${true}    | ${true}         | ${false}          | ${'info'}    | ${false}
        ${true}    | ${false}        | ${true}           | ${'info'}    | ${true}
    `('master=$showToasts error=$showErrorToasts success=$showSuccessToasts theme=$theme -> $expected', ({ showToasts, showErrorToasts, showSuccessToasts, theme, expected }) => {
        expect(shouldShowToast({ showToasts, showErrorToasts, showSuccessToasts }, theme)).toBe(expected);
    });

    test('returns false for missing notification settings', () => {
        expect(shouldShowToast(undefined, 'error')).toBe(false);
        expect(shouldShowToast(null, 'success')).toBe(false);
    });
});
