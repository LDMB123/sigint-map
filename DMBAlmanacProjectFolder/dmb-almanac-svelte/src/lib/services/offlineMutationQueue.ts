/**
 * DMB Almanac - Offline Mutation Queue Service
 *
 * Provides offline-first mutation handling with:
 * - Automatic queuing when offline
 * - Exponential backoff retry logic (max 3 retries)
 * - Background Sync API integration (when available)
 * - SSR compatibility (typeof window checks)
 *
 * Mutations are stored in IndexedDB and processed when:
 * 1. Browser comes back online (navigator.onLine + 'online' event)
 * 2. Background Sync API fires (if registered and supported)
 * 3. Manual processQueue() call
 */

import type { OfflineMutationQueueItem } from '$db/dexie/schema';
import { getDb } from '$db/dexie/db';
import { createDevLogger } from '$lib/utils/dev-logger';

const logger = createDevLogger('offline:queue');

// ==================== CONFIGURATION ====================

/**
 * Maximum number of retry attempts for a failed mutation
 */
const MAX_RETRIES = 3;

/**
 * Base delay in milliseconds for exponential backoff
 * First retry: 1000ms, second: 2000ms, third: 4000ms
 */
const BACKOFF_BASE_MS = 1000;

/**
 * Exponential multiplier for backoff calculation
 */
const BACKOFF_MULTIPLIER = 2;

/**
 * Maximum jitter (randomness) to add to backoff in milliseconds
 * Prevents thundering herd problem when multiple clients come online
 */
const BACKOFF_JITTER_MS = 500;

/**
 * Maximum number of mutations to keep in queue
 * Prevents storage quota issues with unbounded queue growth
 */
const MAX_QUEUE_SIZE = 1000;

/**
 * Maximum number of parallel mutation requests
 * Balances throughput with server load and network congestion
 */
const MAX_PARALLEL_MUTATIONS = 4;

/**
 * Timeout for individual fetch requests in milliseconds
 */
const FETCH_TIMEOUT_MS = 30000;

/**
 * Background Sync tag for queue processing
 */
const BACKGROUND_SYNC_TAG = 'dmb-offline-mutation-queue';

// ==================== TYPES ====================

/**
 * Options for queue mutation
 */
export interface QueueMutationOptions {
  /**
   * Whether to retry failed mutations (default: true)
   */
  retry?: boolean;

  /**
   * Custom headers to include in the request
   */
  headers?: Record<string, string>;
}

/**
 * Options for processing queue
 */
export interface ProcessQueueOptions {
  /**
   * Maximum number of mutations to process (default: undefined = process all)
   */
  maxMutations?: number;

  /**
   * Abort signal for cancellation support
   */
  signal?: AbortSignal;
}

/**
 * Result of processing a single mutation
 */
export interface ProcessMutationResult {
  id: number;
  success: boolean;
  status: 'completed' | 'retrying' | 'failed';
  error?: string;
  response?: {
    status: number;
    statusText: string;
  };
}

/**
 * Result of processing the entire queue
 */
export interface ProcessQueueResult {
  processed: number;
  succeeded: number;
  failed: number;
  retrying: number;
  results: ProcessMutationResult[];
}

// ==================== PRIVATE STATE ====================

/**
 * Promise for current processing operation
 * Allows concurrent callers to await the same processing
 * Prevents TOCTOU race condition
 */
let processingPromise: Promise<ProcessQueueResult> | null = null;

/**
 * Online status flag
 * True when navigator.onLine is true and 'online' event received
 */
let isOnline = typeof window !== 'undefined' ? navigator.onLine : false;

/**
 * Scheduled timeout for next retry
 */
let nextRetryTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Event listeners cleanup functions
 */
const listeners: Array<() => void> = [];

// ==================== UTILITY FUNCTIONS ====================

/**
 * Check if environment supports window/IndexedDB
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Check if Badging API is supported
 */
function supportsBadgingAPI(): boolean {
  if (!isBrowser()) return false;
  return 'setAppBadge' in navigator;
}

/**
 * Update the app badge with pending/retrying mutation count
 * Only counts mutations that are not yet completed
 */
