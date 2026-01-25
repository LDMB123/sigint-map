/**
 * Persistent Storage API utilities for PWA
 * Provides methods to request persistent storage, check status,
 * and monitor storage quota. Requires secure context (HTTPS).
 *
 * Browser support: Chrome 55+, Edge 79+, Opera 42+
 * Not supported: Safari, Firefox (limited support in some versions)
 */

export interface StorageEstimate {
  usage: number;
  quota: number;
  usagePercent: number;
  usageFormatted: string;
  quotaFormatted: string;
}

export interface StoragePersistenceState {
  isPersisted: boolean;
  isAvailable: boolean;
  isSecureContext: boolean;
}

/**
 * Check if the StorageManager API is supported in the current browser
 * Requires secure context (HTTPS or localhost)
 */
export function isPersistentStorageSupported(): boolean {
  // SSR guard
  if (typeof navigator === 'undefined') {
    return false;
  }

  // Check for secure context (required by spec)
  const isSecureContext = typeof window !== 'undefined' && window.isSecureContext;
  if (!isSecureContext) {
    console.warn('Persistent storage requires secure context (HTTPS or localhost)');
    return false;
  }

  // Check for StorageManager API
  return !!(navigator.storage && navigator.storage.persist);
}

/**
 * Request persistent storage permission from the user
 * This will trigger a browser permission prompt
 *
 * @returns Promise<boolean> - true if permission granted, false otherwise
 *
 * @example
 * ```typescript
 * const granted = await requestPersistentStorage();
 * if (granted) {
 *   console.log('Storage will not be cleared by browser');
 * }
 * ```
 */
export async function requestPersistentStorage(): Promise<boolean> {
  // SSR guard
  if (typeof navigator === 'undefined') {
    return false;
  }

  if (!isPersistentStorageSupported()) {
    console.warn('Persistent storage API not supported in this browser');
    return false;
  }

  try {
    const persistent = await navigator.storage.persist();
    if (persistent) {
      console.debug('Storage persistence granted');
    } else {
      console.debug('Storage persistence request denied');
    }
    return persistent;
  } catch (error) {
    console.error('Error requesting persistent storage:', error);
    return false;
  }
}

/**
 * Check if storage is currently persisted
 * Persisted storage will not be cleared by the browser
 * even under storage pressure
 *
 * @returns Promise<boolean> - true if storage is persisted
 *
 * @example
 * ```typescript
 * const isPersisted = await isStoragePersisted();
 * if (!isPersisted) {
 *   await requestPersistentStorage();
 * }
 * ```
 */
export async function isStoragePersisted(): Promise<boolean> {
  // SSR guard
  if (typeof navigator === 'undefined') {
    return false;
  }

  if (!isPersistentStorageSupported()) {
    return false;
  }

  try {
    return await navigator.storage.persisted();
  } catch (error) {
    console.error('Error checking storage persistence status:', error);
    return false;
  }
}

/**
 * Get the current storage estimate (usage and quota)
 * Returns null if StorageManager API is not supported
 *
 * @returns Promise<StorageEstimate | null>
 *
 * @example
 * ```typescript
 * const estimate = await getStorageEstimate();
 * if (estimate) {
 *   console.log(`Using ${estimate.usageFormatted} of ${estimate.quotaFormatted}`);
 *   console.log(`${estimate.usagePercent.toFixed(1)}% full`);
 * }
 * ```
 */
export async function getStorageEstimate(): Promise<StorageEstimate | null> {
  // SSR guard
  if (typeof navigator === 'undefined') {
    return null;
  }

  // Check for StorageManager API (doesn't require secure context for estimate)
  if (!navigator.storage || !navigator.storage.estimate) {
    console.warn('StorageManager API not available');
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();

    const usage = estimate.usage ?? 0;
    const quota = estimate.quota ?? 0;
    const usagePercent = quota > 0 ? (usage / quota) * 100 : 0;

    return {
      usage,
      quota,
      usagePercent,
      usageFormatted: formatBytes(usage),
      quotaFormatted: formatBytes(quota)
    };
  } catch (error) {
    console.error('Error estimating storage:', error);
    return null;
  }
}

