import { patchFetch, patchThreeImageLoader } from './runtime-patches.js';
import { createLegacyResourceTracker } from './resource-tracker.js';

const noop = () => {};

function showBootstrapError(error) {
  const loadingScreen = document.getElementById('loading-screen');
  const loadingStatus = document.getElementById('loading-status');
  const loadingPercent = document.getElementById('loading-percent');

  if (loadingStatus) {
    loadingStatus.textContent = 'BOOT FAILURE — CHECK CONSOLE';
  }

  if (loadingPercent) {
    loadingPercent.textContent = 'ERR';
  }

  if (loadingScreen) {
    loadingScreen.style.opacity = '1';
    loadingScreen.style.display = 'flex';
    loadingScreen.style.pointerEvents = 'auto';
  }

  console.error('[SIGINT-MAP] Bootstrap failed:', error);
}

function runCleanup(label, fn) {
  try {
    fn?.();
  } catch (error) {
    console.error(`[SIGINT-MAP] ${label} failed:`, error);
  }
}

function resetBootstrapGlobals() {
  window.__SIGINT_MAP_BOOTSTRAPPED__ = false;
  window.__SIGINT_MAP_CLEANUP__ = undefined;
  window.__SIGINT_MAP_BOOTSTRAP_PROMISE__ = undefined;
}

function createBootstrapCleanup({
  enhancementCleanup,
  legacyCleanup,
  resourceTracker,
  restoreImageLoader,
  restoreFetch,
}) {
  let cleanedUp = false;

  return () => {
    if (cleanedUp) return;
    cleanedUp = true;

    runCleanup('Enhancement cleanup', enhancementCleanup);
    runCleanup('Legacy cleanup', legacyCleanup);
    runCleanup('Resource cleanup', () => resourceTracker.cleanup());
    runCleanup('Image loader restore', restoreImageLoader);
    runCleanup('Fetch restore', restoreFetch);
    resetBootstrapGlobals();
  };
}

export async function bootstrapLegacyApp() {
  if (window.__SIGINT_MAP_BOOTSTRAPPED__) {
    return window.__SIGINT_MAP_CLEANUP__ || noop;
  }

  if (window.__SIGINT_MAP_BOOTSTRAP_PROMISE__) {
    return window.__SIGINT_MAP_BOOTSTRAP_PROMISE__;
  }

  window.__SIGINT_MAP_BOOTSTRAP_PROMISE__ = (async () => {
    const restoreFetch = patchFetch();
    const restoreImageLoader = patchThreeImageLoader();
    const resourceTracker = createLegacyResourceTracker();
    let legacyCleanup = noop;
    let enhancementCleanup = noop;

    try {
      const legacyModule = await import('./app.js');
      const initLegacyApp = legacyModule?.initLegacyApp;

      if (typeof initLegacyApp !== 'function') {
        throw new Error('Legacy runtime did not export initLegacyApp().');
      }

      legacyCleanup = initLegacyApp() || noop;

      const enhancementModule = await import('./groundbreaking.js');
      if (typeof enhancementModule?.enhanceLegacyApp === 'function') {
        enhancementCleanup = enhancementModule.enhanceLegacyApp() || noop;
      }

      const cleanup = createBootstrapCleanup({
        enhancementCleanup,
        legacyCleanup,
        resourceTracker,
        restoreImageLoader,
        restoreFetch,
      });

      window.__SIGINT_MAP_BOOTSTRAPPED__ = true;
      window.__SIGINT_MAP_CLEANUP__ = cleanup;
      window.__SIGINT_MAP_BOOTSTRAP_PROMISE__ = undefined;

      return cleanup;
    } catch (error) {
      createBootstrapCleanup({ enhancementCleanup, legacyCleanup, resourceTracker, restoreImageLoader, restoreFetch })();
      showBootstrapError(error);
      throw error;
    }
  })();

  return window.__SIGINT_MAP_BOOTSTRAP_PROMISE__;
}