async function updateAppBadge(): Promise<void> {
  if (!supportsBadgingAPI()) {
    return;
  }

  try {
    const db = getDb();
    await db.ensureOpen();

    // Count pending and retrying mutations (active mutations)
    const [pending, retrying] = await Promise.all([
      db.offlineMutationQueue.where('status').equals('pending').count(),
      db.offlineMutationQueue.where('status').equals('retrying').count(),
    ]);

    const badgeCount = pending + retrying;

    if (badgeCount > 0) {
      await navigator.setAppBadge(badgeCount);
      logger.debug(`[Badge] Updated app badge: ${badgeCount} pending mutations`);
    } else {
      await navigator.clearAppBadge();
      logger.debug('[Badge] Cleared app badge');
    }
  } catch (error) {
    // Silently fail - badge is a nice-to-have feature
    logger.debug('[Badge] Error updating badge:', error);
  }
}

/**
 * Clear the app badge
 */
async function clearAppBadge(): Promise<void> {
  if (!supportsBadgingAPI()) {
    return;
  }

  try {
    await navigator.clearAppBadge();
    logger.debug('[Badge] Cleared app badge');
  } catch (error) {
    logger.debug('[Badge] Error clearing badge:', error);
  }
}

/**
 * Check if environment supports Background Sync API
 */
function supportsBackgroundSync(): boolean {
  if (!isBrowser()) return false;
  return (
    'serviceWorker' in navigator &&
    'SyncManager' in window &&
    'registration' in navigator.serviceWorker
  );
}

/**
 * Calculate exponential backoff delay with jitter
 * @param retryCount - Zero-based retry attempt number (0, 1, 2...)
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(retryCount: number): number {
  const exponentialDelay =
    BACKOFF_BASE_MS * Math.pow(BACKOFF_MULTIPLIER, retryCount);
  const jitter = Math.random() * BACKOFF_JITTER_MS;
  return exponentialDelay + jitter;
}

/**
 * Perform a fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number }
): Promise<Response> {
  const { timeout = FETCH_TIMEOUT_MS, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Check if online status has changed
 */
function checkOnlineStatus(): boolean {
  const wasOnline = isOnline;
  isOnline = isBrowser() ? navigator.onLine : false;

  if (!wasOnline && isOnline) {
    logger.debug('[OfflineMutationQueue] Back online, triggering queue processing');
    return true; // Changed from offline to online
  }

  return false;
}

/**
 * Schedule automatic processing on next retry time
 */
function scheduleNextRetry(nextRetryTime: number): void {
  // Clear existing timeout
  if (nextRetryTimeout) {
    clearTimeout(nextRetryTimeout);
  }

  const delayMs = Math.max(0, nextRetryTime - Date.now());

  if (delayMs > 0) {
    console.debug(
      `[OfflineMutationQueue] Scheduling next retry in ${delayMs}ms`
    );
    nextRetryTimeout = setTimeout(() => {
      processQueue().catch((error) => {
        console.error(
          '[OfflineMutationQueue] Error in scheduled retry:',
          error
        );
      });
    }, delayMs);
  }
}

// ==================== PUBLIC API ====================

/**
 * Initialize the offline mutation queue service
 * Registers online/offline event listeners
 *
 * Call this once during app initialization (e.g., in +layout.svelte's onMount)
 */
export function initializeQueue(): void {
  if (!isBrowser()) {
    logger.debug('[OfflineMutationQueue] SSR environment, skipping initialization');
    return;
  }

  logger.debug('[OfflineMutationQueue] Initializing queue service');

  // Update initial online status
  isOnline = navigator.onLine;

  // Listen for online event
  const handleOnline = () => {
    logger.debug('[OfflineMutationQueue] Online event fired');
    checkOnlineStatus();
    processQueue().catch((error) => {
      logger.error('[OfflineMutationQueue] Error processing queue on online:', error);
    });
  };

  // Listen for offline event
  const handleOffline = () => {
    logger.debug('[OfflineMutationQueue] Offline event fired');
    checkOnlineStatus();
  };

  // Listen for visibility change (helps detect coming back online)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && navigator.onLine && !isOnline) {
      console.debug(
        '[OfflineMutationQueue] Document became visible and online'
      );
      checkOnlineStatus();
      processQueue().catch((error) => {
        console.error(
          '[OfflineMutationQueue] Error processing queue on visibility:',
          error
        );
      });
    }
  };

  // Passive flag: These are information-only events, never prevent default
  window.addEventListener('online', handleOnline, { passive: true });
  window.addEventListener('offline', handleOffline, { passive: true });
  document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });

  // Store cleanup functions
  listeners.push(() => window.removeEventListener('online', handleOnline));
  listeners.push(() => window.removeEventListener('offline', handleOffline));
  listeners.push(() =>
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  );

  logger.debug('[OfflineMutationQueue] Queue service initialized');
}

