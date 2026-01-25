/**
 * Navigation API utilities for Chrome 102+
 * Enhanced navigation handling with intercept and transition support
 *
 * APIs Implemented:
 * - Navigation API (Chrome 102+) for enhanced navigation control
 * - View Transitions API (Chrome 111+) for smooth transitions
 * - History API fallback for older browsers
 * - Navigation state persistence using entries()
 *
 * Optimized for Apple Silicon (M-series) + macOS 26.2 + Chrome 143+
 */

import { browser } from '$app/environment';

// ==================== TYPE DEFINITIONS ====================

/**
 * Navigation API entry from history stack
 */
export interface NavigationHistoryEntry {
  key: string;
  id: string;
  index: number;
  url: string;
  state?: unknown;
}

/**
 * Navigation event triggered by Navigation API
 */
export interface NavigateEvent extends Event {
  navigationType: NavigationType;
  destination: NavigationDestination;
  canIntercept: boolean;
  userInitiated: boolean;
  hashChange: boolean;
  signal: AbortSignal;
  intercept(options?: NavigateInterceptOptions): void;
  scroll(): void;
}

export type NavigationType = 'push' | 'replace' | 'reload' | 'traverse';

export interface NavigationDestination {
  url: string;
  key?: string;
  id?: string;
  index?: number;
  state?: unknown;
  sameDocument?: boolean;
  historyEntry?: NavigationHistoryEntry;
}

export interface NavigateInterceptOptions {
  handler?: () => Promise<void> | void;
}

/**
 * Navigation options for navigate()
 */
export interface NavigationOptions {
  state?: unknown;
  info?: unknown;
  history?: 'auto' | 'push' | 'replace';
  scroll?: 'auto' | 'manual';
}

/**
 * Navigation result
 */
export interface NavigationResult {
  committed: Promise<NavigationHistoryEntry>;
  finished: Promise<NavigationHistoryEntry>;
}

/**
 * Navigation state for persistence
 */
export interface NavigationState {
  url: string;
  key: string;
  id: string;
  index: number;
  timestamp: number;
  state?: unknown;
}

/**
 * Capabilities detection
 */
export interface NavigationApiCapabilities {
  supported: boolean;
  viewTransitionsSupported: boolean;
  intersectionObserverSupported: boolean;
}

// ==================== FEATURE DETECTION ====================

/**
 * Check if Navigation API is supported
 */
export function isNavigationApiSupported(): boolean {
  if (!browser) return false;
  return 'navigation' in window && typeof (window as any).navigation === 'object';
}

/**
 * Check if View Transitions API is supported
 */
export function isViewTransitionsSupported(): boolean {
  if (!browser) return false;
  return 'startViewTransition' in document;
}

/**
 * Detect all navigation-related capabilities
 */
export function detectNavigationCapabilities(): NavigationApiCapabilities {
  return {
    supported: isNavigationApiSupported(),
    viewTransitionsSupported: isViewTransitionsSupported(),
    intersectionObserverSupported: 'IntersectionObserver' in window
  };
}

// ==================== CORE NAVIGATION API ====================

/**
 * Get the Navigation API object (if supported)
 */
function getNavigationAPI(): any {
  if (!browser || !isNavigationApiSupported()) {
    return null;
  }
  return (window as any).navigation;
}

/**
 * Get current navigation entry (most recent in history)
 */
export function getCurrentEntry(): NavigationHistoryEntry | null {
  const nav = getNavigationAPI();
  if (!nav || !nav.currentEntry) return null;

  return {
    key: nav.currentEntry.key,
    id: nav.currentEntry.id,
    index: nav.currentEntry.index,
    url: nav.currentEntry.url,
    state: nav.currentEntry.getState?.()
  };
}

/**
 * Navigate to a URL with optional view transition
 */
export async function navigateWithTransition(
  url: string,
  options?: NavigationOptions
): Promise<void> {
  if (!browser) return;

  // Use View Transitions API if supported
  if (isViewTransitionsSupported()) {
    try {
      await (document as any).startViewTransition(async () => {
        await performNavigation(url, options);
      }).finished;
      return;
    } catch {
      // Fall back to regular navigation
    }
  }

  await performNavigation(url, options);
}

/**
 * Internal: Perform navigation using Navigation API or History API
 */
