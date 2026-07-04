import { testPageUrl, buttonLocator } from '../constants';
import { test, expect } from '../fixtures';
import { waitForMagnetButtons } from '../helpers';

test('injects a button for every magnet link element (href and code)', async ({ page }) => {
  await page.goto(testPageUrl, { waitUntil: 'domcontentloaded' });

  await waitForMagnetButtons(page);

  // 3 anchors (incl. one duplicate magnet on a separate element) + 1 code element
  await expect(page.locator(buttonLocator)).toHaveCount(4);

  await expect(page.locator(`#link-1 + [data-magnet-linker-container] ${buttonLocator}`)).toHaveText('Send to Transmission');
  await expect(page.locator(`#code-1 + [data-magnet-linker-container] ${buttonLocator}`)).toHaveText('Send to Transmission');
});

test('buttons carry the magnet uri stripped of tracker params', async ({ page }) => {
  await page.goto(testPageUrl, { waitUntil: 'domcontentloaded' });

  await waitForMagnetButtons(page);

  await expect(page.locator(`#link-1 + [data-magnet-linker-container] ${buttonLocator}`))
    .toHaveAttribute('data-magnet', 'magnet:?xt=urn:btih:59066769b9ad42da2e508611c33d7c4480b3857b');
});

test('SPA navigation injects buttons for new magnets without duplicating existing ones', async ({ page }) => {
  await page.goto(testPageUrl, { waitUntil: 'domcontentloaded' });

  await waitForMagnetButtons(page);

  await expect(page.locator(buttonLocator)).toHaveCount(4);

  // adds a magnet link and pushState-changes the url; the content script polls for url changes
  await page.click('#add-magnet');

  await expect(page.locator(`#link-spa + [data-magnet-linker-container] ${buttonLocator}`)).toHaveCount(1);

  // existing elements must not gain a second button
  await expect(page.locator(buttonLocator)).toHaveCount(5);
});
