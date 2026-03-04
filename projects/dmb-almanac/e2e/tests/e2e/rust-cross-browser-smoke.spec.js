import { test, expect } from '@playwright/test';
import { gotoHydrated, skipUnlessRust } from './_rust_test_utils.js';

test.describe('Rust cross-browser smoke', () => {
  skipUnlessRust(test);

  test('hydrates and renders core pages', async ({ page }) => {
    await gotoHydrated(page, '/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await gotoHydrated(page, '/search');
    await expect(page.getByRole('heading', { level: 1, name: /Search/i })).toBeVisible();
    await expect(page.locator('input[type="search"]')).toBeVisible();

    await gotoHydrated(page, '/offline');
    await expect(page.getByRole('heading', { level: 1, name: /Offline/i })).toBeVisible();
  });

  test('registers service worker where supported', async ({ page }) => {
    await gotoHydrated(page, '/');

    const swSupported = await page.evaluate(() => 'serviceWorker' in navigator);
    test.skip(!swSupported, 'Service workers are not supported in this browser runtime');

    await expect
      .poll(
        async () =>
          page.evaluate(async () => {
            const reg = await navigator.serviceWorker.getRegistration();
            return !!reg;
          }),
        { timeout: 15_000 }
      )
      .toBeTruthy();

    // Some engines expose registration without fully supporting update semantics.
    const updateCheck = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg || typeof reg.update !== 'function') {
        return { updateSupported: false, ok: true };
      }
      try {
        await reg.update();
        return { updateSupported: true, ok: true };
      } catch (error) {
        return { updateSupported: true, ok: false, error: String(error) };
      }
    });

    if (updateCheck.updateSupported) {
      expect(updateCheck.ok, updateCheck.error || 'service worker update check failed').toBe(true);
    }
  });
});
