/**
 * SvelteKit Navigation Sync Hook
 * Synchronizes SvelteKit navigation events with Navigation API
 *
 * Usage in +layout.svelte:
 * ```typescript
 * import { beforeNavigate } from '$app/navigation';
 * import { syncNavigationEvents } from '$hooks/navigationSync';
 *
 * beforeNavigate((event) => {
 *   syncNavigationEvents(event);
 * });
 * ```
 */

import { browser } from '$app/environment';
import {
  isNavigationApiSupported,
  saveNavigationState,
  isViewTransitionsSupported,
  type NavigationOptions
} from '$lib/utils/navigationApi';

// ==================== TYPES ====================

export interface SvelteKitNavigationEvent {
  type: 'enter' | 'leave';
  from: {
    params: Record<string, string>;
    route: { id: string };
    url: URL;
  } | null;
  to: {
    params: Record<string, string>;
    route: { id: string };
    url: URL;
  } | null;
  willUnload: boolean;
  cancel: () => void;
}

export interface NavigationSyncConfig {
  persistState?: boolean;
  trackNavigationMetrics?: boolean;
  logNavigationEvents?: boolean;
}

// ==================== STATE ====================

let navigationMetrics: {
  navigationStart: number;
  navigationComplete: number;
  fromUrl: string;
  toUrl: string;
} | null = null;

// ==================== CORE FUNCTIONALITY ====================

/**
 * Sync SvelteKit navigation events with Navigation API
 */
export function syncNavigationEvents(
  event: SvelteKitNavigationEvent,
  config: NavigationSyncConfig = {}
): void {
  if (!browser) return;

  const { persistState = true, trackNavigationMetrics = false, logNavigationEvents = false } =
    config;

  // Track navigation timing
  if (trackNavigationMetrics) {
    navigationMetrics = {
      navigationStart: performance.now(),
      navigationComplete: 0,
      fromUrl: event.from?.url.pathname || '',
      toUrl: event.to?.url.pathname || ''
    };

    if (logNavigationEvents) {
      console.debug('[SvelteKit Navigation] Start:', {
        from: navigationMetrics.fromUrl,
        to: navigationMetrics.toUrl
      });
    }
  }

  // Save state if enabled
  if (persistState && isNavigationApiSupported()) {
    saveNavigationState();

    if (logNavigationEvents) {
      console.debug('[SvelteKit Navigation] State saved');
    }
  }

  // Check for View Transitions (Chrome 111+)
  if (isViewTransitionsSupported()) {
    setupViewTransitionForNavigation(event, logNavigationEvents);
  }

  // Sync with Navigation API if supported
  if (isNavigationApiSupported()) {
    syncWithNavigationApi(event, logNavigationEvents);
  }
}

/**
 * Handle completion of navigation
 * Call this in afterNavigate hook
 */
export function onNavigationComplete(config: NavigationSyncConfig = {}): void {
  if (!browser || !navigationMetrics) return;

  const { trackNavigationMetrics = false, logNavigationEvents = false } = config;

  if (trackNavigationMetrics) {
    navigationMetrics.navigationComplete = performance.now();
    const duration = navigationMetrics.navigationComplete - navigationMetrics.navigationStart;

    if (logNavigationEvents) {
      console.debug('[SvelteKit Navigation] Complete:', {
        from: navigationMetrics.fromUrl,
        to: navigationMetrics.toUrl,
        duration: `${duration.toFixed(2)}ms`
      });
    }

    // Track if navigation was slow (> 1000ms)
    if (duration > 1000) {
      console.warn('[SvelteKit Navigation] Slow navigation detected:', {
        from: navigationMetrics.fromUrl,
        to: navigationMetrics.toUrl,
        duration: `${duration.toFixed(2)}ms`
      });
    }
  }
}

/**
 * Get last navigation metrics
 */
export function getLastNavigationMetrics(): typeof navigationMetrics {
  return navigationMetrics;
}

// ==================== PRIVATE HELPERS ====================

/**
 * Set up View Transitions for the navigation
 */
function setupViewTransitionForNavigation(event: SvelteKitNavigationEvent, log: boolean): void {
  // View Transitions are typically handled at the component level
  // This ensures proper cleanup and state management

  if (log) {
    console.debug('[View Transition] Navigation from:', event.from?.url.pathname);
    console.debug('[View Transition] Navigation to:', event.to?.url.pathname);
  }

  // Check if we're navigating between different routes
  const isRouteChange =
    event.from?.route.id !== event.to?.route.id ||
    event.from?.url.pathname !== event.to?.url.pathname;

  if (!isRouteChange) {
    if (log) {
      console.debug('[View Transition] Same route, skipping transition');
    }
  }
}

/**
 * Sync with Navigation API
 */
