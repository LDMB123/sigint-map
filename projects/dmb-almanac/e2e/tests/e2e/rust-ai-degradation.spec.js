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

    await page.getByRole('button', { name: /Clear worker cooldown/i }).click();
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
    await expect(page.getByRole('heading', { level: 2, name: /WebGPU Runtime/i })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: /Apple Silicon Profile/i })).toBeVisible();
    if (hydrated) {
      expect(pageErrors).toEqual([]);
    } else {
      const unexpectedErrors = pageErrors.filter(
        (message) => !/runtimeerror:\s*unreachable/i.test(message)
      );
      expect(unexpectedErrors).toEqual([]);
    }
  });

  test('worker score exceptions surface through native worker errors without JS error envelopes', async ({
    page,
  }) => {
    const { productionLite, hydrated } = await openAiDiagnostics(page);
    test.skip(productionLite, 'Server is running production-lite AI diagnostics UI.');
    test.skip(!hydrated, 'Hydration unavailable for interactive diagnostics checks.');

    await expect(page.locator('li', { hasText: 'WebGPU worker: yes' })).toBeVisible();

    await page.context().route('**/webgpu-worker.js', async (route) => {
      const response = await route.fetch();
      const source = await response.text();
      const marker = 'await postScores(id, query);';
      if (!source.includes(marker)) {
        throw new Error('Unable to patch worker score path for degradation test.');
      }
      const patched = source.replace(
        marker,
        "setTimeout(() => { throw new Error('forced worker score failure'); }, 0); return;"
      );
      await route.fulfill({ response, body: patched });
    });

    const result = await page.evaluate(async () => {
      const worker = new Worker('/webgpu-worker.js', { type: 'module' });
      const matrix = new Float32Array([1, 0, 0, 1]);
      const query = new Float32Array([1, 0]);
      const messages = [];

      try {
        return await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            worker.terminate();
            reject(
              new Error(`Timed out waiting for worker error. Messages: ${JSON.stringify(messages)}`)
            );
          }, 10_000);

          worker.onmessage = (event) => {
            const data = event.data ?? null;
            messages.push(data);
            if (data?.ok) {
              worker.postMessage({ id: 2, query: query.buffer }, [query.buffer]);
              return;
            }

            clearTimeout(timeoutId);
            worker.terminate();
            resolve({ kind: 'message', data, messages });
          };

          worker.onerror = (event) => {
            clearTimeout(timeoutId);
            const error = {
              message: event.message,
              filename: event.filename,
              lineno: event.lineno,
              colno: event.colno,
            };
            worker.terminate();
            resolve({ kind: 'error', error, messages });
            return true;
          };

          worker.postMessage({ id: 1, matrix: matrix.buffer, dim: 2 }, [matrix.buffer]);
        });
      } finally {
        worker.terminate();
      }
    });

    expect(result.kind).toBe('error');
    expect(result.error.message).toContain('forced worker score failure');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({ id: 1, ok: true });
    expect(result.messages.some((message) => message && 'error' in message)).toBe(false);
  });
});
