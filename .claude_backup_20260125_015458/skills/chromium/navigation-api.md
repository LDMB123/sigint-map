---
name: navigation-api
description: Implement Navigation API for modern SPA navigation patterns with centralized history management and coordination with View Transitions
trigger: /navigation-api
used_by: [full-stack-developer, senior-frontend-engineer]
---

# Navigation API Implementation

Modern navigation control for Single Page Applications using the Navigation API (Chrome 102+). Provides centralized navigation handling, history management, and automatic coordination with View Transitions API.

## When to Use

- Single Page Applications (SPAs) with client-side routing
- Applications needing centralized navigation control
- Replacing or enhancing History API usage
- Coordinating navigation with View Transitions
- Implementing back/forward button handling
- Building navigation-aware components
- Applications requiring navigation state management
- Complex routing scenarios (intercepting navigation, prefetching, etc.)

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| Framework | string | Yes | React, Vue, Svelte, vanilla JS, etc. |
| Router Type | string | No | Client-side router library or custom |
| View Transitions | boolean | No | Whether to integrate with View Transitions API |
| State Management | string | No | How to manage navigation state (store, context, etc.) |

## Steps

### 1. Feature Detection and Basic Usage

```typescript
// utils/navigation.ts

/**
 * Check if Navigation API is supported
 */
export function isNavigationApiSupported(): boolean {
  return 'navigation' in window;
}

/**
 * Navigate with Navigation API
 */
export async function navigate(
  url: string,
  options: {
    state?: any;
    history?: 'auto' | 'push' | 'replace';
  } = {}
): Promise<void> {
  if (!isNavigationApiSupported()) {
    // Fallback to History API
    if (options.history === 'replace') {
      window.history.replaceState(options.state, '', url);
    } else {
      window.history.pushState(options.state, '', url);
    }
    return;
  }

  // Use Navigation API
  await window.navigation.navigate(url, {
    state: options.state,
    history: options.history || 'auto'
  }).finished;
}

/**
 * Navigate back
 */
export async function goBack(): Promise<void> {
  if (!isNavigationApiSupported()) {
    window.history.back();
    return;
  }

  if (!window.navigation.canGoBack) {
    console.warn('Cannot go back');
    return;
  }

  await window.navigation.back().finished;
}

/**
 * Navigate forward
 */
export async function goForward(): Promise<void> {
  if (!isNavigationApiSupported()) {
    window.history.forward();
    return;
  }

  if (!window.navigation.canGoForward) {
    console.warn('Cannot go forward');
    return;
  }

  await window.navigation.forward().finished;
}

/**
 * Get current navigation entry
 */
export function getCurrentEntry() {
  if (!isNavigationApiSupported()) {
    return {
      url: window.location.href,
      key: '',
      id: '',
      index: -1,
      state: window.history.state
    };
  }

  const entry = window.navigation.currentEntry;
  return {
    url: entry.url,
    key: entry.key,
    id: entry.id,
    index: entry.index,
    state: entry.getState()
  };
}
```

### 2. Navigation Interception

Intercept navigation events to add custom behavior:

```typescript
/**
 * Intercept navigation for custom handling
 */
export function interceptNavigation(
  handler: (event: NavigationEvent) => void
): () => void {
  if (!isNavigationApiSupported()) {
    console.warn('Navigation API not supported');
    return () => {};
  }

  const listener = (event: any) => {
    // Skip hash changes if desired
    if (event.hashChange) return;

    // Skip cross-origin navigation
    if (!event.canIntercept) return;

    handler(event);
  };

  window.navigation.addEventListener('navigate', listener);

  // Return cleanup function
  return () => {
    window.navigation.removeEventListener('navigate', listener);
  };
}

/**
 * Example: Intercept navigation with prefetch
 */
export function setupNavigationPrefetch(): () => void {
  return interceptNavigation((event) => {
    event.intercept({
      handler: async () => {
        // Prefetch data for destination
        const url = new URL(event.destination.url);
        await prefetchPageData(url.pathname);

        // Update UI
        updatePageContent(url.pathname);
      }
    });
  });
}
```

### 3. Integration with View Transitions

Combine Navigation API with View Transitions for smooth animated navigation:

