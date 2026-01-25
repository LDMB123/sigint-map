# Navigation API Quick Reference Card

## Installation

Already installed and initialized in `+layout.svelte`. No additional setup needed!

## Basic Usage

### Navigate

```typescript
import { navigateWithTransition } from '$utils/navigationApi';

// Simple navigation with View Transitions
await navigateWithTransition('/shows');

// With state
await navigateWithTransition('/shows/123', {
  state: { scrollTop: window.scrollY }
});
```

### Back/Forward

```svelte
<script lang="ts">
  import { navigationStore, canGoBack, canGoForward } from '$stores/navigation';
</script>

<button disabled={!$canGoBack} onclick={() => navigationStore.goBack()}>
  Back
</button>

<button disabled={!$canGoForward} onclick={() => navigationStore.goForward()}>
  Forward
</button>
```

### Reactive State

```svelte
<script lang="ts">
  import { isNavigating, currentUrl, historySize } from '$stores/navigation';
</script>

{#if $isNavigating}
  <div class="loading">Loading {$currentUrl}...</div>
{/if}

<p>History entries: {$historySize}</p>
```

## Common Patterns

### Pattern 1: Navigate with Analytics

```typescript
import { navigateWithTracking } from '$utils/navigationApi';

await navigateWithTracking('/songs', {
  trackingInfo: {
    source: 'search',
    query: 'Dave Matthews'
  }
});
```

### Pattern 2: Prefetch Data

```typescript
import { navigateAndWaitForData } from '$utils/navigationApi';

await navigateAndWaitForData('/shows', async (url) => {
  const response = await fetch(`/api${url}`);
  return response.json();
});
```

### Pattern 3: Custom Navigation Handler

```typescript
import { interceptNavigation } from '$utils/navigationApi';

const cleanup = interceptNavigation((event) => {
  if (!event.canIntercept) return;

  event.intercept({
    handler: async () => {
      console.log('Going to:', event.destination.url);
      // Custom logic
    }
  });
});

// Later: cleanup()
```

### Pattern 4: History Browser

```svelte
<script lang="ts">
  import { historyEntries, navigationStore } from '$stores/navigation';
</script>

<details>
  <summary>History</summary>
  {#each $historyEntries as entry (entry.key)}
    <button onclick={() => navigationStore.goTo(entry.url)}>
      {entry.url}
    </button>
  {/each}
</details>
```

## Feature Detection

```typescript
import { isNavigationApiSupported, isViewTransitionsSupported } from '$utils/navigationApi';

if (isNavigationApiSupported()) {
  console.log('Navigation API available (Chrome 102+)');
}

if (isViewTransitionsSupported()) {
  console.log('View Transitions available (Chrome 111+)');
}
```

## Types

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
```

## Reactive Stores (Derived)

| Store | Type | Purpose |
|-------|------|---------|
| `navigationStore` | Writable | Main navigation control |
| `isNavigationSupported` | Boolean | Feature flag |
| `currentUrl` | String | Current page URL |
| `canGoBack` | Boolean | Back button enabled |
| `canGoForward` | Boolean | Forward button enabled |
| `isNavigating` | Boolean | Loading indicator |
| `historyEntries` | Array | All history entries |
| `historySize` | Number | Entry count |

## Store Methods

```typescript
import { navigationStore } from '$stores/navigation';

navigationStore.initialize();      // Set up Navigation API
navigationStore.goBack();          // Navigate back
navigationStore.goForward();       // Navigate forward
navigationStore.goTo(url);         // Navigate to URL
navigationStore.goTo(url, state);  // With state
navigationStore.refresh();         // Update state
navigationStore.subscribe(state => {}); // Listen to changes
```

## CSS Integration

### Navigation Loading State

```css
/* Show indicator during navigation */
[data-navigating] {
  --nav-progress: 1;
}

body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  width: 100%;
  background: var(--color-primary);
  opacity: var(--nav-progress, 0);
}
```

### View Transitions

```css
/* Smooth page transitions */
@view-transition {
  navigation: auto;
}

::view-transition-old(*) {
  animation: fade-out 0.3s ease-out;
}

::view-transition-new(*) {
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

## Debugging

```javascript
// In browser console

// Check if Navigation API available
window.navigation

// Get current entry
window.navigation.currentEntry

// Get all entries
window.navigation.entries()

// Enable debug logging
import { enableNavigationLogging } from '$lib/hooks/navigationApiInterception';
enableNavigationLogging();

// Access debug info
window.__navigationContext.getHistory()
window.__navigationContext.getStats()
window.__navigationContext.getLast()
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Back button disabled | Check `canGoBack` store |
| Navigation slow | Enable prefetch in hook |
| Transitions not smooth | Check CSS `@view-transition` rule |
| State not persisting | Verify localStorage available |
| Not working | Check Chrome version (102+) |

## Performance Tips

1. **Prefetch critical data** before navigation
2. **Use View Transitions** for visual polish (Chrome 111+)
3. **Minimize navigation handler** code
4. **Save state** in localStorage for recovery
5. **Monitor metrics** with Chrome DevTools

## File Locations

| Component | Path |
|-----------|------|
| Core API | `src/lib/utils/navigationApi.ts` |
| Store | `src/lib/stores/navigation.ts` |
| Hooks | `src/lib/hooks/navigationApiInterception.ts` |
| Sync | `src/lib/hooks/navigationSync.ts` |
| Example | `src/lib/components/navigation/NavigationApiExample.svelte` |
| Layout | `src/routes/+layout.svelte` |

## Chrome Versions

| Feature | Chrome Version |
|---------|---|
| Navigation API | 102+ |
| View Transitions | 111+ |
| scheduler.yield() | 129+ |
| activeViewTransition | 143+ |

## Browser Support

| Browser | Support |
|---------|---------|
| Chrome | 102+ (full) |
| Edge | 102+ (full) |
| Safari | 18+ (View Transitions only) |
| Firefox | No (fallback to History API) |

Fallback to History API is automatic - no configuration needed!

## Complete Example

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { navigateWithTransition } from '$utils/navigationApi';
  import { navigationStore, canGoBack, isNavigating } from '$stores/navigation';

  onMount(() => {
    navigationStore.initialize();
  });

  async function handleNavigation(url: string) {
    await navigateWithTransition(url);
  }
</script>

<div class="navbar">
  <button
    disabled={!$canGoBack}
    onclick={() => navigationStore.goBack()}
  >
    {$isNavigating ? '...' : '← Back'}
  </button>

  <a href="/shows" onclick|preventDefault={() => handleNavigation('/shows')}>
    Shows
  </a>

  <a href="/songs" onclick|preventDefault={() => handleNavigation('/songs')}>
    Songs
  </a>
</div>
```

## Links

- **Quick Start**: `NAVIGATION_API_README.md`
- **Full Guide**: `NAVIGATION_API_GUIDE.md`
- **Implementation**: `NAVIGATION_API_IMPLEMENTATION.md`
- **Example**: `src/lib/components/navigation/NavigationApiExample.svelte`

---

**For Chromium 2025 (Chrome 143+) on Apple Silicon**
