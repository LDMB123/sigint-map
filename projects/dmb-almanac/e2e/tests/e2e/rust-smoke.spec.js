import { test, expect } from '@playwright/test';

const isRustE2E = process.env.RUST_E2E === 'true' || process.env.RUST_E2E === '1';

test.describe('Rust smoke', () => {
  test.skip(!isRustE2E, 'Set RUST_E2E=1 and BASE_URL to the Rust server.');

  async function waitForHydration(page) {
    await page.waitForFunction(() => window.__DMB_HYDRATED === true);
  }

  test('home page renders', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await waitForHydration(page);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('search page renders', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('load');
    await waitForHydration(page);
    await expect(page.getByRole('heading', { level: 1, name: /Search/i })).toBeVisible();
    await expect(page.locator('input[type="search"]')).toBeVisible();
  });

  test('show detail page renders', async ({ page }) => {
    await page.goto('/shows/1');
    await page.waitForLoadState('load');
    await waitForHydration(page);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('release detail page renders and resolves tracks state', async ({ page }) => {
    await page.goto('/releases/live-trax-vol-63-76127712-alpine-valley-music-theatre-east-troy-wi');
    await page.waitForLoadState('load');
    await waitForHydration(page);
    await expect(page.getByRole('heading', { level: 1, name: /Release/i })).toBeVisible();
    await page.waitForFunction(() => {
      const text = document.body.textContent || '';
      return (
        document.querySelectorAll('.tracklist-item').length > 0 ||
        /No tracks available/i.test(text) ||
        /Tracks unavailable/i.test(text)
      );
    });
  });
});
