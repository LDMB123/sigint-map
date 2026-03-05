import { test, expect } from '@playwright/test';
import { skipUnlessRust } from './_rust_test_utils.js';

const fullDiagnostics = process.env.RUST_AI_DIAGNOSTICS_FULL === '1';

async function openAiDiagnostics(page) {
  await page.goto('/ai-diagnostics', { waitUntil: 'domcontentloaded', timeout: 30_000 });
  const productionLite = await page
    .getByText(/Production-lite build:/i)
    .isVisible()
    .catch(() => false);

  let hydrated = false;
  try {
    await page.waitForFunction(() => window.__DMB_HYDRATED === true, undefined, {
      timeout: 20_000,
    });
    hydrated = true;
  } catch {
    hydrated = false;
  }

  return { productionLite, hydrated };
}

test.describe('Rust AI timeout/degradation guardrails', () => {
  skipUnlessRust(test);
  test.skip(!fullDiagnostics, 'Requires ai_diagnostics_full build (set RUST_AI_DIAGNOSTICS_FULL=1).');
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(90_000);

  test('worker cooldown state is visible and can be cleared', async ({ page }) => {
    const { productionLite, hydrated } = await openAiDiagnostics(page);
    test.skip(productionLite, 'Server is running production-lite AI diagnostics UI.');
    test.skip(!hydrated, 'Hydration unavailable for interactive diagnostics checks.');

    await page.evaluate(() => {
      const now = Date.now();
      localStorage.setItem('dmb-webgpu-worker-failure-until', String(now + 5 * 60_000));
      localStorage.setItem('dmb-webgpu-worker-failure-reason', 'forced timeout simulation');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__DMB_HYDRATED === true, undefined, {
      timeout: 20_000,
    });

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
    await page.waitForFunction(
      () =>
        !localStorage.getItem('dmb-webgpu-worker-failure-until') &&
        !localStorage.getItem('dmb-webgpu-worker-failure-reason'),
      undefined,
      { timeout: 10_000 }
    );
  });

  test('manual WebGPU disable path surfaces degraded mode controls', async ({ page }) => {
    const { productionLite, hydrated } = await openAiDiagnostics(page);
    test.skip(productionLite, 'Server is running production-lite AI diagnostics UI.');
    test.skip(!hydrated, 'Hydration unavailable for interactive diagnostics checks.');

    await page.evaluate(() => {
      localStorage.setItem('dmb-webgpu-disabled', '1');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__DMB_HYDRATED === true, undefined, {
      timeout: 20_000,
    });

    await expect(page.getByRole('button', { name: /Enable WebGPU/i })).toBeVisible();
    await expect(page.locator('li', { hasText: 'WebGPU enabled: no' })).toBeVisible();
  });

  test('diagnostics page remains resilient when WebGPU globals are missing', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(String(error));
    });

    await page.route('**/webgpu.js', async (route) => {
      const response = await route.fetch();
      const source = await response.text();
      const patched = `${source}
;window.dmbGetWebgpuTelemetry = undefined;
;window.dmbResetWebgpuTelemetry = undefined;
;window.dmbGetAppleSiliconProfile = undefined;
`;
      await route.fulfill({ response, body: patched });
    });

    const { productionLite, hydrated } = await openAiDiagnostics(page);
    test.skip(productionLite, 'Server is running production-lite AI diagnostics UI.');

    await expect(page.getByRole('heading', { level: 1, name: /AI Diagnostics/i })).toBeVisible();
    await expect(page.getByText(/Runtime telemetry unavailable\./i)).toBeVisible();
    await expect(page.getByText(/Profile unavailable\./i)).toBeVisible();
    if (hydrated) {
      expect(pageErrors).toEqual([]);
    } else {
      const unexpectedErrors = pageErrors.filter(
        (message) => !/runtimeerror:\s*unreachable/i.test(message)
      );
      expect(unexpectedErrors).toEqual([]);
    }
  });
});
