import { test, expect } from '@playwright/test';
import { gotoHydrated, skipUnlessRust } from './_rust_test_utils.js';

const fullDiagnostics = process.env.RUST_AI_DIAGNOSTICS_FULL === '1';

test.describe('Rust AI timeout/degradation guardrails', () => {
  skipUnlessRust(test);
  test.skip(!fullDiagnostics, 'Requires ai_diagnostics_full build (set RUST_AI_DIAGNOSTICS_FULL=1).');
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(90_000);

  test('worker cooldown state is visible and can be cleared', async ({ page }) => {
    await page.addInitScript(() => {
      const now = Date.now();
      localStorage.setItem('dmb-webgpu-worker-failure-until', String(now + 5 * 60_000));
      localStorage.setItem('dmb-webgpu-worker-failure-reason', 'forced timeout simulation');
    });

    await gotoHydrated(page, '/ai-diagnostics', { hydrationTimeout: 60_000 });

    await expect(page.getByRole('button', { name: /Clear worker cooldown/i })).toBeVisible();
    await expect(page.getByText(/forced timeout simulation/i)).toBeVisible();
    await expect(page.locator('.card', { hasText: /AI Warnings/i })).toContainText(
      /webgpu_worker_cooldown/i
    );

    await page.evaluate(() => {
      if (typeof window.dmbClearWorkerFailureStatus === 'function') {
        window.dmbClearWorkerFailureStatus();
      }
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /Clear worker cooldown/i })).toHaveCount(0);
  });

  test('manual WebGPU disable path surfaces degraded mode controls', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('dmb-webgpu-disabled', '1');
    });

    await gotoHydrated(page, '/ai-diagnostics', { hydrationTimeout: 60_000 });

    await expect(page.getByRole('button', { name: /Enable WebGPU/i })).toBeVisible();
    await expect(page.locator('li', { hasText: 'WebGPU enabled: no' })).toBeVisible();
  });

  test('diagnostics page remains resilient when WebGPU globals are missing', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(String(error));
    });

    await page.addInitScript(() => {
      window.dmbGetWebgpuTelemetry = undefined;
      window.dmbResetWebgpuTelemetry = undefined;
      window.dmbGetAppleSiliconProfile = undefined;
    });

    await gotoHydrated(page, '/ai-diagnostics', { hydrationTimeout: 60_000 });

    await expect(page.getByRole('heading', { level: 1, name: /AI Diagnostics/i })).toBeVisible();
    await expect(page.getByText(/Runtime telemetry unavailable\./i)).toBeVisible();
    await expect(page.getByText(/Profile unavailable\./i)).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
