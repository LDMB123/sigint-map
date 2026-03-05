import { test, expect } from '@playwright/test';
import {
  gotoHydrated,
  offlineStatusRow,
  skipUnlessRust,
  waitForOfflineImportCompletion,
} from './_rust_test_utils.js';

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
    await waitForOfflineImportCompletion(page, { timeout: 170_000 });
  });
});
