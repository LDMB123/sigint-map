import { test, expect } from '@playwright/test';
import {
  gotoHydrated,
  skipUnlessRust,
  waitForServiceWorkerController,
} from './_rust_test_utils.js';

test.describe('Rust WebGPU runtime loading', () => {
  skipUnlessRust(test);

  test('home route startup does not fetch WebGPU helpers', async ({ page }) => {
    const requests = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname === '/webgpu.js' || url.pathname === '/webgpu-worker.js') {
        requests.push(url.pathname);
      }
    });

    await gotoHydrated(page, '/');
    await page.waitForTimeout(2000);

    expect(requests).toEqual([]);
  });

  test('AI route fetches WebGPU helpers on demand', async ({ page }) => {
    const requests = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname === '/webgpu.js' || url.pathname === '/webgpu-worker.js') {
        requests.push(url.pathname);
      }
    });

    await gotoHydrated(page, '/');
    await waitForServiceWorkerController(page);

    await gotoHydrated(page, '/ai-warmup');
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('body *'))
          .map((node) => node.textContent || '')
          .join(' ')
          .match(/Warmup complete|Warmup failed|Production-lite build/i),
      { timeout: 60_000 }
    );

    await expect
      .poll(() => requests.includes('/webgpu.js') || requests.includes('/webgpu-worker.js'))
      .toBe(true);

  });
});
