import { test, expect } from '@playwright/test';
import { gotoHydrated, offlineStatusRow, skipUnlessRust } from './_rust_test_utils.js';

test.describe('Rust offline seed import', () => {
  skipUnlessRust(test);

  test('reaches "Offline data ready" (import does not stall)', async ({ page }) => {
    test.setTimeout(180_000);

    await gotoHydrated(page, '/', {
      gotoOptions: { waitUntil: 'domcontentloaded', timeout: 60_000 },
      hydrationTimeout: 30_000,
    });

    const statusRow = offlineStatusRow(page);
    await expect(statusRow).toBeVisible({ timeout: 15_000 });

    // The UI can report intermediate states while importing. This gate is about
    // ensuring the import actually completes (or fails loudly) rather than
    // silently stalling and leaving partial IndexedDB state around.
    await page.waitForFunction(() => {
      const el = document.querySelector('.pwa-status .pwa-status__row');
      if (!el) return false;
      const text = el.textContent || '';

      if (/offline data ready/i.test(text)) return true;

      // Fail fast on known terminal failures so CI doesn't burn the full timeout.
      if (
        /integrity check failed|offline manifest missing|failed to load|import failed/i.test(text)
      ) {
        throw new Error(`offline seed import failed: ${text}`);
      }

      return false;
    }, { timeout: 170_000 });
  });
});