```typescript
// utils/navigation-with-transitions.ts

/**
 * Navigate with View Transition
 */
export async function navigateWithTransition(
  url: string,
  options: {
    state?: any;
    history?: 'auto' | 'push' | 'replace';
  } = {}
): Promise<void> {
  if (!isNavigationApiSupported()) {
    // Fallback
    window.location.href = url;
    return;
  }

  // Check if View Transitions supported
  const supportsViewTransitions = 'startViewTransition' in document;

  if (supportsViewTransitions) {
    // Navigate with transition
    const transition = document.startViewTransition(async () => {
      await window.navigation.navigate(url, options).finished;
    });

    await transition.finished;
  } else {
    // Navigate without transition
    await window.navigation.navigate(url, options).finished;
  }
}

/**
 * Setup automatic View Transitions for all navigation
 */
export function setupAutoTransitions(): () => void {
  if (!isNavigationApiSupported() || !('startViewTransition' in document)) {
    return () => {};
  }

  return interceptNavigation((event) => {
    event.intercept({
      handler: async () => {
        // Wrap navigation in View Transition
        await document.startViewTransition(async () => {
          // Navigation will happen automatically
          await event.commit;
        }).finished;
      }
    });
  });
}
```

### 4. Framework Integrations

**React Hook:**

```typescript
// hooks/useNavigation.ts
import { useState, useEffect } from 'react';

interface NavigationState {
  url: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isNavigating: boolean;
}

export function useNavigation() {
  const [state, setState] = useState<NavigationState>({
    url: window.location.href,
    canGoBack: false,
    canGoForward: false,
    isNavigating: false
  });

  useEffect(() => {
    if (!('navigation' in window)) return;

    const updateState = () => {
      setState({
        url: window.location.href,
        canGoBack: window.navigation.canGoBack,
        canGoForward: window.navigation.canGoForward,
        isNavigating: false
      });
    };

    // Listen for navigation events
    window.navigation.addEventListener('navigate', () => {
      setState(prev => ({ ...prev, isNavigating: true }));
    });

    window.navigation.addEventListener('navigatesuccess', updateState);
    window.navigation.addEventListener('navigateerror', updateState);
    window.navigation.addEventListener('currententrychange', updateState);

    updateState();

    return () => {
      // Cleanup listeners
    };
  }, []);

  const navigate = async (url: string) => {
    if ('navigation' in window) {
      await navigateWithTransition(url);
    } else {
      window.location.href = url;
    }
  };

  const back = async () => {
    if ('navigation' in window && window.navigation.canGoBack) {
      await window.navigation.back().finished;
    } else {
      window.history.back();
    }
  };

  const forward = async () => {
    if ('navigation' in window && window.navigation.canGoForward) {
      await window.navigation.forward().finished;
    } else {
      window.history.forward();
    }
  };

  return {
    ...state,
    navigate,
    back,
    forward
  };
}

// Component usage
function BackButton() {
  const { canGoBack, back } = useNavigation();

  return (
    <button disabled={!canGoBack} onClick={back}>
      Back
    </button>
  );
}
```

**Vue 3 Composable:**

```typescript
// composables/useNavigation.ts
import { ref, onMounted, onUnmounted } from 'vue';
import { navigateWithTransition } from '@/utils/navigation';

export function useNavigation() {
  const currentUrl = ref(window.location.href);
  const canGoBack = ref(false);
  const canGoForward = ref(false);
  const isNavigating = ref(false);

  const updateState = () => {
    currentUrl.value = window.location.href;

    if ('navigation' in window) {
      canGoBack.value = window.navigation.canGoBack;
      canGoForward.value = window.navigation.canGoForward;
    }

    isNavigating.value = false;
  };

  const handleNavigate = () => {
    isNavigating.value = true;
  };

  const navigate = async (url: string) => {
    await navigateWithTransition(url);
  };

  const back = async () => {
    if ('navigation' in window && window.navigation.canGoBack) {
      await window.navigation.back().finished;
    } else {
      window.history.back();
    }
  };

  const forward = async () => {
    if ('navigation' in window && window.navigation.canGoForward) {
      await window.navigation.forward().finished;
    } else {
      window.history.forward();
    }
  };

  onMounted(() => {
    if ('navigation' in window) {
      window.navigation.addEventListener('navigate', handleNavigate);
      window.navigation.addEventListener('navigatesuccess', updateState);
      window.navigation.addEventListener('navigateerror', updateState);
    }

    updateState();
  });

  onUnmounted(() => {
    if ('navigation' in window) {
      window.navigation.removeEventListener('navigate', handleNavigate);
      window.navigation.removeEventListener('navigatesuccess', updateState);
      window.navigation.removeEventListener('navigateerror', updateState);
    }
  });

  return {
    currentUrl,
    canGoBack,
    canGoForward,
    isNavigating,
    navigate,
    back,
    forward
  };
}
```

**Svelte Store:**

