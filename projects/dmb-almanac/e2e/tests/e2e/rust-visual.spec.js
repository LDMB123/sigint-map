import { test, expect, devices } from '@playwright/test';
import { gotoHydrated, skipUnlessRust } from './_rust_test_utils.js';

test.describe('Rust visual regression', () => {
  skipUnlessRust(test);
  test.describe.configure({ mode: 'serial', timeout: 240_000 });

  let context;
  let sharedPage;

  test.beforeAll(async ({ browser }) => {
    if (process.env.RUST_E2E !== '1' && process.env.RUST_E2E !== 'true') {
      return;
    }

    context = await browser.newContext({
      ...devices['Desktop Chrome'],
      baseURL: process.env.BASE_URL || 'http://127.0.0.1:3000',
      timezoneId: 'America/New_York',
      serviceWorkers: 'allow'
    });
    sharedPage = await context.newPage();
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
    }
  });

  function pageForTest() {
    if (!sharedPage) {
      throw new Error('Shared page was not initialized.');
    }
    return sharedPage;
  }

  async function waitForOfflineDataReady(page, timeout = 210_000) {
    await expect(
      page.locator('.pwa-status .pwa-status__row', { hasText: /Offline data ready/i }).first()
    ).toBeVisible({ timeout });
  }

  async function waitForStableHomePage(page) {
    await page.waitForFunction(
      () => {
        const root = document.querySelector('.page');
        if (!root) return false;

        const hasStatsCards = root.querySelectorAll('.stats-grid .stat-card').length > 0;
        const hasUnavailableState = /stats unavailable/i.test(root.textContent || '');
        return hasStatsCards || hasUnavailableState;
      },
      { timeout: 120_000 }
    );
    await expect(page.locator('.page h1')).toContainText('DMB Almanac');
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
    await page.waitForFunction(
      () => {
        const detailPage = document.querySelector('.page');
        if (!detailPage) return false;

        const heading = detailPage.querySelector('h1')?.textContent || '';
        if (!/show details/i.test(heading)) return false;

        const text = detailPage.textContent || '';
        if (/show details are still loading/i.test(text)) return false;
        if (/show not found/i.test(text)) return false;

        const detailGrid = detailPage.querySelector('.detail-grid');
        if (!detailGrid) return false;

        const gridText = (detailGrid.textContent || '').replace(/\s+/g, ' ');
        const requiredRows = ['Date', 'Venue', 'Tour', 'Year', 'Songs', 'Rarity Index'];
        return requiredRows.every((label) => gridText.includes(label));
      },
      { timeout: 180_000 }
    );
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

  test('home page visual', async () => {
    const page = pageForTest();
    await gotoHydrated(page, '/');
    await waitForOfflineDataReady(page);
    await waitForStableHomePage(page);
    await expectPageSnapshot(page, 'home-page.png');
  });

  test('search page visual', async () => {
    const page = pageForTest();
    await gotoHydrated(page, '/search');
    await waitForStableSearchPage(page);
    await expectPageSnapshot(page, 'search-page.png');
  });

  test('show detail visual', async () => {
    const page = pageForTest();
    await gotoHydrated(page, '/shows/5015');
    await waitForOfflineDataReady(page);
    await waitForStableShowDetailPage(page);
    await expectPageSnapshot(page, 'show-detail-page.png');
  });
});
