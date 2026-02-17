import { test, expect } from '@playwright/test';
import { gotoHydrated, skipUnlessRust } from './_rust_test_utils.js';

test.describe('Rust PWA offline flow', () => {
    skipUnlessRust(test, 'Rust E2E disabled (set RUST_E2E=1)');

    test('offline navigation uses cached pages', async ({ page, context }) => {
        test.setTimeout(90_000);

        // `networkidle` is flaky here due to background fetches (SW update checks, hydration, etc).
        await gotoHydrated(page, '/', {
            gotoOptions: { waitUntil: 'domcontentloaded', timeout: 60_000 },
        });
        await page.evaluate(async () => {
            if (navigator.serviceWorker) {
                await navigator.serviceWorker.ready;
            }
        });

        await gotoHydrated(page, '/shows', {
            gotoOptions: { waitUntil: 'domcontentloaded', timeout: 60_000 },
        });
        await expect(page.getByRole('heading', { name: /Shows/i })).toBeVisible({ timeout: 30_000 });

        await context.setOffline(true);
        await page.goto('/shows', { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await expect(page.getByRole('heading', { name: /Shows/i })).toBeVisible({ timeout: 30_000 });

        await page.goto('/offline.html', { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await expect(page.getByRole('heading', { name: /offline/i })).toBeVisible({ timeout: 30_000 });
    });
});