async function performNavigation(
  url: string,
  options?: NavigationOptions
): Promise<void> {
  const nav = getNavigationAPI();

  if (nav) {
    try {
      const result = nav.navigate(url, {
        state: options?.state,
        info: options?.info,
        history: options?.history || 'auto'
      });

      // Wait for navigation to complete
      await result.finished;
      return;
    } catch (error) {
      console.warn('Navigation API failed, falling back to History API:', error);
    }
  }

  // Fallback to History API
  const historyMethod = options?.history === 'replace' ? 'replaceState' : 'pushState';
  window.history[historyMethod](options?.state, '', url);

  // Manual navigation for SPA-like behavior
  // This will trigger the SvelteKit router
  if (window.location.pathname + window.location.search !== url) {
    window.location.href = url;
  }
}

/**
 * Reload the current page with fresh data
 */
export async function reloadWithFreshData(): Promise<void> {
  if (!browser) return;

  const nav = getNavigationAPI();

  if (nav) {
    try {
      await nav.reload().finished;
      return;
    } catch {
      // Fall back
    }
  }

  // Fallback: Force reload bypassing cache
  window.location.reload();
}

/**
 * Navigate to a specific history entry by key
 */
export async function traverseTo(key: string): Promise<void> {
  if (!browser) return;

  const nav = getNavigationAPI();
  if (!nav) {
    console.warn('Navigation API not supported');
    return;
  }

  const entries = nav.entries?.();
  if (!entries) {
    console.warn('Navigation entries not available');
    return;
  }

  const targetEntry = entries.find((e: any) => e.key === key);
  if (!targetEntry) {
    console.warn(`Entry with key "${key}" not found`);
    return;
  }

  const targetIndex = targetEntry.index;
  const currentIndex = nav.currentEntry?.index;

  if (currentIndex === undefined) {
    console.warn('Current index not available');
    return;
  }

  const difference = targetIndex - currentIndex;

  try {
    await nav.traverseTo(key).finished;
  } catch (error) {
    console.warn('traverseTo failed, using History API:', error);
    window.history.go(difference);
  }
}

/**
 * Navigate back in history
 */
export async function navigateBack(): Promise<void> {
  if (!browser) return;

  const nav = getNavigationAPI();
  if (!nav) {
    window.history.back();
    return;
  }

  try {
    const entries = nav.entries?.();
    if (entries && nav.currentEntry) {
      const targetEntry = entries[nav.currentEntry.index - 1];
      if (targetEntry) {
        await nav.traverseTo(targetEntry.key).finished;
        return;
      }
    }
  } catch {
    // Fall back
  }

  window.history.back();
}

/**
 * Navigate forward in history
 */
export async function navigateForward(): Promise<void> {
  if (!browser) return;

  const nav = getNavigationAPI();
  if (!nav) {
    window.history.forward();
    return;
  }

  try {
    const entries = nav.entries?.();
    if (entries && nav.currentEntry) {
      const targetEntry = entries[nav.currentEntry.index + 1];
      if (targetEntry) {
        await nav.traverseTo(targetEntry.key).finished;
        return;
      }
    }
  } catch {
    // Fall back
  }

  window.history.forward();
}

/**
 * Get all navigation history entries
 */
export function getNavigationEntries(): NavigationHistoryEntry[] {
  if (!browser) return [];

  const nav = getNavigationAPI();
  if (!nav || !nav.entries) return [];

  try {
    const entries = nav.entries();
    return entries.map((entry: any) => ({
      key: entry.key,
      id: entry.id,
      index: entry.index,
      url: entry.url,
      state: entry.getState?.()
    }));
  } catch {
    return [];
  }
}

/**
 * Get the current index in navigation history
 */
export function getCurrentIndex(): number {
  if (!browser) return -1;

  const nav = getNavigationAPI();
  if (!nav || !nav.currentEntry) return -1;

  return nav.currentEntry.index;
}

/**
 * Check if we can navigate back
 */
export function canNavigateBack(): boolean {
  const currentIndex = getCurrentIndex();
  return currentIndex > 0;
}

/**
 * Check if we can navigate forward
 */