/**
 * Clean up the offline mutation queue service
 * Removes event listeners and cancels scheduled retries
 *
 * Call this during app cleanup (e.g., in route transitions or cleanup functions)
 */
export function cleanupQueue(): void {
  if (!isBrowser()) {
    return;
  }

  logger.debug('[OfflineMutationQueue] Cleaning up queue service');

  // Remove all event listeners
  listeners.forEach((cleanup) => cleanup());
  listeners.length = 0;

  // Clear scheduled retry
  if (nextRetryTimeout) {
    clearTimeout(nextRetryTimeout);
    nextRetryTimeout = null;
  }
}

/**
 * Add a mutation to the queue for offline processing
 *
 * @param url - Full URL for the API endpoint
 * @param method - HTTP method
 * @param body - Request body as JSON string
 * @param options - Additional options
 * @returns Promise resolving to the queue item ID
 *
 * @example
 * const id = await queueMutation(
 *   'https://api.example.com/favorites',
 *   'POST',
 *   JSON.stringify({ songId: 123 })
 * );
 */
export async function queueMutation(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body: string,
  options?: QueueMutationOptions
): Promise<number> {
  if (!isBrowser()) {
    throw new Error('[OfflineMutationQueue] Cannot queue mutation in SSR environment');
  }

  const db = getDb();
  await db.ensureOpen();

  // Check queue size limit to prevent unbounded growth
  const currentCount = await db.offlineMutationQueue.count();
  if (currentCount >= MAX_QUEUE_SIZE) {
    // Clear oldest completed mutations first
    const completed = await db.offlineMutationQueue
      .where('status')
      .equals('completed')
      .sortBy('createdAt');

    if (completed.length > 0) {
      const idsToDelete = completed.slice(0, Math.max(1, completed.length / 2))
        .map(m => m.id)
        .filter((id): id is number => id !== undefined);
      await db.offlineMutationQueue.bulkDelete(idsToDelete);
      console.debug(`[OfflineMutationQueue] Cleaned up ${idsToDelete.length} old completed mutations`);
    } else {
      // If no completed mutations, warn about queue limit
      console.warn(`[OfflineMutationQueue] Queue size limit reached (${MAX_QUEUE_SIZE}). Consider clearing failed mutations.`);
    }
  }

  const queueItem: OfflineMutationQueueItem = {
    url,
    method,
    body,
    status: 'pending',
    retries: 0,
    createdAt: Date.now(),
    lastError: undefined,
    nextRetry: undefined,
  };

  try {
    const id = await db.offlineMutationQueue.add(queueItem);

    // id is now guaranteed to be a number since add() succeeded
    const mutationId = id as number;

    console.debug(
      `[OfflineMutationQueue] Queued mutation: ${method} ${url} (ID: ${mutationId})`
    );

    // Update app badge to reflect new pending mutation
    await updateAppBadge();

    // If online, immediately try to process
    if (navigator.onLine && !processingPromise) {
      console.debug(
        '[OfflineMutationQueue] Online detected, attempting immediate processing'
      );
      processQueue().catch((error) => {
        console.error(
          '[OfflineMutationQueue] Error in immediate processing:',
          error
        );
      });
    }

    return mutationId;
  } catch (error) {
    logger.error('[OfflineMutationQueue] Error queueing mutation:', error);
    throw error;
  }
}

/**
 * Process all pending and retrying mutations in the queue
 *
 * Attempts to send each mutation and updates status based on response.
 * Uses exponential backoff for failed mutations.
 *
 * @param options - Processing options
 * @returns Promise resolving to processing results
 *
 * @example
 * const result = await processQueue();
 * console.debug(`Processed ${result.processed} mutations, ${result.succeeded} succeeded`);
 */
export async function processQueue(
  options?: ProcessQueueOptions
): Promise<ProcessQueueResult> {
  if (!isBrowser()) {
    throw new Error(
      '[OfflineMutationQueue] Cannot process queue in SSR environment'
    );
  }

  // If already processing, return the existing promise (fixes TOCTOU race condition)
  if (processingPromise) {
    console.debug(
      '[OfflineMutationQueue] Queue already processing, returning existing promise'
    );
    return processingPromise;
  }

  // Create and store the processing promise
  processingPromise = performQueueProcessing(options);

  try {
    return await processingPromise;
  } finally {
    processingPromise = null;
  }
}

/**
 * Internal function that performs the actual queue processing
 */
