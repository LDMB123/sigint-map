/**
 * App Badge API utilities for showing unread/pending counts
 * Useful for showing pending offline mutations count
 * Supports Chrome 81+, Edge 81+, and other modern browsers
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Badging_API
 */

// TypeScript declarations for Badge API
declare global {
  interface Navigator {
    setAppBadge(contents?: number): Promise<void>;
    clearAppBadge(): Promise<void>;
  }
}

/**
 * Check if App Badge API is supported
 * @returns true if Badge API is available in the current browser
 */
export function isAppBadgeSupported(): boolean {
  return typeof navigator !== 'undefined' && 'setAppBadge' in navigator;
}

/**
 * Set the app badge to show a count
 * @param count - Number to display (0 clears the badge)
 * @returns true if badge was set successfully, false if not supported or error occurred
 */
export async function setAppBadge(count: number): Promise<boolean> {
  if (!isAppBadgeSupported()) return false;

  try {
    if (count > 0) {
      await navigator.setAppBadge(count);
    } else {
      await navigator.clearAppBadge();
    }
    return true;
  } catch (error) {
    console.warn('[AppBadge] Failed to set badge:', error);
    return false;
  }
}

/**
 * Clear the app badge
 * @returns true if badge was cleared successfully, false if not supported or error occurred
 */
export async function clearAppBadge(): Promise<boolean> {
  return setAppBadge(0);
}

/**
 * Update badge based on pending mutations count
 * Call this when mutation queue changes
 */
export async function updateBadgeFromMutationQueue(): Promise<void> {
  // Dynamic import to avoid circular dependencies
  const { getQueueStats } = await import('$lib/services/offlineMutationQueue');
  const stats = await getQueueStats();
  const pendingCount = stats.pending + stats.retrying;
  await setAppBadge(pendingCount);
}
