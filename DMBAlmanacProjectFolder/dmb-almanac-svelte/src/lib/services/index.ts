/**
 * DMB Almanac Services - Main Export
 *
 * Re-exports all services from this directory for convenient importing.
 * Use named imports for tree-shaking optimization.
 *
 * @example
 * // Import specific functions
 * import { queueMutation, processQueue } from '$lib/services';
 *
 * // Or use namespaced imports
 * import * as OfflineQueue from '$lib/services';
 */

export {
  initializeQueue,
  cleanupQueue,
  queueMutation,
  processQueue,
  getQueuedMutations,
  getMutationsByStatus,
  clearCompletedMutations,
  deleteMutation,
  registerBackgroundSync,
  unregisterBackgroundSync,
  getBackgroundSyncTag,
  getQueueStats,
  type QueueMutationOptions,
  type ProcessQueueOptions,
  type ProcessMutationResult,
  type ProcessQueueResult,
} from './offlineMutationQueue';