```typescript
// stores/navigation.ts
import { writable, derived } from 'svelte/store';
import { navigateWithTransition } from '$lib/utils/navigation';

interface NavigationState {
  url: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isNavigating: boolean;
}

function createNavigationStore() {
  const { subscribe, set, update } = writable<NavigationState>({
    url: typeof window !== 'undefined' ? window.location.href : '',
    canGoBack: false,
    canGoForward: false,
    isNavigating: false
  });

  const updateState = () => {
    if (typeof window === 'undefined') return;

    update(state => ({
      ...state,
      url: window.location.href,
      canGoBack: 'navigation' in window ? window.navigation.canGoBack : false,
      canGoForward: 'navigation' in window ? window.navigation.canGoForward : false,
      isNavigating: false
    }));
  };

  const initialize = () => {
    if (typeof window === 'undefined' || !('navigation' in window)) return;

    window.navigation.addEventListener('navigate', () => {
      update(state => ({ ...state, isNavigating: true }));
    });

    window.navigation.addEventListener('navigatesuccess', updateState);
    window.navigation.addEventListener('navigateerror', updateState);

    updateState();
  };

  return {
    subscribe,
    initialize,
    navigate: async (url: string) => {
      await navigateWithTransition(url);
    },
    back: async () => {
      if ('navigation' in window && window.navigation.canGoBack) {
        await window.navigation.back().finished;
      }
    },
    forward: async () => {
      if ('navigation' in window && window.navigation.canGoForward) {
        await window.navigation.forward().finished;
      }
    }
  };
}

export const navigationStore = createNavigationStore();
```

### 5. Advanced Patterns

**Scroll Restoration:**

```typescript
/**
 * Handle scroll restoration on navigation
 */
export function setupScrollRestoration(): () => void {
  if (!isNavigationApiSupported()) return () => {};

  const scrollPositions = new Map<string, { x: number; y: number }>();

  return interceptNavigation((event) => {
    const currentKey = window.navigation.currentEntry?.key;

    // Save current scroll position
    if (currentKey) {
      scrollPositions.set(currentKey, {
        x: window.scrollX,
        y: window.scrollY
      });
    }

    event.intercept({
      scroll: 'manual',  // We'll handle scroll ourselves
      handler: async () => {
        // Perform navigation
        await event.commit;

        // Restore scroll position for back/forward
        const newKey = window.navigation.currentEntry?.key;
        const savedPosition = scrollPositions.get(newKey || '');

        if (savedPosition) {
          window.scrollTo(savedPosition.x, savedPosition.y);
        } else {
          window.scrollTo(0, 0);  // Scroll to top for new pages
        }
      }
    });
  });
}
```

**Navigation with Loading States:**

```typescript
/**
 * Navigate with loading state management
 */
export async function navigateWithLoading(
  url: string,
  onLoadingChange: (loading: boolean) => void
): Promise<void> {
  onLoadingChange(true);

  try {
    await navigateWithTransition(url);
  } finally {
    onLoadingChange(false);
  }
}

// Usage in component
function App() {
  const [isLoading, setIsLoading] = useState(false);

  const handleNavigate = (url: string) => {
    navigateWithLoading(url, setIsLoading);
  };

  return (
    <>
      {isLoading && <LoadingBar />}
      <nav>
        <a onClick={() => handleNavigate('/about')}>About</a>
      </nav>
    </>
  );
}
```

**Prefetching on Hover:**

```typescript
/**
 * Prefetch page data on link hover
 */
export function setupHoverPrefetch(
  prefetchFn: (url: string) => Promise<void>
): void {
  const prefetchedUrls = new Set<string>();

  document.addEventListener('mouseover', async (e) => {
    const link = (e.target as Element).closest('a');
    if (!link) return;

    const url = link.getAttribute('href');
    if (!url || prefetchedUrls.has(url)) return;

    // Prefetch after 200ms hover
    const timeout = setTimeout(async () => {
      prefetchedUrls.add(url);
      await prefetchFn(url);
    }, 200);

    const handleMouseOut = () => {
      clearTimeout(timeout);
      link.removeEventListener('mouseout', handleMouseOut);
    };

    link.addEventListener('mouseout', handleMouseOut, { once: true });
  });
}

// Usage
setupHoverPrefetch(async (url) => {
  const response = await fetch(url);
  await response.text();  // Cache the HTML
});
```

**Navigation Guards:**

