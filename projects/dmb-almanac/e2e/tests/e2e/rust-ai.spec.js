import { test, expect } from '@playwright/test';
import { gotoHydrated, skipUnlessRust } from './_rust_test_utils.js';

const fullDiagnostics = process.env.RUST_AI_DIAGNOSTICS_FULL === '1';

test.describe('Rust AI pages', () => {
    skipUnlessRust(test);
    test.skip(!fullDiagnostics, 'Requires ai_diagnostics_full build (set RUST_AI_DIAGNOSTICS_FULL=1).');
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(90_000);

    test('AI diagnostics page renders', async ({ page }) => {
        await gotoHydrated(page, '/ai-diagnostics', { hydrationTimeout: 60_000 });
        await page.waitForFunction(() => {
            const text = document.body.textContent || '';
            return /Capabilities/i.test(text) && /ANN Index/i.test(text) && /IVF Tuning/i.test(text);
        });

        await expect(page.getByRole('heading', { level: 1, name: /AI Diagnostics/i })).toBeVisible();
        await expect(page.getByRole('heading', { level: 2, name: /Capabilities/i })).toBeVisible();
        await expect(page.getByRole('heading', { level: 2, name: /ANN Index/i })).toBeVisible();
        await expect(page.getByRole('heading', { level: 2, name: /IVF Tuning/i })).toBeVisible({
            timeout: 15000
        });
    });

    test('AI benchmark page renders', async ({ page }) => {
        await gotoHydrated(page, '/ai-benchmark');

        await expect(page.getByRole('heading', { level: 1, name: /AI Benchmark/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Run Benchmarks/i })).toBeVisible();
        await expect(page.getByRole('heading', { level: 2, name: /Full Matrix/i })).toBeVisible();
        await expect(page.getByRole('heading', { level: 2, name: /IVF Subset/i })).toBeVisible();
    });

    test('AI warmup page renders', async ({ page }) => {
        await gotoHydrated(page, '/ai-warmup');

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

        await gotoHydrated(page, '/ai-diagnostics');
        await expect(page.getByRole('heading', { level: 1, name: /AI Diagnostics/i })).toBeVisible();
    });
});
