/**
 * Storage Manager for IndexedDB Quota Management
 *
 * Provides storage quota monitoring, cross-tab synchronization,
 * and graceful degradation for the DMB Almanac PWA.
 *
 * Features:
 * - Real-time storage quota monitoring
 * - Cross-tab synchronization via BroadcastChannel
 * - Quota exceeded prevention
 * - Storage persistence request
 * - Graceful degradation to localStorage
 */

// ==================== TYPES ====================

export interface StorageQuota {
  usage: number;
  quota: number;
  usagePercent: number;
  available: number;
  isLow: boolean; // Below 10% available
  isCritical: boolean; // Below 5% available
}

export interface CrossTabMessage {
  type: 'sync-complete' | 'data-updated' | 'cache-cleared' | 'quota-warning';
  timestamp: number;
  source: string;
  payload?: unknown;
}

// ==================== CONSTANTS ====================

const BROADCAST_CHANNEL_NAME = 'dmb-almanac-sync';
const STORAGE_WARNING_THRESHOLD = 0.9; // 90% used
const STORAGE_CRITICAL_THRESHOLD = 0.95; // 95% used
const TAB_ID = `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;

// ==================== STORAGE QUOTA ====================

/**
 * Check if Storage Manager API is available
 */
export function isStorageManagerSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'storage' in navigator &&
    typeof navigator.storage?.estimate === 'function'
  );
}

/**
 * Get current storage quota and usage
 * Returns null if Storage API is not available
 */
export async function getStorageQuota(): Promise<StorageQuota | null> {
  if (!isStorageManagerSupported()) {
    console.warn('[StorageManager] Storage API not available');
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage ?? 0;
    const quota = estimate.quota ?? 0;

    if (quota === 0) {
      return null;
    }

    const usagePercent = (usage / quota) * 100;
    const available = quota - usage;
    const isLow = usagePercent >= STORAGE_WARNING_THRESHOLD * 100;
    const isCritical = usagePercent >= STORAGE_CRITICAL_THRESHOLD * 100;

    return {
      usage,
      quota,
      usagePercent,
      available,
      isLow,
      isCritical
    };
  } catch (error) {
    console.error('[StorageManager] Failed to get storage estimate:', error);
    return null;
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Request persistent storage to prevent browser from evicting data
 * Returns true if persistence was granted
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!isStorageManagerSupported() || !navigator.storage.persist) {
    return false;
  }

  try {
    // Check if already persisted
    const isPersisted = await navigator.storage.persisted();
    if (isPersisted) {
      return true;
    }

    // Request persistence
    const granted = await navigator.storage.persist();
    if (granted) {
      console.log('[StorageManager] Persistent storage granted');
    } else {
      console.warn('[StorageManager] Persistent storage denied');
    }
    return granted;
  } catch (error) {
    console.error('[StorageManager] Failed to request persistent storage:', error);
    return false;
  }
}

/**
 * Check if we have enough space for an operation
 * @param requiredBytes - Minimum bytes needed
 * @returns true if space is available
 */
export async function hasEnoughSpace(requiredBytes: number): Promise<boolean> {
  const quota = await getStorageQuota();
  if (!quota) {
    // If we can't check, assume we have space
    return true;
  }

  // Add 10% buffer for safety
  const requiredWithBuffer = requiredBytes * 1.1;
  return quota.available > requiredWithBuffer;
}

// ==================== CROSS-TAB SYNC ====================

let broadcastChannel: BroadcastChannel | null = null;
const messageListeners: Set<(message: CrossTabMessage) => void> = new Set();

/**
 * Check if BroadcastChannel is supported
 */
export function isBroadcastChannelSupported(): boolean {
  return typeof BroadcastChannel !== 'undefined';
}

/**
 * Initialize cross-tab synchronization
 */
export function initCrossTabSync(): void {
  if (!isBroadcastChannelSupported()) {
    console.warn('[StorageManager] BroadcastChannel not supported');
    return;
  }

  if (broadcastChannel) {
    return; // Already initialized
  }

  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);

    broadcastChannel.onmessage = (event: MessageEvent<CrossTabMessage>) => {
      const message = event.data;

      // Don't process our own messages
      if (message.source === TAB_ID) {
        return;
      }

      console.log('[StorageManager] Received cross-tab message:', message.type);

      // Notify all listeners
      messageListeners.forEach((listener) => {
        try {
          listener(message);
        } catch (error) {
          console.error('[StorageManager] Listener error:', error);
        }
      });
    };

    broadcastChannel.onmessageerror = (event) => {
      console.error('[StorageManager] Message error:', event);
    };

    console.log('[StorageManager] Cross-tab sync initialized');
  } catch (error) {
    console.error('[StorageManager] Failed to initialize BroadcastChannel:', error);
  }
}

/**
 * Send a message to other tabs
 */
export function broadcastMessage(
  type: CrossTabMessage['type'],
  payload?: unknown
): void {
  if (!broadcastChannel) {
    return;
  }

  const message: CrossTabMessage = {
    type,
    timestamp: Date.now(),
    source: TAB_ID,
    payload
  };

  try {
    broadcastChannel.postMessage(message);
  } catch (error) {
    console.error('[StorageManager] Failed to broadcast message:', error);
  }
}

/**
 * Subscribe to cross-tab messages
 * @returns Unsubscribe function
 */
export function onCrossTabMessage(
  listener: (message: CrossTabMessage) => void
): () => void {
  messageListeners.add(listener);

  return () => {
    messageListeners.delete(listener);
  };
}

/**
 * Notify other tabs that sync is complete
 */
export function notifySyncComplete(recordCounts?: Record<string, number>): void {
  broadcastMessage('sync-complete', { recordCounts });
}

/**
 * Notify other tabs that data was updated
 */
export function notifyDataUpdated(tables: string[]): void {
  broadcastMessage('data-updated', { tables });
}

/**
 * Notify other tabs of quota warning
 */
export function notifyQuotaWarning(quota: StorageQuota): void {
  broadcastMessage('quota-warning', { quota });
}

/**
 * Close the broadcast channel
 */
export function closeCrossTabSync(): void {
  if (broadcastChannel) {
    broadcastChannel.close();
    broadcastChannel = null;
    messageListeners.clear();
    console.log('[StorageManager] Cross-tab sync closed');
  }
}

// ==================== GRACEFUL DEGRADATION ====================

const FALLBACK_KEY_PREFIX = 'dmb_fallback_';

/**
 * Store critical data in localStorage as fallback
 */
export function storeFallbackData(key: string, data: unknown): boolean {
  if (typeof localStorage === 'undefined') {
    return false;
  }

  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(`${FALLBACK_KEY_PREFIX}${key}`, serialized);
    return true;
  } catch (error) {
    console.error('[StorageManager] Failed to store fallback data:', error);
    return false;
  }
}

/**
 * Retrieve fallback data from localStorage
 */
export function getFallbackData<T>(key: string): T | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const serialized = localStorage.getItem(`${FALLBACK_KEY_PREFIX}${key}`);
    if (!serialized) {
      return null;
    }
    return JSON.parse(serialized) as T;
  } catch (error) {
    console.error('[StorageManager] Failed to retrieve fallback data:', error);
    return null;
  }
}

/**
 * Clear all fallback data
 */
export function clearFallbackData(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(FALLBACK_KEY_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

// ==================== QUOTA MONITOR ====================

let quotaMonitorInterval: ReturnType<typeof setInterval> | null = null;
const quotaListeners: Set<(quota: StorageQuota) => void> = new Set();

/**
 * Start monitoring storage quota
 * @param intervalMs - Check interval in milliseconds (default: 60 seconds)
 */
export function startQuotaMonitor(intervalMs = 60_000): void {
  if (quotaMonitorInterval) {
    return; // Already monitoring
  }

  const checkQuota = async () => {
    const quota = await getStorageQuota();
    if (!quota) return;

    // Notify listeners
    quotaListeners.forEach((listener) => {
      try {
        listener(quota);
      } catch (error) {
        console.error('[StorageManager] Quota listener error:', error);
      }
    });

    // Warn if storage is low
    if (quota.isCritical) {
      console.warn(
        `[StorageManager] CRITICAL: Storage ${quota.usagePercent.toFixed(1)}% used ` +
        `(${formatBytes(quota.available)} available)`
      );
      notifyQuotaWarning(quota);
    } else if (quota.isLow) {
      console.warn(
        `[StorageManager] WARNING: Storage ${quota.usagePercent.toFixed(1)}% used ` +
        `(${formatBytes(quota.available)} available)`
      );
    }
  };

  // Check immediately
  checkQuota();

  // Then check periodically
  quotaMonitorInterval = setInterval(checkQuota, intervalMs);
  console.log('[StorageManager] Quota monitoring started');
}

/**
 * Stop monitoring storage quota
 */
export function stopQuotaMonitor(): void {
  if (quotaMonitorInterval) {
    clearInterval(quotaMonitorInterval);
    quotaMonitorInterval = null;
    quotaListeners.clear();
    console.log('[StorageManager] Quota monitoring stopped');
  }
}

/**
 * Subscribe to quota updates
 * @returns Unsubscribe function
 */
export function onQuotaUpdate(
  listener: (quota: StorageQuota) => void
): () => void {
  quotaListeners.add(listener);

  return () => {
    quotaListeners.delete(listener);
  };
}

// ==================== INITIALIZATION ====================

/**
 * Initialize all storage management features
 */
export async function initStorageManager(): Promise<void> {
  // Request persistent storage
  await requestPersistentStorage();

  // Initialize cross-tab sync
  initCrossTabSync();

  // Start quota monitoring
  startQuotaMonitor();

  // Log initial quota
  const quota = await getStorageQuota();
  if (quota) {
    console.log(
      `[StorageManager] Storage: ${formatBytes(quota.usage)} / ${formatBytes(quota.quota)} ` +
      `(${quota.usagePercent.toFixed(1)}% used)`
    );
  }
}

/**
 * Cleanup storage manager
 */
export function cleanupStorageManager(): void {
  stopQuotaMonitor();
  closeCrossTabSync();
}
