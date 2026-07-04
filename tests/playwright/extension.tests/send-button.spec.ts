import { testPageUrl, buttonLocator, toastLocator } from '../constants';
import { test, expect } from '../fixtures';
import { waitForMagnetButtons } from '../helpers';

test('clicking a button with an unconfigured API shows the failure state and an error toast', async ({ page }) => {
  await page.goto(testPageUrl, { waitUntil: 'domcontentloaded' });

  await waitForMagnetButtons(page);

  const button = page.locator(`#link-1 + [data-magnet-linker-container] ${buttonLocator}`);

  await button.click();

  // API host is unset in a fresh profile, so the background call must fail cleanly
  await expect(button).toHaveText('API call failed');
  await expect(button).toHaveClass(/magnet-linker-btn--danger/);

  // error toasts are enabled by default
  await expect(page.locator(`${toastLocator}.magnet-linker-toast--error`)).toHaveCount(1);
});