async function performQueueProcessing(
  options?: ProcessQueueOptions
): Promise<ProcessQueueResult> {
  const startTime = performance.now();

  try {
    const db = getDb();
    await db.ensureOpen();

    // Get all pending and retrying mutations, ordered by creation time (FIFO)
    const mutations = await db.offlineMutationQueue
      .where('status')
      .anyOf(['pending', 'retrying'])
      .sortBy('createdAt');

    // Apply max mutations limit if specified
    const toProcess = options?.maxMutations
      ? mutations.slice(0, options.maxMutations)
      : mutations;

    console.debug(
      `[OfflineMutationQueue] Processing ${toProcess.length} mutations (total queued: ${mutations.length})`
    );

    const results: ProcessMutationResult[] = [];
    let succeeded = 0;
    let failed = 0;
    let retrying = 0;
    let earliestNextRetry: number | null = null;

    // Process mutations in parallel batches for better throughput
    // while maintaining order within reasonable bounds
    const processBatch = async (batch: typeof toProcess): Promise<ProcessMutationResult[]> => Promise.all(
        batch.map(async (mutation) => {
          // Check abort signal
          if (options?.signal?.aborted) {
            return {
              id: mutation.id ?? 0,
              success: false,
              status: 'retrying' as const,
              error: 'Aborted',
            };
          }

          try {
            return await processMutation(mutation);
          } catch (error) {
            console.error(
              `[OfflineMutationQueue] Error processing mutation ${mutation.id}:`,
              error
            );
            return {
              id: mutation.id ?? 0,
              success: false,
              status: 'failed' as const,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        })
      );

    // Process in batches of MAX_PARALLEL_MUTATIONS
    for (let i = 0; i < toProcess.length; i += MAX_PARALLEL_MUTATIONS) {
      // Check abort signal before each batch
      if (options?.signal?.aborted) {
        logger.debug('[OfflineMutationQueue] Processing aborted by signal');
        break;
      }

      const batch = toProcess.slice(i, i + MAX_PARALLEL_MUTATIONS);
      const batchResults = await processBatch(batch);

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const mutation = batch[j];
        results.push(result);

        if (result.status === 'completed') {
          succeeded++;
        } else if (result.status === 'retrying') {
          retrying++;
          if (
            mutation.nextRetry &&
            (earliestNextRetry === null || mutation.nextRetry < earliestNextRetry)
          ) {
            earliestNextRetry = mutation.nextRetry;
          }
        } else if (result.status === 'failed') {
          failed++;
        }
      }
    }

    // Schedule next retry if there are retrying mutations
    if (earliestNextRetry) {
      scheduleNextRetry(earliestNextRetry);
    }

    const duration = performance.now() - startTime;
    console.debug(
      `[OfflineMutationQueue] Processing complete (${toProcess.length} mutations in ${duration.toFixed(2)}ms): ${succeeded} succeeded, ${retrying} retrying, ${failed} failed`
    );

    // Update app badge based on remaining mutations
    await updateAppBadge();

    return {
      processed: toProcess.length,
      succeeded,
      failed,
      retrying,
      results,
    };
  } catch (error) {
    logger.error('[OfflineMutationQueue] Error in processQueue:', error);
    throw error;
  }
}

/**
 * Get all queued mutations
 *
 * @returns Promise resolving to array of queued mutations
 *
 * @example
 * const queued = await getQueuedMutations();
 * console.debug(`${queued.length} mutations in queue`);
 */
export async function getQueuedMutations(): Promise<OfflineMutationQueueItem[]> {
  if (!isBrowser()) {
    throw new Error(
      '[OfflineMutationQueue] Cannot get queued mutations in SSR environment'
    );
  }

  const db = getDb();
  await db.ensureOpen();

  const mutations = await db.offlineMutationQueue.toArray();
  return mutations;
}

/**
 * Get mutations with a specific status
 *
 * @param status - Status to filter by
 * @returns Promise resolving to filtered mutations
 *
 * @example
 * const pending = await getMutationsByStatus('pending');
 * const failed = await getMutationsByStatus('failed');
 */
export async function getMutationsByStatus(
  status: OfflineMutationQueueItem['status']
): Promise<OfflineMutationQueueItem[]> {
  if (!isBrowser()) {
    throw new Error(
      '[OfflineMutationQueue] Cannot get mutations in SSR environment'
    );
  }

  const db = getDb();
  await db.ensureOpen();

  return db.offlineMutationQueue.where('status').equals(status).toArray();
}

/**
 * Clear all completed mutations from the queue
 *
 * Deletes mutations with "completed" status to keep the queue clean.
 * This is typically called periodically or after batch processing.
 *
 * @returns Promise resolving to number of deleted mutations
 *
 * @example
 * const deleted = await clearCompletedMutations();
 * console.debug(`Cleaned up ${deleted} completed mutations`);
 */
export async function clearCompletedMutations(): Promise<number> {
  if (!isBrowser()) {
    throw new Error(
      '[OfflineMutationQueue] Cannot clear mutations in SSR environment'
    );
  }

  const db = getDb();
  await db.ensureOpen();

  const completed = await db.offlineMutationQueue
    .where('status')
    .equals('completed')
    .toArray();

  const ids = completed.map((m) => m.id).filter((id): id is number => id !== undefined);

  if (ids.length > 0) {
    await db.offlineMutationQueue.bulkDelete(ids);
    console.debug(
      `[OfflineMutationQueue] Cleared ${ids.length} completed mutations`
    );

    // Update app badge after clearing completed mutations
    await updateAppBadge();
  }

  return ids.length;
}

/**
 * Delete a specific mutation from the queue
 *
 * @param id - Mutation ID to delete
 * @returns Promise resolving when deletion is complete
 *
 * @example
 * await deleteMutation(123);
 */
export async function deleteMutation(id: number): Promise<void> {
  if (!isBrowser()) {
    throw new Error(
      '[OfflineMutationQueue] Cannot delete mutation in SSR environment'
    );
  }

  const db = getDb();
  await db.ensureOpen();

  await db.offlineMutationQueue.delete(id);
  console.debug(`[OfflineMutationQueue] Deleted mutation ${id}`);

  // Update app badge after deletion
  await updateAppBadge();
}

/**
 * Type guard for ServiceWorkerRegistration with Background Sync support
 */
interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  readonly sync: SyncManager;
}

