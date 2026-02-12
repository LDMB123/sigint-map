import { test, expect } from '@playwright/test';

const isRustE2E = process.env.RUST_E2E === 'true' || process.env.RUST_E2E === '1';

test.describe('Rust runtime guardrails', () => {
  test.skip(!isRustE2E, 'Set RUST_E2E=1 and BASE_URL to the Rust server.');

  async function waitForHydration(page) {
    await page.waitForFunction(() => window.__DMB_HYDRATED === true);
  }

  test('cross-origin isolation enables threads', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await waitForHydration(page);

    const isolated = await page.evaluate(() => window.crossOriginIsolated);
    expect(isolated).toBe(true);

    await expect(page.locator('.ai-status')).toContainText(/Threads\s+on/i);
    await expect(page.locator('.ai-status__note').filter({ hasText: /Threads disabled/i })).toHaveCount(
      0
    );
  });

  test('offline seed status advances after hydration', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await waitForHydration(page);

    const statusRow = page.locator('.pwa-status .pwa-status__row').first();
    await expect(statusRow).toHaveText(
      /Checking previous-version data|Migrated previous-version data|Previous-version migration failed|Importing|Offline data ready|Integrity check failed|Offline manifest missing/i,
      { timeout: 5000 }
    );
  });
});
