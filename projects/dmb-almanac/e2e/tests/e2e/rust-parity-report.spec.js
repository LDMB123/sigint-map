import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { gotoHydrated, skipUnlessRust } from './_rust_test_utils.js';

test.describe('Rust parity report diagnostics', () => {
  skipUnlessRust(test);

  test('does not report integrity/parity mismatches after import and can export report', async ({ page }) => {
    test.setTimeout(240_000);

    await gotoHydrated(page, '/');

    // Wait for offline import to finish, otherwise parity checks can be in-flight.
    await expect(page.locator('.pwa-status .pwa-status__row').first()).toContainText(
      /Offline data ready/i,
      { timeout: 210_000 }
    );

    await page.getByRole('button', { name: 'SW details' }).click();

    // These should never appear in a clean environment.
    await expect(page.getByText(/Integrity mismatches detected/i)).toHaveCount(0);
    await expect(page.getByText(/SQLite parity mismatches/i)).toHaveCount(0);
    await expect(page.getByText(/SQLite parity check incomplete/i)).toHaveCount(0);

    // Export and verify we get a JSON download.
    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 });
    await page.getByRole('button', { name: 'Export parity report' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('dmb-parity-report.json');

    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const report = JSON.parse(fs.readFileSync(downloadPath, 'utf8'));

    const integrityMismatches = report?.integrityReport?.totalMismatches ?? 0;
    expect(integrityMismatches).toBe(0);

    const sqliteParity = report?.sqliteParity;
    // Local/offline cutover expects the SQLite API to be present and healthy.
    expect(sqliteParity?.available).toBe(true);
    expect(sqliteParity?.totalMismatches ?? 0).toBe(0);
    expect((sqliteParity?.idbCountFailures ?? []).length).toBe(0);
  });
});