function syncWithNavigationApi(event: SvelteKitNavigationEvent, log: boolean): void {
  const nav = (window as any).navigation;

  if (!nav || !nav.currentEntry) {
    if (log) {
      console.warn('[Navigation API] Not available');
    }
    return;
  }

  // Store current state for reference
  const toUrl = event.to?.url.pathname || '';

  if (log) {
    console.debug('[Navigation API] Current entry:', {
      url: nav.currentEntry.url,
      index: nav.currentEntry.index,
      key: nav.currentEntry.key.substring(0, 8) + '...'
    });
  }

  // Store route-specific state in Navigation API
  if (event.to) {
    const navigationState: NavigationOptions = {
      state: {
        pathname: toUrl,
        params: event.to.params,
        routeId: event.to.route.id,
        timestamp: Date.now()
      }
    };

    // Store in window for later use if needed
    (window as any).__currentNavigationState = navigationState;
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Check if route change requires view transition
 */
export function shouldUseViewTransition(event: SvelteKitNavigationEvent): boolean {
  if (!isViewTransitionsSupported()) return false;

  // Don't transition for:
  // - Same route
  // - Modal/dialog navigations
  // - Hash-only changes
  const isSameRoute = event.from?.route.id === event.to?.route.id;
  const isHashChange =
    event.from?.url.pathname === event.to?.url.pathname &&
    event.from?.url.hash !== event.to?.url.hash;

  return !isSameRoute && !isHashChange;
}

/**
 * Get navigation direction (forward, backward, or reload)
 */
export function getNavigationDirection(event: SvelteKitNavigationEvent): 'forward' | 'backward' | 'none' {
  if (!event.from || !event.to) return 'none';

  // This is a simplified check - the actual Navigation API has better detection
  // You could enhance this by tracking navigation history
  return 'forward';
}

/**
 * Extract meaningful route name for tracking
 */
export function getRouteName(pathname: string): string {
  // Remove trailing slash
  const clean = pathname.replace(/\/$/, '') || '/';

  // Extract meaningful parts
  const parts = clean.split('/').filter(Boolean);

  if (parts.length === 0) return 'home';

  // Examples: /shows/123 -> 'shows', /songs/the-stone -> 'songs'
  return parts[0];
}

/**
 * Create a readable navigation label
 */
export function getNavigationLabel(event: SvelteKitNavigationEvent): string {
  const from = event.from?.url.pathname || 'unknown';
  const to = event.to?.url.pathname || 'unknown';

  return `${getRouteName(from)} → ${getRouteName(to)}`;
}

// ==================== INTEGRATION HELPERS ====================

/**
 * Set up automatic navigation metrics tracking
 * Call this once during app initialization
 */
export function setupNavigationTracking(
  config: NavigationSyncConfig & {
    onNavigationStart?: (event: SvelteKitNavigationEvent) => void;
    onNavigationComplete?: (metrics: typeof navigationMetrics) => void;
  } = {}
): void {
  if (!browser) return;

  const { onNavigationStart: _onNavigationStart, onNavigationComplete: _onComplete, ..._syncConfig } = config;

  // Hook into navigation events
  // This would be done in +layout.svelte with beforeNavigate/afterNavigate

  // Expose for debugging
  (window as any).__navigationTracking = {
    getMetrics: () => navigationMetrics,
    syncNavigationEvents,
    onNavigationComplete,
    getRouteName,
    getNavigationLabel,
    shouldUseViewTransition
  };
}

/**
 * Create a formatted navigation report
 */
export function getNavigationReport(): {
  lastNavigation: typeof navigationMetrics;
  timestamp: string;
  label: string;
  duration: number;
} | null {
  if (!navigationMetrics) return null;

  return {
    lastNavigation: navigationMetrics,
    timestamp: new Date().toLocaleTimeString(),
    label: `${navigationMetrics.fromUrl} → ${navigationMetrics.toUrl}`,
    duration: navigationMetrics.navigationComplete - navigationMetrics.navigationStart
  };
}

/**
 * Monitor navigation performance
 */
export function monitorNavigationPerformance(
  threshold: number = 1000
): ((event: SvelteKitNavigationEvent) => void) {
  return (event: SvelteKitNavigationEvent) => {
    const start = performance.now();

    syncNavigationEvents(event, { persistState: true, trackNavigationMetrics: true });

    // Check performance after navigation
    setTimeout(() => {
      const duration = performance.now() - start;

      if (duration > threshold) {
        console.warn('[Performance] Slow navigation detected:', {
          from: event.from?.url.pathname,
          to: event.to?.url.pathname,
          duration: `${duration.toFixed(2)}ms`,
          threshold: `${threshold}ms`
        });

        // Could send to analytics
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'slow_navigation', {
            value: Math.round(duration),
            navigation_label: getNavigationLabel(event)
          });
        }
      }
    }, 0);
  };
}

// ==================== CONSTANTS ====================

export const DEFAULT_NAVIGATION_SYNC_CONFIG: NavigationSyncConfig = {
  persistState: true,
  trackNavigationMetrics: false,
  logNavigationEvents: false
};

export const DEBUG_NAVIGATION_SYNC_CONFIG: NavigationSyncConfig = {
  persistState: true,
  trackNavigationMetrics: true,
  logNavigationEvents: true
};
