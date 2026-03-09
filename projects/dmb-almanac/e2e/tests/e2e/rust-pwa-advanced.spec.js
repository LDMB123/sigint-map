import { test, expect } from '@playwright/test';
import { gotoHydrated, skipUnlessRust } from './_rust_test_utils.js';

test.describe('Rust advanced PWA flows', () => {
  skipUnlessRust(test, 'Rust E2E disabled (set RUST_E2E=1)');

  test('manual open-file fallback stages an import preview', async ({ page }) => {
    await gotoHydrated(page, '/open-file');

    await page.setInputFiles('input[type="file"]', {
      name: 'sample-import.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ song: 'Warehouse', year: 1998 }), 'utf8'),
    });

    await expect(page.getByText(/Validated manual import into local staging/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'sample-import.json' })).toBeVisible();
    await expect(page.getByText(/JSON object with 2 top-level key/i)).toBeVisible();
    await expect(page.locator('pre')).toContainText('"Warehouse"');
  });

  test('typed JSON payloads can open inferred Rust destinations', async ({ page }) => {
    await gotoHydrated(page, '/open-file');

    await page.setInputFiles('input[type="file"]', {
      name: 'release-import.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ type: 'release', slug: 'away-from-the-world' }), 'utf8'),
    });

    await expect(page.getByRole('button', { name: /Open imported destination/i })).toBeVisible();
    await page.getByRole('button', { name: /Open imported destination/i }).click();

    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe('/releases/away-from-the-world');
    await expect(page.getByRole('heading', { name: /Away From the World/i })).toBeVisible();
  });

  test('protocol route redirects recognized search payloads into the Rust search flow', async ({ page }) => {
    await gotoHydrated(page, '/protocol?url=web%2Bdmb%3A%2F%2Fsearch%3Fq%3Dwarehouse');

    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe('/search');
    await expect(page.getByRole('searchbox')).toHaveValue('warehouse');
  });

  test('share-target query params prefill the Rust search flow', async ({ page }) => {
    await gotoHydrated(
      page,
      '/search?title=Warehouse&text=Too%20Much&url=https%3A%2F%2Fdmbalmanac.com%2FSongStats.aspx%3Fsid%3D42'
    );

    await expect(page.getByRole('heading', { name: /Search/i })).toBeVisible();
    await expect(page.getByRole('searchbox')).toHaveValue(
      'Too Much Warehouse https://dmbalmanac.com/SongStats.aspx?sid=42'
    );
  });
});
