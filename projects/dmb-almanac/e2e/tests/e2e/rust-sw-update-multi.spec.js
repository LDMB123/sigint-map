import { test, expect } from '@playwright/test';
import {
  activateWaitingServiceWorker,
  clickCheckForUpdates,
  ensureSwDetailsOpen,
  gotoHydrated,
  registerE2eServiceWorker,
  resetPwaSwLocalState,
  skipUnlessRust,
  waitForHydration,
  waitForStoredSwVersion,
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

    await resetPwaSwLocalState(page);

    await gotoHydrated(page, '/');

    await waitForServiceWorkerController(page);

    // First deploy/update.
    await registerE2eServiceWorker(page, versions[0]);

    await expect.poll(() => swFetchCount, { timeout: 15000 }).toBeGreaterThan(1);
    await clickCheckForUpdates(page, { timeout: 15_000 });

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
    await waitForStoredSwVersion(page, versions[0], { timeout: 60_000 });

    // Second deploy/update. Swap patch version and re-register with a new URL to force an update check.
    phase = 1;
    const swFetchCountBefore = swFetchCount;

    await registerE2eServiceWorker(page, versions[1]);

    await expect.poll(() => swFetchCount, { timeout: 15000 }).toBeGreaterThan(swFetchCountBefore);
    await clickCheckForUpdates(page, { timeout: 15_000 });

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
    await waitForStoredSwVersion(page, versions[1], { timeout: 60_000 });

    await ensureSwDetailsOpen(page);
    await expect(page.getByText(new RegExp(`SW version ${versions[1]}`))).toBeVisible({ timeout: 15000 });
  });
});
