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
            return Boolean(reg);
          }),
        { timeout: 15_000 }
      )
      .toBe(true);

    const registrationSnapshot = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        return null;
      }
      return {
        scope: reg.scope || null,
        hasWorkerRef: Boolean(reg.active || reg.installing || reg.waiting),
      };
    });

    expect(registrationSnapshot).not.toBeNull();
    expect(typeof registrationSnapshot.scope).toBe('string');
    expect(registrationSnapshot.scope.length).toBeGreaterThan(0);

    // Some engines expose registration without fully supporting update semantics.
    // In smoke mode, treat InvalidStateError update failures as non-fatal engine variance.
    const updateCheck = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg || typeof reg.update !== 'function') {
        return { updateSupported: false, ok: true, tolerated: true };
      }
      try {
        await reg.update();
        return { updateSupported: true, ok: true, tolerated: true };
      } catch (error) {
        const message = String(error);
        const tolerated =
          /InvalidStateError/i.test(message) ||
          /newestWorker is null/i.test(message);
        return { updateSupported: true, ok: tolerated, tolerated, error: message };
      }
    });

    if (updateCheck.updateSupported) {
      expect(updateCheck.ok, updateCheck.error || 'service worker update check failed').toBe(true);
    }
  });
});
