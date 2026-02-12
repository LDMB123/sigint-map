import { test, expect } from '@playwright/test';

const useRust = process.env.RUST_E2E === 'true' || process.env.RUST_E2E === '1';

test.describe('Rust PWA offline flow', () => {
    test.skip(!useRust, 'Rust E2E disabled (set RUST_E2E=1)');

    test('offline navigation uses cached pages', async ({ page, context }) => {
        test.setTimeout(90_000);

        // `networkidle` is flaky here due to background fetches (SW update checks, hydration, etc).
        await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await page.waitForLoadState('load');
        await page.waitForFunction(() => window.__DMB_HYDRATED === true);
        await page.evaluate(async () => {
            if (navigator.serviceWorker) {
                await navigator.serviceWorker.ready;
            }
        });

        await page.goto('/shows', { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await expect(page.getByRole('heading', { name: /Shows/i })).toBeVisible({ timeout: 30_000 });
        await page.waitForFunction(() => window.__DMB_HYDRATED === true);

        await context.setOffline(true);
        await page.goto('/shows', { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await expect(page.getByRole('heading', { name: /Shows/i })).toBeVisible({ timeout: 30_000 });

        await page.goto('/offline.html', { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await expect(page.getByRole('heading', { name: /offline/i })).toBeVisible({ timeout: 30_000 });
    });
});
