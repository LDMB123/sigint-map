import { test, expect } from '@playwright/test';
import {
  activateWaitingServiceWorker,
  gotoHydrated,
  skipUnlessRust,
  waitForHydration,
  waitForWaitingServiceWorker,
  waitForServiceWorkerController,
} from './_rust_test_utils.js';

test.describe('Rust service worker updates (multi deploy)', () => {
  skipUnlessRust(test);

  test('applies two consecutive sw.js updates without looping', async ({ page, context }) => {
    test.setTimeout(120_000);

    const versions = [`e2e-${Date.now()}-v1`, `e2e-${Date.now()}-v2`];
    let swFetchCount = 0;
    let phase = 0;

    await context.route('**/sw.js*', async (route) => {
      const url = route.request().url();
      const response = await route.fetch();
      const body = await response.text();
      swFetchCount += 1;

      // Only patch when our test registers a SW with an explicit `?e2e=` suffix.
      // This avoids relying on whether the app auto-registers `sw.js` (which varies by build).
      if (!url.includes('e2e=')) {
        await route.fulfill({ response, body });
        return;
      }

      const patchedBody = body.replace(/const VERSION = '.*?';/, `const VERSION = '${versions[phase]}';`);
      await route.fulfill({ response, body: patchedBody });
    });

    await page.addInitScript(() => {
      localStorage.removeItem('pwa_update_dismissed_at');
      localStorage.removeItem('pwa_sw_version');
    });

    await gotoHydrated(page, '/');

    await waitForServiceWorkerController(page);

    // First deploy/update.
    await page.evaluate(async (suffix) => {
      await navigator.serviceWorker.register(`/sw.js?e2e=${suffix}`, { scope: '/' });
    }, versions[0]);

    await expect.poll(() => swFetchCount, { timeout: 15000 }).toBeGreaterThan(1);
    await page.getByRole('button', { name: 'Check for updates' }).click();

    await expect(page.locator('.pwa-status__row--update[role="status"]')).toBeVisible({ timeout: 15000 });

    await waitForWaitingServiceWorker(page, { timeout: 30_000 });

    await activateWaitingServiceWorker(page);

    // Wait for activation, then reload to ensure the new controller takes over.
    await page.waitForFunction(
      async (expected) => {
        const reg = await navigator.serviceWorker.getRegistration();
        return reg?.active?.scriptURL?.includes(expected) === true;
      },
      versions[0],
      { timeout: 60_000 }
    );
    await page.reload();
    await page.waitForLoadState('load');
    await waitForHydration(page);
    await page.waitForFunction((expected) => localStorage.getItem('pwa_sw_version') === expected, versions[0], {
      timeout: 60_000,
    });

    // Second deploy/update. Swap patch version and re-register with a new URL to force an update check.
    phase = 1;
    const swFetchCountBefore = swFetchCount;

    await page.evaluate(async (suffix) => {
      await navigator.serviceWorker.register(`/sw.js?e2e=${suffix}`, { scope: '/' });
    }, versions[1]);

    await expect.poll(() => swFetchCount, { timeout: 15000 }).toBeGreaterThan(swFetchCountBefore);
    await page.getByRole('button', { name: 'Check for updates' }).click();

    await expect(page.locator('.pwa-status__row--update[role="status"]')).toBeVisible({ timeout: 15000 });

    await waitForWaitingServiceWorker(page, { timeout: 30_000 });

    await activateWaitingServiceWorker(page);

    await page.waitForFunction(
      async (expected) => {
        const reg = await navigator.serviceWorker.getRegistration();
        return reg?.active?.scriptURL?.includes(expected) === true;
      },
      versions[1],
      { timeout: 60_000 }
    );
    await page.reload();
    await page.waitForLoadState('load');
    await waitForHydration(page);
    await page.waitForFunction((expected) => localStorage.getItem('pwa_sw_version') === expected, versions[1], {
      timeout: 60_000,
    });

    await page.locator('summary', { hasText: 'SW details' }).click();
    await expect(page.getByText(new RegExp(`SW version ${versions[1]}`))).toBeVisible({ timeout: 15000 });
  });
});