function hasBackgroundSyncSupport(
  registration: ServiceWorkerRegistration
): registration is ServiceWorkerRegistrationWithSync {
  return 'sync' in registration && registration.sync != null;
}

/**
 * Register the queue for Background Sync API processing
 *
 * This allows the browser/OS to process the queue even when the app
 * is closed (after service worker registration).
 * Requires the Background Sync API to be available.
 *
 * @returns Promise resolving to registration success
 *
 * @example
 * try {
 *   await registerBackgroundSync();
 *   console.debug('Background sync registered');
 * } catch (error) {
 *   console.error('Background sync unavailable:', error);
 * }
 */
export async function registerBackgroundSync(): Promise<void> {
  if (!supportsBackgroundSync()) {
    console.warn(
      '[OfflineMutationQueue] Background Sync API not available in this browser'
    );
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!hasBackgroundSyncSupport(registration)) {
      logger.warn('[OfflineMutationQueue] ServiceWorkerRegistration lacks sync property');
      return;
    }
    await registration.sync.register(BACKGROUND_SYNC_TAG);
    console.debug(
      `[OfflineMutationQueue] Background Sync registered (tag: ${BACKGROUND_SYNC_TAG})`
    );
  } catch (error) {
    logger.error('[OfflineMutationQueue] Error registering Background Sync:', error);
    throw error;
  }
}

/**
 * Unregister Background Sync
 *
 * @returns Promise resolving to unregistration success
 *
 * @example
 * await unregisterBackgroundSync();
 */
export async function unregisterBackgroundSync(): Promise<void> {
  if (!supportsBackgroundSync()) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!hasBackgroundSyncSupport(registration)) {
      return;
    }
    await registration.sync.getTags();
    logger.debug('[OfflineMutationQueue] Background Sync unregistered');
  } catch (error) {
    console.error(
      '[OfflineMutationQueue] Error unregistering Background Sync:',
      error
    );
  }
}

/**
 * Get the Background Sync API tag used by this service
 * Useful for coordinating with service workers
 *
 * @returns The sync tag string
 */
export function getBackgroundSyncTag(): string {
  return BACKGROUND_SYNC_TAG;
}

/**
 * Get current queue statistics
 *
 * Optimized to use a single bulk read instead of 5 separate .count() queries.
 * This reduces 5 IndexedDB round-trips to 1, significantly improving performance
 * especially on slower devices or when the queue has many items.
 *
 * @returns Promise resolving to queue statistics
 *
 * @example
 * const stats = await getQueueStats();
 * console.debug(`Pending: ${stats.pending}, Retrying: ${stats.retrying}, Failed: ${stats.failed}`);
 */