export function canNavigateForward(): boolean {
  if (!browser) return false;

  const nav = getNavigationAPI();
  if (!nav) return false;

  const entries = nav.entries?.();
  if (!entries || !nav.currentEntry) return false;

  return nav.currentEntry.index < entries.length - 1;
}

// ==================== NAVIGATION INTERCEPTION ====================

/**
 * Intercept navigation events for custom handling
 * Returns cleanup function to remove listener
 */
export function interceptNavigation(
  handler: (event: NavigateEvent) => void | Promise<void>
): () => void {
  if (!browser) return () => {};

  const nav = getNavigationAPI();
  if (!nav) {
    console.warn('Navigation API not supported, cannot intercept navigation');
    return () => {};
  }

  const listener = (event: any) => {
    // Intentional fire-and-forget: handler execution is tracked by event.intercept()
    // Navigation interception doesn't require awaiting the handler result
    void Promise.resolve(handler(event)).catch(err => {
      console.error('Navigation intercept handler error:', err);
    });
  };

  nav.addEventListener('navigate', listener);

  // Return cleanup function
  return () => {
    nav.removeEventListener('navigate', listener);
  };
}

/**
 * Intercept navigation with automatic prefetch
 */
export function interceptNavigationWithPrefetch(
  prefetchFn: (url: string) => Promise<void>
): () => void {
  return interceptNavigation(async (event) => {
    if (!event.canIntercept || event.hashChange) {
      return;
    }

    try {
      await prefetchFn(event.destination.url);
    } catch (error) {
      console.warn('Prefetch failed:', error);
    }
  });
}

// ==================== STATE PERSISTENCE ====================

const NAVIGATION_STATE_STORAGE_KEY = 'dmb-almanac-nav-state';

/**
 * Save current navigation state to localStorage for recovery
 */
