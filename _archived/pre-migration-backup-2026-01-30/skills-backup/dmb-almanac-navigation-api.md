---
name: dmb-almanac-navigation-api
version: 1.0.0
description: This guide covers the comprehensive implementation of the **Navigation API (Chrome 102+)** for the DMB Almanac SvelteKit
recommended_tier: sonnet
author: Claude Code
created: 2026-01-25
updated: 2026-01-25
category: scraping
complexity: advanced
tags:
  - scraping
  - chromium-143
  - apple-silicon
target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2
philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."
prerequisites: []
related_skills: []
see_also: []
minimum_example_count: 3
requires_testing: true
performance_critical: false
migrated_from: projects/dmb-almanac/app/docs/analysis/uncategorized/NAVIGATION_API_GUIDE.md
migration_date: 2026-01-25
---

# Navigation API Implementation Guide


### Token Management

See [Token Optimization Skills](./token-optimization/README.md) for all automatic optimizations.

## Skill Coordination

**When to delegate:**
- Complex multi-file tasks → `/parallel-audit`
- Specialized domains → Category-specific experts
- Performance issues → `/perf-audit`

**Works well with:**
- Related skills in same category
- Debug and optimization tools

## Overview

This guide covers the comprehensive implementation of the **Navigation API (Chrome 102+)** for the DMB Almanac SvelteKit PWA, optimized for **Chromium 2025** on **Apple Silicon + macOS 26.2**.

## Features Implemented

### 1. Navigation API (Chrome 102+)

The Navigation API provides enhanced control over navigation with:

- **Centralized navigation handling** via `window.navigation`
- **Navigation interception** for custom handlers
- **History management** with `entries()` method
- **State persistence** across navigation
- **View Transitions coordination**

### 2. Integration with View Transitions API (Chrome 111+)

- Automatic coordination with `document.startViewTransition()`
- Smooth cross-document transitions
- Enhanced in Chrome 143+ with `document.activeViewTransition`

### 3. Reactive State Management

Svelte stores provide reactive access to:

- Current navigation entry
- Full history entries
- Back/forward availability
- Navigation loading state

### 4. Fallback Support

- **History API fallback** for browsers without Navigation API
- **Graceful degradation** for older Chrome versions
- Tested compatibility matrix

## File Structure

```
src/lib/
├── utils/
│   └── navigationApi.ts          # Core Navigation API utilities
├── stores/
│   └── navigation.ts             # Reactive navigation store
├── components/navigation/
│   ├── Header.svelte             # Updated with nav controls
│   └── NavigationApiExample.svelte # Complete usage example
└── hooks/
    └── viewTransitionNavigation.ts # View Transitions integration

src/routes/
└── +layout.svelte                # Integrated Navigation API initialization
```

## Usage Guide

### 1. Basic Navigation

#### Navigate with Transition

```typescript
import { navigateWithTransition } from '$utils/navigationApi';

// Navigate with View Transitions API
await navigateWithTransition('/shows', {
  state: { scrollTop: window.scrollY },
  history: 'push'
});
```

#### Navigate with Tracking

```typescript
import { navigateWithTracking } from '$utils/navigationApi';

// Navigate with analytics
await navigateWithTracking('/songs', {
  trackingInfo: {
    source: 'search_results',
    query: 'Dave Matthews'
  }
});
```

#### Navigate Back/Forward

```typescript
import { navigationStore } from '$stores/navigation';

// Go back
await navigationStore.goBack();

// Go forward
await navigationStore.goForward();

// Go to specific entry
await navigationStore.goTo('/venues/1');
```

### 2. Reactive Navigation State

In Svelte components:

```svelte
<script lang="ts">
  import {
    navigationStore,
    canGoBack,
    canGoForward,
    isNavigating,
    historyEntries
  } from '$stores/navigation';
</script>

<!-- Back/forward buttons -->
<button disabled={!$canGoBack} onclick={() => navigationStore.goBack()}>
  Back
</button>
<button disabled={!$canGoForward} onclick={() => navigationStore.goForward()}>
  Forward
</button>

<!-- Show loading state -->
{#if $isNavigating}
  <div class="loading">Navigating...</div>
{/if}

<!-- Display history -->
<details>
  <summary>History ({$historyEntries.length})</summary>
  {#each $historyEntries as entry}
    <button onclick={() => navigationStore.goTo(entry.url)}>
      {entry.url} #{entry.index}
    </button>
  {/each}
</details>
```

