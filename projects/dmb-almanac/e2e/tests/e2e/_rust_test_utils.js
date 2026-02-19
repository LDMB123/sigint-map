export function isRustE2E() {
  return process.env.RUST_E2E === 'true' || process.env.RUST_E2E === '1';
}

export function skipUnlessRust(test, message = 'Set RUST_E2E=1 and BASE_URL to the Rust server.') {
  test.skip(!isRustE2E(), message);
}

export async function waitForHydration(page, options = {}) {
  const { timeout = 30_000 } = options;
  await page.waitForFunction(() => window.__DMB_HYDRATED === true, { timeout });
}

export async function gotoHydrated(page, path, options = {}) {
  const {
    gotoOptions = {},
    loadState = 'load',
    hydrationTimeout = 30_000,
    hydrationOptions = {},
  } = options;
  await page.goto(path, gotoOptions);
  if (loadState) {
    await page.waitForLoadState(loadState);
  }
  await waitForHydration(page, { timeout: hydrationTimeout, ...hydrationOptions });
}

export function offlineStatusRow(page) {
  return page.locator('.pwa-status .pwa-status__row').first();
}

export async function waitForOfflineDataReady(page, options = {}) {
  const { timeout = 210_000 } = options;
  await page
    .locator('.pwa-status .pwa-status__row', { hasText: /Offline data ready/i })
    .first()
    .waitFor({ state: 'visible', timeout });
}

export async function waitForOfflineImportCompletion(page, options = {}) {
  const { timeout = 170_000 } = options;
  await page.waitForFunction(
    () => {
      const el = document.querySelector('.pwa-status .pwa-status__row');
      if (!el) return false;
      const text = el.textContent || '';

      if (/offline data ready/i.test(text)) return true;

      if (/integrity check failed|offline manifest missing|failed to load|import failed/i.test(text)) {
        throw new Error(`offline seed import failed: ${text}`);
      }

      return false;
    },
    { timeout }
  );
}

export async function waitForOfflineImportProgress(page, options = {}) {
  const { timeout = 45_000, minCurrent = 4 } = options;
  await page.waitForFunction(
    ({ minCurrent }) => {
      const el = document.querySelector('.pwa-status .pwa-status__row');
      if (!el) return false;

      const text = el.textContent || '';
      if (/offline data ready/i.test(text)) return true;

      const match = text.match(/Importing [^(]+\((\d+)\/(\d+)\)/i);
      if (!match) return false;

      const current = Number(match[1]);
      const total = Number(match[2]);
      if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return false;

      return current >= Math.min(minCurrent, total);
    },
    { minCurrent },
    { timeout }
  );
}

export async function waitForServiceWorkerController(page, options = {}) {
  const { availabilityTimeout = 5000, controllerTimeout = 15000 } = options;
  await page.waitForFunction(() => 'serviceWorker' in navigator, { timeout: availabilityTimeout });
  await page.evaluate(async () => {
    if (navigator.serviceWorker) {
      await navigator.serviceWorker.ready;
    }
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, {
    timeout: controllerTimeout,
  });
}

export async function activateWaitingServiceWorker(page, options = {}) {
  const { attempts = 6, retryDelayMs = 250 } = options;
  await page.evaluate(
    async ({ attempts, retryDelayMs }) => {
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const reg = await navigator.serviceWorker.getRegistration();
        const waiting = reg?.waiting;
        if (!waiting) {
          break;
        }
        waiting.postMessage({ type: 'SKIP_WAITING' });
        if (attempt < attempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      }
    },
    { attempts, retryDelayMs }
  );
}

export async function waitForWaitingServiceWorker(page, options = {}) {
  const { timeout = 15_000 } = options;
  await page.waitForFunction(
    async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return !!reg?.waiting;
    },
    { timeout }
  );
}

export async function ensureSwDetailsOpen(page) {
  const detailsOpen = await page.locator('.pwa-status__details[open]').count();
  if (detailsOpen === 0) {
    await page.locator('summary', { hasText: 'SW details' }).click();
  }
}
