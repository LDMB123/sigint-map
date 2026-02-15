import { test, expect } from '@playwright/test';

const isRustE2E = process.env.RUST_E2E === 'true' || process.env.RUST_E2E === '1';

test.describe('Rust visual regression', () => {
  test.skip(!isRustE2E, 'Set RUST_E2E=1 and BASE_URL to the Rust server.');

  async function waitForHydration(page) {
    await page.waitForFunction(() => window.__DMB_HYDRATED === true);
  }

  async function waitForStableHomePage(page) {
    await page.waitForFunction(() => {
      const statsCards = document.querySelectorAll('.stats-grid .stat-card').length;
      const statsFallback = document.querySelector('.stats-grid .muted');
      return statsCards > 0 || Boolean(statsFallback);
    });
  }

  async function waitForStableSearchPage(page) {
    await page.locator('input[type="search"]').waitFor({ state: 'visible' });
    await expect(page.locator('.page h1')).toContainText('Search');
  }

  async function waitForStableShowDetailPage(page) {
    await page.locator('.detail-grid').first().waitFor({ state: 'visible' });
    await expect(page.locator('.page h1')).toBeVisible();
  }

  async function expectPageSnapshot(page, name) {
    await expect(page.locator('.page')).toHaveScreenshot(name, {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      maxDiffPixels: 30
    });
  }

  test('home page visual', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await waitForHydration(page);
    await waitForStableHomePage(page);
    await expectPageSnapshot(page, 'home-page.png');
  });

  test('search page visual', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('load');
    await waitForHydration(page);
    await waitForStableSearchPage(page);
    await expectPageSnapshot(page, 'search-page.png');
  });

  test('show detail visual', async ({ page }) => {
    await page.goto('/shows/1');
    await page.waitForLoadState('load');
    await waitForHydration(page);
    await waitForStableShowDetailPage(page);
    await expectPageSnapshot(page, 'show-detail-page.png');
  });
});
