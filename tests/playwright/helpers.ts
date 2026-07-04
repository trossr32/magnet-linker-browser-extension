import { type Page } from '@playwright/test';
import { buttonLocator } from './constants';

/**
 * Wait for the extension to inject at least one magnet button, reloading the
 * page if the first injection was missed (the MV3 service worker registers the
 * content scripts asynchronously on a fresh profile, so the very first
 * navigation can race the registration).
 */
export async function waitForMagnetButtons(
  page: Page,
  opts: { timeoutMs?: number; reloads?: number } = {}
): Promise<void> {
  const timeoutMs = opts.timeoutMs ?? 10000;
  const reloads = opts.reloads ?? 2;

  for (let attempt = 0; attempt <= reloads; attempt++) {
    try {
      await page.waitForSelector(buttonLocator, { state: 'attached', timeout: timeoutMs });
      return;
    } catch {
      if (attempt === reloads) {
        throw new Error(`Magnet buttons were not injected after ${reloads} reload(s)`);
      }
      await page.reload({ waitUntil: 'domcontentloaded' });
    }
  }
}