export function saveNavigationState(): void {
  if (!browser) return;

  const currentEntry = getCurrentEntry();
  if (!currentEntry) return;

  const state: NavigationState = {
    url: currentEntry.url,
    key: currentEntry.key,
    id: currentEntry.id,
    index: currentEntry.index,
    timestamp: Date.now(),
    state: currentEntry.state
  };

  try {
    localStorage.setItem(NAVIGATION_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save navigation state:', error);
  }
}

/**
 * Restore navigation state from localStorage
 */
export function restoreNavigationState(): NavigationState | null {
  if (!browser) return null;

  try {
    const stored = localStorage.getItem(NAVIGATION_STATE_STORAGE_KEY);
    if (!stored) return null;

    return JSON.parse(stored) as NavigationState;
  } catch (error) {
    console.warn('Failed to restore navigation state:', error);
    return null;
  }
}

/**
 * Clear saved navigation state
 */
export function clearNavigationState(): void {
  if (!browser) return;

  try {
    localStorage.removeItem(NAVIGATION_STATE_STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

// ==================== NAVIGATION MONITORING ====================

export interface NavigationListener {
  onNavigationStart?: (event: NavigateEvent) => void;
  onNavigationSuccess?: (entry: NavigationHistoryEntry) => void;
  onNavigationError?: (error: Error) => void;
}

/**
 * Set up comprehensive navigation monitoring
 */
export function setupNavigationMonitoring(listener: NavigationListener): () => void {
  if (!browser) return () => {};

  const nav = getNavigationAPI();
  if (!nav) {
    console.warn('Navigation API not supported, cannot setup monitoring');
    return () => {};
  }

  const navigationHandler = async (event: any) => {
    listener.onNavigationStart?.(event);

    if (!event.canIntercept || event.hashChange) {
      return;
    }

    event.intercept({
      handler: async () => {
        try {
          listener.onNavigationSuccess?.(event.destination);
        } catch (error) {
          listener.onNavigationError?.(error instanceof Error ? error : new Error(String(error)));
        }
      }
    });
  };

  nav.addEventListener('navigate', navigationHandler);

  return () => {
    nav.removeEventListener('navigate', navigationHandler);
  };
}

// ==================== NAVIGATION STATE TRACKING ====================

export interface NavigationStateStore {
  currentEntry: NavigationHistoryEntry | null;
  entries: NavigationHistoryEntry[];
  canGoBack: boolean;
  canGoForward: boolean;
  isNavigating: boolean;
}

/**
 * Create a reactive navigation state store
 */
export function createNavigationStateStore(): NavigationStateStore {
  const updateState = () => ({
    currentEntry: getCurrentEntry(),
    entries: getNavigationEntries(),
    canGoBack: canNavigateBack(),
    canGoForward: canNavigateForward(),
    isNavigating: false
  });

  return updateState();
}

/**
 * Watch for navigation changes and notify callback
 */
export function onNavigationChange(callback: (state: NavigationStateStore) => void): () => void {
  if (!browser) return () => {};

  // Initial state
  callback(createNavigationStateStore());

  // Set up listeners
  const cleanups = [
    setupNavigationMonitoring({
      onNavigationStart: () => {
        const state = createNavigationStateStore();
        state.isNavigating = true;
        callback(state);
      },
      onNavigationSuccess: () => {
        const state = createNavigationStateStore();
        state.isNavigating = false;
        callback(state);
      },
      onNavigationError: () => {
        const state = createNavigationStateStore();
        state.isNavigating = false;
        callback(state);
      }
    })
  ];

  // Also listen to scroll restoration
  // Passive flag: We never preventDefault on scroll, improves scroll performance
  const scrollHandler = () => {
    const state = createNavigationStateStore();
    callback(state);
  };
  window.addEventListener('scroll', scrollHandler, { passive: true });

  // Cleanup function
  return () => {
    cleanups.forEach(cleanup => cleanup?.());
    window.removeEventListener('scroll', scrollHandler);
  };
}

// ==================== INITIALIZATION ====================

let initialized = false;
let currentCleanup: (() => void) | null = null;
let currentInterval: number | null = null;
let beforeUnloadHandler: (() => void) | null = null;

/**
 * Initialize Navigation API utilities
 * Call this once during app startup
 * Subsequent calls will clean up previous listeners before reinitializing
 */
export function initializeNavigationApi(): void {
  if (!browser) return;

  // Clean up previous initialization if called multiple times
  if (initialized) {
    deinitializeNavigationApi();
  }

  initialized = true;

  if (!isNavigationApiSupported()) {
    console.info('Navigation API not supported, using History API fallback');
    return;
  }

  // Set up automatic state persistence
  currentCleanup = setupNavigationMonitoring({
    onNavigationSuccess: () => {
      saveNavigationState();
    }
  });

  // Save state periodically
  currentInterval = window.setInterval(() => {
    saveNavigationState();
  }, 5000);

  // Cleanup on page unload - create new handler for proper cleanup
  beforeUnloadHandler = () => {
    saveNavigationState();
    if (currentInterval) {
      clearInterval(currentInterval);
    }
    if (currentCleanup) {
      currentCleanup();
    }
  };

  window.addEventListener('beforeunload', beforeUnloadHandler);

  console.info('Navigation API initialized');
}

/**
 * Deinitialize Navigation API and clean up all listeners
 * Useful for hot reloading or re-initialization
 */
export function deinitializeNavigationApi(): void {
  if (!initialized) return;

  // Clear interval
  if (currentInterval) {
    clearInterval(currentInterval);
    currentInterval = null;
  }

  // Call cleanup function
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  // Remove beforeunload listener
  if (beforeUnloadHandler) {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    beforeUnloadHandler = null;
  }

  initialized = false;
  console.info('Navigation API deinitialized');
}

// ==================== INTEGRATION HELPERS ====================

/**
 * Navigate with View Transitions and analytics
 */
export async function navigateWithTracking(
  url: string,
  options?: NavigationOptions & { trackingInfo?: Record<string, unknown> }
): Promise<void> {
  const { trackingInfo, ...navOptions } = options || {};

  // Track navigation
  if (trackingInfo && typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'page_view', {
      page_path: url,
      ...trackingInfo
    });
  }

  await navigateWithTransition(url, navOptions);
}

/**
 * Navigate and wait for data to load
 */
export async function navigateAndWaitForData(
  url: string,
  loadDataFn: (url: string) => Promise<void>,
  options?: NavigationOptions
): Promise<void> {
  // Start loading data in parallel
  const dataPromise = loadDataFn(url);

  // Start navigation with transition
  const navPromise = navigateWithTransition(url, options);

  // Wait for both to complete
  await Promise.all([dataPromise, navPromise]);
}
