import { test, expect } from '../fixtures';

test('options page loads, shows the version and auto-saves API settings', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/options.html`);

  await expect(page.locator('[data-version]')).toHaveText(/\d+\.\d+\.\d+/);

  await page.fill('#apiHost', '192.168.0.99');
  await page.fill('#apiPort', '9091');
  await page.locator('#apiPort').blur();

  // auto-save: values survive a reload
  await page.reload();

  await expect(page.locator('#apiHost')).toHaveValue('192.168.0.99');
  await expect(page.locator('#apiPort')).toHaveValue('9091');

  await expect(page.locator('#apiUriPreview')).toContainText('http://192.168.0.99:9091/transmission/rpc');
});

test('storage tab toggles persist', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/options.html`);

  await page.click('[data-tab="storage"]');

  // toggle 'store sent magnets' on via its rendered toggle button
  const toggle = page.locator('#toggle-storage-enabled + .ml-toggle');

  await expect(toggle).toHaveText('Disabled');

  await toggle.click();

  await expect(toggle).toHaveText('Enabled');

  await page.reload();
  await page.click('[data-tab="storage"]');

  await expect(page.locator('#toggle-storage-enabled + .ml-toggle')).toHaveText('Enabled');
});