```typescript
/**
 * Implement navigation guards (like Vue Router)
 */
export function setupNavigationGuard(
  canNavigate: (to: string, from: string) => boolean | Promise<boolean>
): () => void {
  if (!isNavigationApiSupported()) return () => {};

  return interceptNavigation((event) => {
    const from = window.location.href;
    const to = event.destination.url;

    event.intercept({
      handler: async () => {
        const allowed = await canNavigate(to, from);

        if (!allowed) {
          // Prevent navigation
          throw new Error('Navigation blocked');
        }

        // Allow navigation
        await event.commit;
      }
    });
  });
}

// Usage
setupNavigationGuard((to, from) => {
  // Check if user has unsaved changes
  const hasUnsavedChanges = checkUnsavedChanges();

  if (hasUnsavedChanges) {
    return confirm('You have unsaved changes. Are you sure you want to leave?');
  }

  return true;
});
```

## Expected Output

After implementing Navigation API:

**Enhanced Navigation Control:**
- Centralized navigation handling through `window.navigation`
- Access to full navigation history (`navigation.entries()`)
- Back/forward availability (`canGoBack`, `canGoForward`)
- Navigation state persistence
- Automatic coordination with View Transitions

**Better User Experience:**
- Smooth page transitions
- Proper scroll restoration
- Loading states during navigation
- Prefetching on hover
- Navigation guards for unsaved changes

**Developer Experience:**
- Simpler API than History API
- Reactive navigation state
- Better error handling
- Navigation interception for custom logic

**Browser Support:**

| Feature | Chrome | Edge | Safari | Firefox |
|---------|--------|------|--------|---------|
| Navigation API | 102+ | 102+ | No | No |
| View Transitions | 111+ | 111+ | 18+ | No |
| Combined | 111+ | 111+ | No | No |

Automatic fallback to History API in unsupported browsers.

## Best Practices

**Do:**
- Use Navigation API for SPAs with client-side routing
- Combine with View Transitions for smooth animations
- Implement scroll restoration for better UX
- Use navigation guards for unsaved changes
- Prefetch data on hover for faster perceived navigation
- Handle loading states during navigation
- Respect user's motion preferences

**Don't:**
- Don't use for simple multi-page apps (use cross-document View Transitions instead)
- Don't block navigation unnecessarily
- Don't forget fallback for unsupported browsers
- Don't intercept external navigation
- Don't forget to handle navigation errors
- Don't use for hash-only navigation

## Debugging

**Console Inspection:**

```javascript
// Check support
console.log('Navigation API:', 'navigation' in window);

// Current entry
console.log('Current:', window.navigation.currentEntry);

// All entries
console.log('Entries:', window.navigation.entries());

// Can go back/forward
console.log('Can go back:', window.navigation.canGoBack);
console.log('Can go forward:', window.navigation.canGoForward);
```

**Monitor Navigation Events:**

```javascript
window.navigation.addEventListener('navigate', (e) => {
  console.log('Navigate to:', e.destination.url);
  console.log('Can intercept:', e.canIntercept);
  console.log('User initiated:', e.userInitiated);
  console.log('Hash change:', e.hashChange);
});

window.navigation.addEventListener('navigatesuccess', () => {
  console.log('Navigation succeeded');
});

window.navigation.addEventListener('navigateerror', (e) => {
  console.error('Navigation failed:', e.error);
});

window.navigation.addEventListener('currententrychange', () => {
  console.log('Current entry changed');
});
```

## Common Patterns

**SPA Router Integration:**

```typescript
// Simple SPA router with Navigation API
class Router {
  private routes: Map<RegExp, () => void> = new Map();

  constructor() {
    if ('navigation' in window) {
      window.navigation.addEventListener('navigate', (e: any) => {
        if (!e.canIntercept) return;

        e.intercept({
          handler: async () => {
            const url = new URL(e.destination.url);
            await this.handleRoute(url.pathname);
          }
        });
      });
    }
  }

  addRoute(pattern: RegExp, handler: () => void) {
    this.routes.set(pattern, handler);
  }

  async handleRoute(path: string) {
    for (const [pattern, handler] of this.routes) {
      if (pattern.test(path)) {
        handler();
        return;
      }
    }

    // 404
    console.log('Route not found:', path);
  }

  navigate(url: string) {
    if ('navigation' in window) {
      window.navigation.navigate(url);
    } else {
      window.location.href = url;
    }
  }
}

// Usage
const router = new Router();
router.addRoute(/^\/products\/(\d+)$/, () => {
  console.log('Product page');
});
router.navigate('/products/123');
```

## References

- [MDN: Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API)
- [WICG Navigation API Spec](https://github.com/WICG/navigation-api)
- [Chrome for Developers: Navigation API](https://developer.chrome.com/docs/web-platform/navigation-api/)
- [View Transitions API](https://developer.chrome.com/docs/web-platform/view-transitions/)
