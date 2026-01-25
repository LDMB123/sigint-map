/**
 * Navigation Store - Svelte Rune-based reactive navigation state
 * Integrates Navigation API with SvelteKit and View Transitions
 *
 * Provides reactive access to:
 * - Current navigation entry
 * - Navigation history
 * - Back/forward availability
 * - Navigation loading state
 * - Navigation error handling
 */

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { errorLogger } from '$lib/errors/logger';
import { NavigationError } from '$lib/errors/types';
import {
  isNavigationApiSupported,
  getCurrentEntry,
  getNavigationEntries,
  canNavigateBack,
  canNavigateForward,
  // getCurrentIndex available via navigation API
  setupNavigationMonitoring,
  saveNavigationState,
  navigateBack,
  navigateForward,
  navigateWithTransition,
  initializeNavigationApi,
  // NavigationHistoryEntry type available for entry typing
  type NavigationStateStore
} from '$lib/utils/navigationApi';

// ==================== STATE ====================

export const navigationStore = (() => {
  const initialState: NavigationStateStore = {
    currentEntry: null,
    entries: [],
    canGoBack: false,
    canGoForward: false,
    isNavigating: false
  };

  const { subscribe, set, update } = writable<NavigationStateStore>(initialState);

  return {
    subscribe,
    set,
    update,
    initialize,
    goBack,
    goForward,
    goTo,
    refresh
  };

  function initialize(): (() => void) | void {
    if (!browser) return;

    // Initialize Navigation API
    initializeNavigationApi();

    // Update state immediately
    refresh();

    // Set up monitoring
    const cleanup = setupNavigationMonitoring({
      onNavigationStart: () => {
        update(state => ({ ...state, isNavigating: true }));
      },
      onNavigationSuccess: () => {
        refresh();
        update(state => ({ ...state, isNavigating: false }));
        saveNavigationState();
      },
      onNavigationError: (error) => {
        console.error('Navigation error:', error);
        update(state => ({ ...state, isNavigating: false }));
      }
    });

    // Cleanup on page unload
    const unloadHandler = () => {
      cleanup();
    };

    window.addEventListener('beforeunload', unloadHandler);

    return () => {
      cleanup();
      window.removeEventListener('beforeunload', unloadHandler);
    };
  }

  async function goBack(): Promise<void> {
    update(state => ({ ...state, isNavigating: true }));
    try {
      await navigateBack();
      errorLogger.debug('[Navigation] Successfully navigated back');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errorLogger.error(
        '[Navigation] Back navigation failed',
        new NavigationError('back', errorMessage, error instanceof Error ? error : undefined),
        { operation: 'goBack' }
      );
      // Re-throw to allow callers to handle
      throw new NavigationError(
        'back',
        errorMessage,
        error instanceof Error ? error : undefined,
        { operation: 'goBack' }
      );
    } finally {
      refresh();
      update(state => ({ ...state, isNavigating: false }));
    }
  }

  async function goForward(): Promise<void> {
    update(state => ({ ...state, isNavigating: true }));
    try {
      await navigateForward();
      errorLogger.debug('[Navigation] Successfully navigated forward');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errorLogger.error(
        '[Navigation] Forward navigation failed',
        new NavigationError('forward', errorMessage, error instanceof Error ? error : undefined),
        { operation: 'goForward' }
      );
      // Re-throw to allow callers to handle
      throw new NavigationError(
        'forward',
        errorMessage,
        error instanceof Error ? error : undefined,
        { operation: 'goForward' }
      );
    } finally {
      refresh();
      update(state => ({ ...state, isNavigating: false }));
    }
  }

  async function goTo(url: string, state?: unknown): Promise<void> {
    update(s => ({ ...s, isNavigating: true }));
    try {
      await navigateWithTransition(url, { state });
    } finally {
      refresh();
      update(s => ({ ...s, isNavigating: false }));
    }
  }

  function refresh(): void {
    set({
      currentEntry: getCurrentEntry(),
      entries: getNavigationEntries(),
      canGoBack: canNavigateBack(),
      canGoForward: canNavigateForward(),
      isNavigating: false
    });
  }
})();

// ==================== DERIVED STORES ====================

/**
 * Whether Navigation API is supported
 */
export const isNavigationSupported = derived(navigationStore, () => isNavigationApiSupported());

/**
 * Current URL
 */
export const currentUrl = derived(navigationStore, state => state.currentEntry?.url || '');

/**
 * Current navigation index
 */
export const currentNavigationIndex = derived(navigationStore, state => state.currentEntry?.index ?? -1);

/**
 * Total history entries count
 */
export const historySize = derived(navigationStore, state => state.entries.length);

/**
 * Can navigate back
 */
export const canGoBack = derived(navigationStore, state => state.canGoBack);

/**
 * Can navigate forward
 */
export const canGoForward = derived(navigationStore, state => state.canGoForward);

/**
 * Is currently navigating
 */
export const isNavigating = derived(navigationStore, state => state.isNavigating);

/**
 * All history entries
 */
export const historyEntries = derived(navigationStore, state => state.entries);

// ==================== INITIALIZATION ====================

export function initializeNavigation(): void {
  if (!browser) return;
  navigationStore.initialize();
}
