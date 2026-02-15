import { test, expect } from '@playwright/test';

const isRustE2E = process.env.RUST_E2E === 'true' || process.env.RUST_E2E === '1';

test.describe('Rust offline seed import', () => {
  test.skip(!isRustE2E, 'Set RUST_E2E=1 and BASE_URL to the Rust server.');

  test('reaches "Offline data ready" (import does not stall)', async ({ page }) => {
    test.setTimeout(180_000);

    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForLoadState('load');
    await page.waitForFunction(() => window.__DMB_HYDRATED === true, { timeout: 30_000 });

    const statusRow = page.locator('.pwa-status .pwa-status__row').first();
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
