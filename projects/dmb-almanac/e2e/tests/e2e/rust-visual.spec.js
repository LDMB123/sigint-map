import { test, expect } from '@playwright/test';
import { gotoHydrated, skipUnlessRust } from './_rust_test_utils.js';

test.describe('Rust visual regression', () => {
  skipUnlessRust(test);

  async function waitForStableHomePage(page) {
    await page.waitForFunction(() => {
      const statsCards = document.querySelectorAll('.stats-grid .stat-card').length;
      const statsFallback = document.querySelector('.stats-grid .muted');
      return statsCards > 0 || Boolean(statsFallback);
    });
  }

  async function waitForStableSearchPage(page) {
    const searchInput = page.locator('input[type="search"]');
    await searchInput.waitFor({ state: 'visible' });
    await searchInput.fill('');
    await page.waitForFunction(() => {
      const statusTitle = document.querySelector('.status-title')?.textContent || '';
      const hasResults = Boolean(document.querySelector('.result-list'));
      return !hasResults && /Start typing/i.test(statusTitle);
    });
    await expect(page.locator('.page h1')).toContainText('Search');
  }

  async function waitForStableShowDetailPage(page) {
    await page.waitForFunction(() => {
      const hasDetailGrid = Boolean(document.querySelector('.detail-grid'));
      const statusTitle = document.querySelector('.status-title')?.textContent || '';
      return hasDetailGrid || /Show not found|Setlist unavailable/i.test(statusTitle);
    });
    await expect(page.locator('.page h1')).toBeVisible();
  }

  async function stabilizeVisualFrame(page) {
    await page.addStyleTag({
      content: `
        .pwa-status { display: none !important; }
        .pwa-status__row--update { animation: none !important; }
      `
    });
  }

  async function expectPageSnapshot(page, name) {
    await stabilizeVisualFrame(page);
    await expect(page.locator('.page')).toHaveScreenshot(name, {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      maxDiffPixels: 30
    });
  }

  test('home page visual', async ({ page }) => {
    await gotoHydrated(page, '/');
    await waitForStableHomePage(page);
    await expectPageSnapshot(page, 'home-page.png');
  });

  test('search page visual', async ({ page }) => {
    await gotoHydrated(page, '/search');
    await waitForStableSearchPage(page);
    await expectPageSnapshot(page, 'search-page.png');
  });

  test('show detail visual', async ({ page }) => {
    await gotoHydrated(page, '/shows/5015');
    await waitForStableShowDetailPage(page);
    await expectPageSnapshot(page, 'show-detail-page.png');
  });
});