/**
 * Get complete storage persistence state
 * Useful for diagnostic and UI purposes
 *
 * @returns Promise<StoragePersistenceState>
 *
 * @example
 * ```typescript
 * const state = await getStoragePersistenceState();
 * if (!state.isPersisted && state.isAvailable) {
 *   showPersistencePrompt();
 * }
 * ```
 */
export async function getStoragePersistenceState(): Promise<StoragePersistenceState> {
  return {
    isPersisted: await isStoragePersisted(),
    isAvailable: isPersistentStorageSupported(),
    isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : false
  };
}

/**
 * Format bytes to human-readable string
 * @internal
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Listen for storage pressure events (low disk space)
 * Fires when the browser is running low on disk space
 * and may start clearing cached data
 *
 * @param callback - Function to call when storage pressure is detected
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * const unsubscribe = onStoragePressure(() => {
 *   console.log('Storage pressure detected, clearing non-essential data');
 *   clearCaches();
 * });
 *
 * // Later, to stop listening:
 * unsubscribe();
 * ```
 */
export function onStoragePressure(callback: (event: Event) => void): () => void {
  // SSR guard
  if (typeof navigator === 'undefined') {
    return () => {};
  }

  // Check for StorageManager - addEventListener is experimental and not in standard types
  const storage = navigator.storage as StorageManager & EventTarget;
  if (!storage || !('addEventListener' in storage)) {
    console.warn('Storage pressure events not supported');
    return () => {};
  }

  const eventHandler = (event: Event) => {
    console.warn('Storage pressure event detected');
    callback(event);
  };

  // Listen for storage quota exceeded event
  // Note: Actual browser support for this event is limited
  storage.addEventListener('quotaexceeded', eventHandler);

  // Return unsubscribe function
  return () => {
    storage.removeEventListener('quotaexceeded', eventHandler);
  };
}

/**
 * Request persistent storage with improved UX
 * Only shows prompt after user interaction (not on page load)
 * Good for PWA install flows
 *
 * @param onResult - Optional callback with result
 * @returns Promise<boolean>
 *
 * @example
 * ```typescript
 * button.addEventListener('click', async () => {
 *   const success = await requestPersistentStorageWithPrompt();
 *   if (success) {
 *     showToast('Your data is now safely stored');
 *   }
 * });
 * ```
 */
export async function requestPersistentStorageWithPrompt(
  onResult?: (granted: boolean) => void
): Promise<boolean> {
  const granted = await requestPersistentStorage();

  if (onResult) {
    onResult(granted);
  }

  return granted;
}

/**
 * Check if storage quota is running low
 * Returns true if usage is above 80% of quota
 *
 * @returns Promise<boolean>
 *
 * @example
 * ```typescript
 * if (await isStorageQuotaLow()) {
 *   console.log('Consider clearing old cache data');
 * }
 * ```
 */
export async function isStorageQuotaLow(threshold: number = 80): Promise<boolean> {
  const estimate = await getStorageEstimate();
  if (!estimate) return false;

  return estimate.usagePercent >= threshold;
}

/**
 * Get the available free space in storage quota
 *
 * @returns Promise<number | null> - Available bytes, or null if not supported
 *
 * @example
 * ```typescript
 * const freeSpace = await getAvailableStorage();
 * if (freeSpace && freeSpace < 1024 * 1024) { // < 1MB
 *   console.log('Less than 1MB free');
 * }
 * ```
 */
export async function getAvailableStorage(): Promise<number | null> {
  const estimate = await getStorageEstimate();
  if (!estimate) return null;

  return estimate.quota - estimate.usage;
}

/**
 * Get a friendly status message about storage
 * Useful for UI display
 *
 * @returns Promise<string>
 *
 * @example
 * ```typescript
 * const message = await getStorageStatusMessage();
 * console.log(message); // "Using 50.5 MB of 100 MB (50.5%)"
 * ```
 */
export async function getStorageStatusMessage(): Promise<string> {
  const estimate = await getStorageEstimate();
  if (!estimate) {
    return 'Storage information unavailable';
  }

  const isPersisted = await isStoragePersisted();
  const persistenceInfo = isPersisted ? ' (persisted)' : '';

  return (
    `Using ${estimate.usageFormatted} of ${estimate.quotaFormatted} ` +
    `(${estimate.usagePercent.toFixed(1)}%)${persistenceInfo}`
  );
}