### 3. Navigation Interception

Intercept navigation for custom handling:

```typescript
import { interceptNavigation } from '$utils/navigationApi';

const cleanup = interceptNavigation((event) => {
  if (event.hashChange) return; // Skip hash changes

  if (!event.canIntercept) {
    console.log('Cross-origin navigation:', event.destination.url);
    return;
  }

  // Custom handler
  event.intercept({
    handler: async () => {
      console.log('Navigating to:', event.destination.url);
      // Prefetch data, analytics, etc.
    }
  });
});

// Later: cleanup
cleanup();
```

### 4. Prefetch with Navigation Interception

```typescript
import { interceptNavigationWithPrefetch } from '$utils/navigationApi';

const cleanup = interceptNavigationWithPrefetch(async (url) => {
  // Prefetch data for the destination
  const response = await fetch(url);
  if (!response.ok) throw new Error('Prefetch failed');
});
```

### 5. Navigation Monitoring

Set up comprehensive monitoring:

```typescript
import { setupNavigationMonitoring } from '$utils/navigationApi';

const cleanup = setupNavigationMonitoring({
  onNavigationStart: (event) => {
    console.log('Navigation started:', event.destination.url);
    showLoadingIndicator();
  },

  onNavigationSuccess: (entry) => {
    console.log('Navigation success:', entry);
    hideLoadingIndicator();
  },

  onNavigationError: (error) => {
    console.error('Navigation error:', error);
    showErrorMessage(error.message);
  }
});
```

### 6. State Persistence

Automatic state saving:

```typescript
import {
  saveNavigationState,
  restoreNavigationState,
  clearNavigationState
} from '$utils/navigationApi';

// Restore on app startup
const previousState = restoreNavigationState();
if (previousState) {
  console.log('Restoring navigation state:', previousState);
}

// Clear on logout
clearNavigationState();
```

## API Reference

### Core Functions

#### Feature Detection

```typescript
isNavigationApiSupported(): boolean
isViewTransitionsSupported(): boolean
detectNavigationCapabilities(): NavigationApiCapabilities
```

#### Navigation

```typescript
// Basic navigation
navigateWithTransition(url, options?): Promise<void>
reloadWithFreshData(): Promise<void>

// History navigation
navigateBack(): Promise<void>
navigateForward(): Promise<void>
traverseTo(key: string): Promise<void>

// State queries
getCurrentEntry(): NavigationHistoryEntry | null
getNavigationEntries(): NavigationHistoryEntry[]
getCurrentIndex(): number
canNavigateBack(): boolean
canNavigateForward(): boolean
```

#### Interception

```typescript
// Intercept navigation
interceptNavigation(handler): () => void
interceptNavigationWithPrefetch(prefetchFn): () => void

// Monitor navigation
setupNavigationMonitoring(listener): () => void
onNavigationChange(callback): () => void
```

#### State Persistence

```typescript
saveNavigationState(): void
restoreNavigationState(): NavigationState | null
clearNavigationState(): void
```

#### Advanced Navigation

```typescript
// Navigate with tracking
navigateWithTracking(url, options?): Promise<void>

// Navigate and wait for data
navigateAndWaitForData(url, loadDataFn, options?): Promise<void>

// Scroll restoration
handleScrollRestoration(): Promise<void>
getScrollPosition(): { x: number; y: number }
restoreScrollPosition(position): void
```

### Reactive Stores

```typescript
// Main store
navigationStore: {
  subscribe, set, update,
  initialize(),
  goBack(), goForward(), goTo(url), refresh()
}

// Derived stores
isNavigationSupported: boolean
currentUrl: string
canGoBack: boolean
canGoForward: boolean
isNavigating: boolean
historyEntries: NavigationHistoryEntry[]
historySize: number
```

## Type Definitions

