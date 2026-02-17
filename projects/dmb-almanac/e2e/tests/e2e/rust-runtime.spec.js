import { test, expect } from '@playwright/test';
import { gotoHydrated, skipUnlessRust } from './_rust_test_utils.js';

test.describe('Rust runtime guardrails', () => {
  skipUnlessRust(test);

  test('cross-origin isolation enables threads', async ({ page }) => {
    await gotoHydrated(page, '/');

    const isolated = await page.evaluate(() => window.crossOriginIsolated);
    expect(isolated).toBe(true);

    await expect(page.locator('.ai-status')).toContainText(/Threads\s+on/i);
    await expect(page.locator('.ai-status__note').filter({ hasText: /Threads disabled/i })).toHaveCount(
      0
    );
  });

  test('offline seed status advances after hydration', async ({ page }) => {
    await gotoHydrated(page, '/');

    const statusRow = page.locator('.pwa-status .pwa-status__row').first();
    await expect(statusRow).toHaveText(
      /Checking previous-version data|Migrated previous-version data|Previous-version migration failed|Importing|Offline data ready|Integrity check failed|Offline manifest missing/i,
      { timeout: 5000 }
    );
  });
});
