import { test, expect } from '@playwright/test';
import { gotoHydrated, skipUnlessRust } from './_rust_test_utils.js';

test.describe('Rust search flow', () => {
    skipUnlessRust(test, 'Rust E2E disabled (set RUST_E2E=1)');

    async function waitForSearchResponse(page) {
        await page.waitForFunction(() => {
            const hasResults = Boolean(document.querySelector('.result-list'));
            if (hasResults) return true;
            const statusTitle = document.querySelector('.status-title')?.textContent || '';
            return /No results/i.test(statusTitle);
        });
    }

    test('search page loads and accepts input', async ({ page }) => {
        await gotoHydrated(page, '/search');
        await expect(page.getByRole('heading', { name: /Search/i })).toBeVisible();
        const input = page.getByRole('searchbox');
        await input.fill('crash');
        await expect(input).toHaveValue('crash');
    });

    test('offline search still responds', async ({ page, context }) => {
        await gotoHydrated(page, '/search');
        await expect(page.getByRole('heading', { name: /Search/i })).toBeVisible();

        const input = page.locator('.search-input');
        await input.fill('crash');
        await expect(input).toHaveValue('crash');
        await waitForSearchResponse(page);

        try {
            await context.setOffline(true);
            await input.fill('grace');
            await expect(input).toHaveValue('grace');
            await waitForSearchResponse(page);
        } finally {
            await context.setOffline(false);
        }
    });
});