export async function getQueueStats(): Promise<{
  total: number;
  pending: number;
  retrying: number;
  failed: number;
  completed: number;
  oldestMutation: OfflineMutationQueueItem | null;
}> {
  if (!isBrowser()) {
    throw new Error(
      '[OfflineMutationQueue] Cannot get stats in SSR environment'
    );
  }

  const db = getDb();
  await db.ensureOpen();

  // Single bulk read: fetch all items and count in JavaScript
  // This is more efficient than 5 separate .count() queries because:
  // 1. Reduces IndexedDB round-trips from 5 to 1
  // 2. For typical queue sizes (<1000 items), in-memory counting is fast
  // 3. We need the oldest item anyway, so we avoid an extra query
  const allItems = await db.offlineMutationQueue.toArray();

  // Count by status in a single pass
  let pending = 0;
  let retrying = 0;
  let failed = 0;
  let completed = 0;
  let oldestMutation: OfflineMutationQueueItem | null = null;

  for (const item of allItems) {
    // Count by status
    switch (item.status) {
      case 'pending':
        pending++;
        break;
      case 'retrying':
        retrying++;
        break;
      case 'failed':
        failed++;
        break;
      case 'completed':
        completed++;
        break;
    }

    // Track oldest item by createdAt
    if (oldestMutation === null || item.createdAt < oldestMutation.createdAt) {
      oldestMutation = item;
    }
  }

  return {
    total: allItems.length,
    pending,
    retrying,
    failed,
    completed,
    oldestMutation,
  };
}

// ==================== PRIVATE FUNCTIONS ====================

/**
 * Process a single mutation
 * Internal function called by processQueue()
 */
async function processMutation(
  mutation: OfflineMutationQueueItem
): Promise<ProcessMutationResult> {
  const db = getDb();
  const mutationId = mutation.id ?? 0;

  // Check if we're online before attempting
  if (!navigator.onLine) {
    console.debug(
      `[OfflineMutationQueue] Skipping mutation ${mutationId}: offline`
    );
    return {
      id: mutationId,
      success: false,
      status: 'retrying',
      error: 'Offline',
    };
  }

  try {
    // Update status to retrying
    await db.offlineMutationQueue.update(mutationId, {
      status: 'retrying',
    });

    // Attempt the fetch
    const response = await fetchWithTimeout(mutation.url, {
      method: mutation.method,
      body: mutation.body,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Check if successful
    if (response.ok) {
      await db.offlineMutationQueue.update(mutationId, {
        status: 'completed',
      });

      console.debug(
        `[OfflineMutationQueue] Mutation ${mutationId} completed: ${mutation.method} ${mutation.url}`
      );

      return {
        id: mutationId,
        success: true,
        status: 'completed',
        response: {
          status: response.status,
          statusText: response.statusText,
        },
      };
    } else {
      // Non-2xx response - may retry
      throw new Error(
        `HTTP ${response.status}: ${response.statusText}`
      );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    // Check if we should retry
    const shouldRetry =
      mutation.retries < MAX_RETRIES &&
      !isNonRetryableError(errorMessage);

    if (shouldRetry) {
      const nextRetryTime =
        Date.now() + calculateBackoffDelay(mutation.retries);

      await db.offlineMutationQueue.update(mutationId, {
        status: 'retrying',
        retries: mutation.retries + 1,
        lastError: errorMessage,
        nextRetry: nextRetryTime,
      });

      console.debug(
        `[OfflineMutationQueue] Mutation ${mutationId} queued for retry (attempt ${mutation.retries + 1}/${MAX_RETRIES}): ${errorMessage}`
      );

      return {
        id: mutationId,
        success: false,
        status: 'retrying',
        error: errorMessage,
      };
    } else {
      // Max retries exceeded or non-retryable error
      await db.offlineMutationQueue.update(mutationId, {
        status: 'failed',
        lastError: errorMessage,
      });

      console.error(
        `[OfflineMutationQueue] Mutation ${mutationId} failed permanently: ${errorMessage}`
      );

      return {
        id: mutationId,
        success: false,
        status: 'failed',
        error: errorMessage,
      };
    }
  }
}

/**
 * Determine if an error should prevent retry
 */
function isNonRetryableError(errorMessage: string): boolean {
  // 4xx errors (except 429) are typically not retryable
  const fourxxMatch = errorMessage.match(/HTTP (\d{3})/);
  if (fourxxMatch) {
    const status = parseInt(fourxxMatch[1], 10);
    if (status >= 400 && status < 500 && status !== 429) {
      return true;
    }
  }

  return false;
}