```typescript
interface NavigationHistoryEntry {
  key: string;
  id: string;
  index: number;
  url: string;
  state?: unknown;
}

interface NavigationOptions {
  state?: unknown;
  info?: unknown;
  history?: 'auto' | 'push' | 'replace';
  scroll?: 'auto' | 'manual';
}

interface NavigationState {
  url: string;
  key: string;
  id: string;
  index: number;
  timestamp: number;
  state?: unknown;
}

interface NavigationListener {
  onNavigationStart?: (event) => void;
  onNavigationSuccess?: (entry) => void;
  onNavigationError?: (error) => void;
}
```

## Integration with SvelteKit

### In +layout.svelte

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { initializeNavigation } from '$stores/navigation';

  onMount(() => {
    // Initialize Navigation API
    initializeNavigation();
  });
</script>
```

### In Page Components

```svelte
<script lang="ts">
  import { navigateWithTransition } from '$utils/navigationApi';
  import { navigationStore } from '$stores/navigation';

  async function goToShow(showId: number) {
    await navigateWithTransition(`/shows/${showId}`);
  }
</script>

<button onclick={() => goToShow(123)}>View Show</button>
<button onclick={() => navigationStore.goBack()} disabled={!$canGoBack}>
  Back
</button>
```

## View Transitions Coordination

The Navigation API automatically coordinates with View Transitions:

### HTML (View Transition Names)

```html
<!-- Define view transition names for specific elements -->
<div view-transition-name="hero">
  <img src="..." alt="..." />
</div>

<article>
  <h1 view-transition-name="title">Show Details</h1>
</article>
```

### CSS (Transition Animations)

```css
/* Cross-document transitions */
@view-transition {
  navigation: auto;
}

/* Outgoing state */
::view-transition-old(hero) {
  animation: fade-out 0.3s ease-out;
}

