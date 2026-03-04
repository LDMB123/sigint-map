import { test, expect } from '@playwright/test';
import { gotoHydrated, skipUnlessRust } from './_rust_test_utils.js';

const fullDiagnostics = process.env.RUST_AI_DIAGNOSTICS_FULL === '1';

test.describe('Rust AI diagnostics lite mode', () => {
  skipUnlessRust(test);
  test.skip(fullDiagnostics, 'Lite mode assertions only (unset RUST_AI_DIAGNOSTICS_FULL).');

  test('AI diagnostics routes render production-lite placeholders', async ({ page }) => {
    await gotoHydrated(page, '/ai-diagnostics');
    await expect(page.getByRole('heading', { level: 1, name: /AI Diagnostics/i })).toBeVisible();
    await expect(page.getByText(/Production-lite build/i)).toBeVisible();

    await gotoHydrated(page, '/ai-benchmark');
    await expect(page.getByRole('heading', { level: 1, name: /AI Benchmark/i })).toBeVisible();
    await expect(page.getByText(/Production-lite build/i)).toBeVisible();

    await gotoHydrated(page, '/ai-warmup');
    await expect(page.getByRole('heading', { level: 1, name: /AI Warmup/i })).toBeVisible();
    await expect(page.getByText(/Production-lite build/i)).toBeVisible();

    await gotoHydrated(page, '/ai-smoke');
    await expect(page.getByRole('heading', { level: 1, name: /AI Smoke Test/i })).toBeVisible();
    await expect(page.getByText(/Production-lite build/i)).toBeVisible();
  });
});
