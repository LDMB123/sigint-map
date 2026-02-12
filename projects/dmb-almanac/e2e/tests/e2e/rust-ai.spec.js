import { test, expect } from '@playwright/test';

const isRustE2E = process.env.RUST_E2E === 'true' || process.env.RUST_E2E === '1';

test.describe('Rust AI pages', () => {
    test.skip(!isRustE2E, 'Set RUST_E2E=1 and BASE_URL to the Rust server.');

    async function waitForHydration(page) {
        await page.waitForFunction(() => window.__DMB_HYDRATED === true);
    }

    test('AI diagnostics page renders', async ({ page }) => {
        await page.goto('/ai-diagnostics');
        await page.waitForLoadState('load');
        await waitForHydration(page);

        await expect(page.getByRole('heading', { level: 1, name: /AI Diagnostics/i })).toBeVisible();
        await expect(page.getByRole('heading', { level: 2, name: /Capabilities/i })).toBeVisible();
        await expect(page.getByRole('heading', { level: 2, name: /ANN Index/i })).toBeVisible();
        await expect(page.getByRole('heading', { level: 2, name: /IVF Tuning/i })).toBeVisible();
    });

    test('AI benchmark page renders', async ({ page }) => {
        await page.goto('/ai-benchmark');
        await page.waitForLoadState('load');
        await waitForHydration(page);

        await expect(page.getByRole('heading', { level: 1, name: /AI Benchmark/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Run Benchmarks/i })).toBeVisible();
        await expect(page.getByRole('heading', { level: 2, name: /Full Matrix/i })).toBeVisible();
        await expect(page.getByRole('heading', { level: 2, name: /IVF Subset/i })).toBeVisible();
    });

    test('AI warmup page renders', async ({ page }) => {
        await page.goto('/ai-warmup');
        await page.waitForLoadState('load');
        await waitForHydration(page);

        await expect(page.getByRole('heading', { level: 1, name: /AI Warmup/i })).toBeVisible();
    });

    test('hydratable with seeded PWA localStorage keys', async ({ page }) => {
        await page.addInitScript(() => {
            const now = Date.now();
            localStorage.setItem('pwa_sw_version', 'test-sw');
            localStorage.setItem('pwa_sw_activated_at', String(now - 60_000));
            localStorage.setItem('pwa_update_checked_at', String(now - 120_000));
            localStorage.setItem('pwa_update_dismissed_at', String(now - 1_000));
            localStorage.setItem('dmb-ai-config-version', 'test-ai-config');
            localStorage.setItem('dmb-ai-config-generated-at', '2026-02-01T00:00:00Z');
            localStorage.setItem('dmb-embedding-sample', '1');
        });

        await page.goto('/ai-diagnostics');
        await waitForHydration(page);
        await expect(page.getByRole('heading', { level: 1, name: /AI Diagnostics/i })).toBeVisible();
    });
});
