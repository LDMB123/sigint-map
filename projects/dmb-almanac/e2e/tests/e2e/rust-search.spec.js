import { test, expect } from '@playwright/test';

const useRust = process.env.RUST_E2E === 'true' || process.env.RUST_E2E === '1';

test.describe('Rust search flow', () => {
    test.skip(!useRust, 'Rust E2E disabled (set RUST_E2E=1)');

    test('search page loads and accepts input', async ({ page }) => {
        await page.goto('/search');
        await expect(page.getByRole('heading', { name: /Search/i })).toBeVisible();
        await page.waitForFunction(() => window.__DMB_HYDRATED === true);
        const input = page.getByRole('searchbox');
        await input.fill('crash');
        await expect(input).toHaveValue('crash');
    });

    test('offline search still responds', async ({ page, context }) => {
        await page.goto('/search');
        await expect(page.getByRole('heading', { name: /Search/i })).toBeVisible();
        await page.waitForFunction(() => window.__DMB_HYDRATED === true);

        const input = page.locator('.search-input');
        await input.fill('crash');
        await page.waitForFunction(() => {
            return !!document.querySelector('.result-list') || /No results yet/i.test(document.body.innerText);
        });

        await context.setOffline(true);
        await input.fill('grace');
        await page.waitForFunction(() => {
            return !!document.querySelector('.result-list') || /No results yet/i.test(document.body.innerText);
        });
    });
});
