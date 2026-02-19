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
