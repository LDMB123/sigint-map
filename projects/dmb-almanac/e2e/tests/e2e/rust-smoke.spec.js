import { test, expect } from '@playwright/test';
import { gotoHydrated, skipUnlessRust } from './_rust_test_utils.js';

test.describe('Rust smoke', () => {
  skipUnlessRust(test);

  test('home page renders', async ({ page }) => {
    await gotoHydrated(page, '/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('search page renders', async ({ page }) => {
    await gotoHydrated(page, '/search');
    await expect(page.getByRole('heading', { level: 1, name: /Search/i })).toBeVisible();
    await expect(page.locator('input[type="search"]')).toBeVisible();
  });

  test('show detail page renders', async ({ page }) => {
    await gotoHydrated(page, '/shows/1');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /Copy link/i })).toBeVisible();
  });

  test('my shows input prefills from query string', async ({ page }) => {
    await gotoHydrated(page, '/my-shows?showId=41');
    await expect(page.getByRole('heading', { level: 1, name: /My Shows/i })).toBeVisible();
    await expect(page.locator('.inline-form input[type="number"]')).toHaveValue('41');
  });

  test('release detail page renders and resolves tracks state', async ({ page }) => {
    await gotoHydrated(
      page,
      '/releases/live-trax-vol-63-76127712-alpine-valley-music-theatre-east-troy-wi'
    );
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
