/**
 * Lazy Dexie Loader
 *
 * Defers Dexie and IndexedDB imports until actually needed.
 * Reduces initial bundle size by ~25-30 KB by code-splitting Dexie to data routes.
 *
 * Usage:
 * ```typescript
 * import { lazyGetDb } from '$lib/db/lazy-dexie';
 *
 * const db = await lazyGetDb();
 * const shows = await db.shows.toArray();
 * ```
 */

import type { DmbDatabase } from './dexie/db';

/**
 * Cached Dexie module to avoid re-importing
 */
let dexieModule: typeof import('./dexie/db') | null = null;

/**
 * Loading promise to prevent concurrent imports
 */
let loadingPromise: Promise<typeof import('./dexie/db')> | null = null;

/**
 * Lazy-load the Dexie module.
 * Returns cached module if already loaded.
 */
async function loadDexieModule(): Promise<typeof import('./dexie/db')> {
  // Return cached module if available
  if (dexieModule) {
    return dexieModule;
  }

  // Return existing loading promise if in progress
  if (loadingPromise) {
    return loadingPromise;
  }

  // Start loading
  loadingPromise = import('./dexie/db').then((module) => {
    dexieModule = module;
    loadingPromise = null;
    return module;
  });

  return loadingPromise;
}

/**
 * Get the Dexie database instance (lazy-loaded).
 * First call will dynamically import Dexie (~25-30 KB).
 * Subsequent calls return the cached instance.
 */
export async function lazyGetDb(): Promise<DmbDatabase> {
  const module = await loadDexieModule();
  return module.getDb();
}

/**
 * Setup cache invalidation listeners (lazy-loaded).
 * Should be called once during app initialization.
 */
export async function lazySetupCacheInvalidationListeners(): Promise<void> {
  const module = await loadDexieModule();
  const cacheModule = await import('./dexie/cache');
  cacheModule.setupCacheInvalidationListeners();
}

/**
 * Clear all caches (lazy-loaded).
 */
export async function lazyClearAllCaches(): Promise<void> {
  const cacheModule = await import('./dexie/cache');
  await cacheModule.clearAllCaches();
}

/**
 * Check if data is loaded (lazy-loaded).
 */
export async function lazyIsDataLoaded(): Promise<boolean> {
  const loaderModule = await import('./dexie/data-loader');
  return loaderModule.isDataLoaded();
}

/**
 * Load initial data (lazy-loaded).
 */
export async function lazyLoadInitialData(
  onProgress?: (progress: import('./dexie/data-loader').LoadProgress) => void
): Promise<void> {
  const loaderModule = await import('./dexie/data-loader');
  return loaderModule.loadInitialData(onProgress);
}

/**
 * Get storage info (lazy-loaded).
 */
export async function lazyGetStorageInfo(): Promise<{
  usage: number;
  quota: number;
  percentUsed: number;
  available: number;
}> {
  const loaderModule = await import('./dexie/data-loader');
  return loaderModule.getStorageInfo();
}

/**
 * Re-export types for convenience (no runtime cost).
 */
export type { DmbDatabase } from './dexie/db';
export type { LoadProgress } from './dexie/data-loader';
