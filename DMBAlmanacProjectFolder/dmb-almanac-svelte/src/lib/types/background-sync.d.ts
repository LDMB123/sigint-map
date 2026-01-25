/**
 * Type declarations for Background Sync API
 * https://wicg.github.io/background-sync/spec/
 *
 * These types are not included in standard TypeScript lib.dom.d.ts
 * because Background Sync is not universally supported.
 */

/**
 * SyncManager interface for Background Sync API
 */
interface SyncManager {
  /**
   * Register a sync event with the given tag
   * @param tag - Unique identifier for the sync event
   */
  register(tag: string): Promise<void>;

  /**
   * Get all registered sync tags
   */
  getTags(): Promise<string[]>;
}

/**
 * Extended ServiceWorkerRegistration with sync property
 */
interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  readonly sync: SyncManager;
}

/**
 * Type guard to check if a ServiceWorkerRegistration has Background Sync support
 */
declare function hasBackgroundSync(
  registration: ServiceWorkerRegistration
): registration is ServiceWorkerRegistrationWithSync;
