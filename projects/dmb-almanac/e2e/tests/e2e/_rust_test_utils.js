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