/* Incoming state */
::view-transition-new(hero) {
  animation: fade-in 0.3s ease-in;
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

## Performance Optimization

### 1. Prefetching

```typescript
import { interceptNavigationWithPrefetch } from '$utils/navigationApi';

// Automatically prefetch on navigation
const cleanup = interceptNavigationWithPrefetch(async (url) => {
  // Load critical data before navigation completes
  const response = await fetch(`/api${url}`);
  await response.json();
});
```

### 2. Scroll Restoration

The Navigation API handles scroll restoration automatically. For manual control:

```typescript
import { handleScrollRestoration } from '$utils/navigationApi';

// Initialize on mount
onMount(() => {
  handleScrollRestoration();
});
```

### 3. Analytics

Track navigation for performance monitoring:

```typescript
import { navigateWithTracking } from '$utils/navigationApi';

await navigateWithTracking('/shows', {
  trackingInfo: {
    referrer: 'search',
    timestamp: Date.now()
  }
});
```

## Browser Support

| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| Navigation API | 102+ | No | No | 102+ |
| View Transitions | 111+ | 18+ | No | 111+ |
| History API (fallback) | All | All | All | All |

### Chromium 2025 Features Used

- **Chrome 102+**: Navigation API (core)
- **Chrome 111+**: View Transitions API (enhanced transitions)
- **Chrome 143+**: `document.activeViewTransition` (Chrome 143 specific)
- **Chrome 143+**: CSS range queries (media query syntax)
- **Chrome 129+**: `scheduler.yield()` (main thread yielding)

## Debugging

### Enable Navigation API in DevTools

1. Chrome 143+ has built-in support
2. Use `window.navigation` in console to inspect state
3. Monitor `navigate` events: `window.navigation.addEventListener('navigate', console.log)`

### Check Support

```typescript
import {
  isNavigationApiSupported,
  isViewTransitionsSupported,
  detectNavigationCapabilities
} from '$utils/navigationApi';

console.log('Navigation API:', isNavigationApiSupported());
console.log('View Transitions:', isViewTransitionsSupported());
console.log('Full capabilities:', detectNavigationCapabilities());
```

### Monitor Navigation State

```typescript
import { navigationStore } from '$stores/navigation';

// Subscribe to changes
navigationStore.subscribe(state => {
  console.log('Navigation state changed:', state);
});
```

## Examples

### Complete Example Component

See `/src/lib/components/navigation/NavigationApiExample.svelte` for a fully implemented example with:

- Navigation state display
- Back/forward controls
- History browser
- Navigation log
- Feature detection

### Usage in Real Pages

```typescript
// Navigate on link click
async function handleLinkClick(e: Event) {
  e.preventDefault();
  const url = (e.currentTarget as HTMLAnchorElement).href;
  await navigateWithTransition(url);
}

// Navigate with data loading
async function loadAndNavigate(url: string) {
  await navigateAndWaitForData(
    url,
    async (url) => {
      const response = await fetch(url);
      return response.json();
    }
  );
}
```

## Chrome 143+ Enhancements

In Chrome 143+, the Navigation API includes:

1. **`document.activeViewTransition`** - Access the current view transition
2. **Enhanced scroll restoration** - Better defaults for page restoration
3. **View transition promises** - `ready` and `finished` for timing
4. **CSS improvements** - Better animation targets

Example using Chrome 143+ features:

```typescript
// Access active view transition (Chrome 143+)
if (document.activeViewTransition) {
  // Wait for pseudo-elements to be created
  await document.activeViewTransition.ready;
  console.log('Animation started');

  // Wait for completion
  await document.activeViewTransition.finished;
  console.log('Animation done');
}
```

## Testing

### Test Checklist

- [ ] Navigation API supported (Chrome 102+)
- [ ] Back/forward buttons work
- [ ] History entries display correctly
- [ ] View transitions smooth
- [ ] State persists across refreshes
- [ ] Fallback to History API works
- [ ] Analytics tracking fires
- [ ] Scroll restoration works
- [ ] Mobile navigation works
- [ ] Offline navigation works

### Unit Test Example

```typescript
import { isNavigationApiSupported, getCurrentEntry } from '$utils/navigationApi';

test('Navigation API detected', () => {
  expect(isNavigationApiSupported()).toBe(true);
});

test('Current entry available', () => {
  const entry = getCurrentEntry();
  expect(entry).toBeDefined();
  expect(entry?.url).toBeDefined();
});
```

## Troubleshooting

### Navigation API not working

1. Check Chrome version: 102+
2. Verify `window.navigation` exists
3. Check console for errors
4. Fallback to History API is automatic

### View Transitions not smooth

1. Ensure CSS transitions defined
2. Check `@view-transition` rules
3. Verify `view-transition-name` on elements
4. Use Chrome DevTools to monitor animations

### State not persisting

1. Check localStorage availability
2. Verify `saveNavigationState()` called
3. Check for localStorage quota issues
4. Use `restoreNavigationState()` to verify

## Performance Targets

| Metric | Target | With Navigation API |
|--------|--------|---------------------|
| LCP | < 1.0s | Similar (prerendering) |
| INP | < 100ms | Better (faster nav) |
| CLS | < 0.05 | Same |
| Navigation time | < 300ms | < 100ms (instant) |

## Apple Silicon Optimization

On Apple Silicon + Chrome 143+:

1. **Metal acceleration** - View transitions run on GPU
2. **Unified memory** - Fast state persistence
3. **Efficient GPU** - Smooth animations
4. **Long battery life** - Minimal power usage

### Optimized CSS for Apple Silicon

```css
/* GPU-accelerated transitions */
@view-transition-old(*) {
  animation: fade-out 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@view-transition-new(*) {
  animation: fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fade-out {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.95); }
}

@keyframes fade-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
```

## Related APIs

- **View Transitions API** (Chrome 111+) - Coordinates with Navigation API
- **Speculation Rules API** (Chrome 121+) - Prerender navigated pages
- **scheduler.yield()** (Chrome 129+) - Yield during navigation
- **Long Animation Frames API** (Chrome 123+) - Monitor transition performance

## References

- [MDN Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation)
- [Chrome 102 Release Notes](https://developer.chrome.com/blog/whats-new-in-chrome-102/)
- [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
- [Chrome 143 Release Notes](https://developer.chrome.com/blog/chrome-143-features/)

## Contributing

To enhance the Navigation API integration:

1. Test with latest Chrome Canary (for Chrome 144+)
2. Add new navigation patterns to `navigationApi.ts`
3. Update examples in `NavigationApiExample.svelte`
4. Add tests to ensure compatibility
5. Update this guide with new features

## Conclusion

The Navigation API provides a modern, efficient way to handle navigation in SvelteKit PWAs. Combined with View Transitions and other Chromium 2025 features, it enables fast, responsive, native-like experiences on Apple Silicon devices.

For questions or issues, refer to the example component and consult the Chrome DevTools Network tab to debug navigation timing.
