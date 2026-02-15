import { test, expect } from '@playwright/test';

const useRust = process.env.RUST_E2E === 'true' || process.env.RUST_E2E === '1';

test.describe('Rust IDB auto-repair', () => {
  test.skip(!useRust, 'Rust E2E disabled (set RUST_E2E=1)');

  test('repairs when import marker exists but seed stores are missing', async ({ page }) => {
    // Create a "drifted" Rust DB: version matches, but required stores are missing.
    // Also create a valid import marker pointing at the current manifest version.
    await page.goto('/offline.html');
    await page.evaluate(async () => {
      const DB_NAME = 'dmb-almanac-rs';
      // Create the DB at an older version so the Rust app's `open_db()` (DB_VERSION=2)
      // runs an upgrade and creates the missing stores. This matches the real-world drift
      // scenario we care about (schema changed but existing clients need an upgrade).
      const DB_VERSION = 1;

      const deleteDb = () =>
        new Promise((resolve) => {
          const req = indexedDB.deleteDatabase(DB_NAME);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
          req.onblocked = () => resolve();
        });

      const manifestResp = await fetch('/data/manifest.json');
      if (!manifestResp.ok) throw new Error('missing /data/manifest.json');
      const manifest = await manifestResp.json();
      if (!manifest || !manifest.version) throw new Error('manifest missing version');

      // Ensure no prior DB exists in this context.
      await deleteDb();

      await new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          // Only create syncMeta; omit all seed stores to simulate a schema drift / incomplete DB.
          if (!db.objectStoreNames.contains('syncMeta')) {
            db.createObjectStore('syncMeta', { keyPath: 'id' });
          }
        };
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['syncMeta'], 'readwrite');
          tx.onerror = () => reject(tx.error);
          const store = tx.objectStore('syncMeta');
          store.put({
            id: 'data_import_v1',
            manifestVersion: manifest.version,
            importedAt: new Date().toISOString(),
            recordCounts: {},
          });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      });
    });

    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForFunction(() => window.__DMB_HYDRATED === true);

    const statusRow = page.locator('.pwa-status .pwa-status__row').first();

    // The key behavior we want: don't claim "Offline data ready" while missing stores.
    // We should see the explicit repair message (or at least an import) for this scenario.
    await expect(statusRow).toHaveText(/repairing|Importing/i, { timeout: 10000 });

    // Importing the full dataset can take longer than the default E2E timeout, especially on CI.
    // Instead of hard-coding specific filenames, assert that progress advances beyond early files.
    await page.waitForFunction(() => {
      const el = document.querySelector('.pwa-status .pwa-status__row');
      if (!el) return false;

      const text = el.textContent || '';
      if (/offline data ready/i.test(text)) return true;

      const match = text.match(/Importing [^(]+\((\d+)\/(\d+)\)/i);
      if (!match) return false;

      const current = Number(match[1]);
      const total = Number(match[2]);
      if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return false;

      return current >= Math.min(4, total);
    }, { timeout: 45000 });

    const finalText = await statusRow.textContent();
    expect(finalText || '').not.toMatch(/Import failed/i);
  });
});
