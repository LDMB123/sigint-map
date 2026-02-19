import { test, expect } from '@playwright/test';
import {
  activateWaitingServiceWorker,
  gotoHydrated,
  skipUnlessRust,
  waitForHydration,
  waitForWaitingServiceWorker,
  waitForServiceWorkerController,
} from './_rust_test_utils.js';

test.describe('Rust service worker updates', () => {
  skipUnlessRust(test);

  test('detects and applies an updated sw.js', async ({ page, context }) => {
    test.setTimeout(120_000);

    const patchedVersion = `e2e-${Date.now()}`;
    let swFetchCount = 0;

    await context.route('**/sw.js*', async (route) => {
      const url = route.request().url();
      const response = await route.fetch();
      const body = await response.text();
      swFetchCount += 1;

      // Only patch when our test registers a SW with an explicit `?e2e=` suffix.
      // This avoids interfering with the app's own SW registration (which varies by build).
      if (!url.includes('e2e=')) {
        await route.fulfill({ response, body });
        return;
      }

      const patchedBody = body.replace(
        /const VERSION = '.*?';/,
        `const VERSION = '${patchedVersion}';`
      );
      await route.fulfill({ response, body: patchedBody });
    });

    await page.addInitScript(() => {
      localStorage.removeItem('pwa_update_dismissed_at');
      localStorage.removeItem('pwa_sw_version');
    });

    await gotoHydrated(page, '/');

    await waitForServiceWorkerController(page);

    await page.evaluate(async (suffix) => {
      await navigator.serviceWorker.register(`/sw.js?e2e=${suffix}`, { scope: '/' });
    }, patchedVersion);
    await expect
      .poll(() => swFetchCount, { timeout: 15000 })
      .toBeGreaterThan(1);

    await page.getByRole('button', { name: 'Check for updates' }).click();

    await expect(
      page.locator('.pwa-status__row--update[role="status"]')
    ).toBeVisible({ timeout: 15000 });

    await waitForWaitingServiceWorker(page, { timeout: 15_000 });

    await activateWaitingServiceWorker(page);

    await page.waitForFunction(
      (expected) => navigator.serviceWorker.controller?.scriptURL?.includes(expected),
      patchedVersion,
      { timeout: 15000 }
    );
    await page.reload();
    await page.waitForLoadState('load');
    await waitForHydration(page);

    await page.waitForFunction(
      (expected) => localStorage.getItem('pwa_sw_version') === expected,
      patchedVersion,
      { timeout: 15000 }
    );

    await page.locator('summary', { hasText: 'SW details' }).click();
    await expect(page.getByText(new RegExp(`SW version ${patchedVersion}`))).toBeVisible({
      timeout: 15000,
    });
  });
});
