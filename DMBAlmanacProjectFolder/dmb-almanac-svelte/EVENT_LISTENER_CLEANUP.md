# Event Listener Cleanup Utilities

## Summary

Created comprehensive event listener cleanup utilities to prevent memory leaks in the DMB Almanac SvelteKit PWA. These utilities leverage modern browser APIs (AbortController) and Svelte 5 patterns ($effect) for automatic cleanup.

## Files Created

### 1. `/src/lib/utils/eventListeners.ts` (378 lines)

Core utilities for event listener management:

- **`createEventController()`** - AbortController-based cleanup (Chrome 90+)
- **`useEventListener()`** - Safe event listener for onMount pattern
- **`createEventTracker()`** - Debug listener leaks with count tracking
- **`useMediaQueryListener()`** - MediaQueryList with cleanup
- **`createListenerPool()`** - Manage listeners for dynamic element lists
- **`useDebouncedEventListener()`** - Debounced events with cleanup

**Key Features:**
- Full TypeScript support with overloads for Window, Document, HTMLElement
- AbortController support for batch cleanup
- Legacy fallbacks for older browsers
- Comprehensive JSDoc documentation

### 2. `/src/lib/hooks/useEventCleanup.svelte.ts` (365 lines)

Svelte 5 composable hooks using $effect:

- **`useEventCleanup()`** - AbortController wrapper with automatic cleanup
- **`useTrackedEvents()`** - Track listener count for debugging
- **`useConditionalEvent()`** - Reactive event listener based on condition
- **`useMultipleEvents()`** - Manage multiple listeners with shared lifecycle
- **`useWindowEvent()`** - Convenience wrapper for window events
- **`useDocumentEvent()`** - Convenience wrapper for document events
- **`useMediaQuery()`** - Reactive media query listener
- **`useDebouncedWindowEvent()`** - Debounced window events

**Key Features:**
- Automatic cleanup via Svelte 5 $effect
- Reactive to state changes
- Type-safe with proper event map types
- Zero boilerplate cleanup code

### 3. `/src/lib/utils/eventListeners.example.md`

Comprehensive usage guide with examples:
- Basic patterns with onMount
- Svelte 5 $effect patterns
- AbortController usage
- Conditional listeners
- Multiple events
- Debounced events
- Media queries
- Memory leak debugging
- Migration guide

## Components Refactored

### 1. `/src/lib/components/ui/ErrorBoundary.svelte`

**Before:**
```svelte
onMount(() => {
  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleError);

  return () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleError);
  };
});
```

**After:**
```svelte
useMultipleEvents([
  [window, 'error', handleError as EventListener],
  [window, 'unhandledrejection', handleError as EventListener]
]);
```

**Benefits:**
- Removed onMount boilerplate
- Automatic cleanup via $effect
- More concise and readable

### 2. `/src/lib/components/OfflineFallback.svelte`

**Before:**
```svelte
$effect(() => {
  const handleOnline = () => { /* ... */ };
  const handleOffline = () => { /* ... */ };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }
});
```

**After:**
```svelte
const handleOnline = () => { /* ... */ };
const handleOffline = () => { /* ... */ };

if (typeof window !== 'undefined') {
  useMultipleEvents([
    [window, 'online', handleOnline as EventListener],
    [window, 'offline', handleOffline as EventListener]
  ]);
}
```

**Benefits:**
- Eliminated nested $effect
- Cleaner code structure
- Reusable handler functions

### 3. `/src/lib/components/scroll/ScrollProgressBar.svelte`

**Before:**
```svelte
onMount(() => {
  supported = isScrollAnimationsSupported();

  if (!supported) {
    const handleScroll = () => { /* ... */ };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }
});
```

**After:**
```svelte
$effect(() => {
  if (browser) {
    supported = isScrollAnimationsSupported();
  }
});

const handleScroll = () => { /* ... */ };

if (browser) {
  useConditionalEvent(
    () => !supported,
    window,
    'scroll',
    handleScroll,
    { passive: true }
  );
}
```

**Benefits:**
- Conditional event listener only active when needed
- Automatic cleanup
- Better separation of concerns

## Usage Patterns

### Pattern 1: Simple Window Event
```svelte
<script>
  import { useWindowEvent } from '$lib/hooks/useEventCleanup.svelte';

  let windowWidth = $state(window.innerWidth);

  useWindowEvent('resize', () => {
    windowWidth = window.innerWidth;
  }, { passive: true });
</script>
```

### Pattern 2: Multiple Events
```svelte
<script>
  import { useMultipleEvents } from '$lib/hooks/useEventCleanup.svelte';

  useMultipleEvents([
    [window, 'resize', handleResize, { passive: true }],
    [window, 'scroll', handleScroll, { passive: true }],
    [document, 'visibilitychange', handleVisibility]
  ]);
</script>
```

### Pattern 3: Conditional Event
```svelte
<script>
  import { useConditionalEvent } from '$lib/hooks/useEventCleanup.svelte';

  let isActive = $state(false);

  useConditionalEvent(
    () => isActive,
    document,
    'keydown',
    handleKeyDown
  );
</script>
```

### Pattern 4: AbortController (Advanced)
```svelte
<script>
  import { useEventCleanup } from '$lib/hooks/useEventCleanup.svelte';

  const events = useEventCleanup();

  $effect(() => {
    window.addEventListener('resize', handleResize, { signal: events.signal });
    window.addEventListener('scroll', handleScroll, { signal: events.signal });
    // All cleaned up automatically via events.signal
  });
</script>
```

### Pattern 5: Debounced Event
```svelte
<script>
  import { useDebouncedWindowEvent } from '$lib/hooks/useEventCleanup.svelte';

  useDebouncedWindowEvent('resize', () => {
    console.log('Resize debounced!');
  }, 300, { passive: true });
</script>
```

## Memory Leak Prevention

These utilities prevent common memory leak scenarios:

### 1. **Forgotten Cleanup**
```svelte
// ❌ BEFORE (Memory leak - no cleanup)
onMount(() => {
  window.addEventListener('resize', handleResize);
});

// ✅ AFTER (Safe)
useWindowEvent('resize', handleResize, { passive: true });
```

### 2. **Nested Event Listeners**
```svelte
// ❌ BEFORE (Complex manual tracking)
let cleanupFunctions = [];
onMount(() => {
  const handleUpdate = () => {
    const handleState = () => { /* ... */ };
    worker.addEventListener('statechange', handleState);
    cleanupFunctions.push(() => worker.removeEventListener('statechange', handleState));
  };
  registration.addEventListener('updatefound', handleUpdate);
  cleanupFunctions.push(() => registration.removeEventListener('updatefound', handleUpdate));

  return () => cleanupFunctions.forEach(fn => fn());
});

// ✅ AFTER (Automatic tracking)
const events = useEventCleanup();
$effect(() => {
  registration.addEventListener('updatefound', handleUpdate, { signal: events.signal });
  worker.addEventListener('statechange', handleState, { signal: events.signal });
});
```

### 3. **Dynamic Element Lists**
```svelte
// ❌ BEFORE (Listener leak on element removal)
{#each items as item}
  <button onclick={() => attachListeners(item)}>...</button>
{/each}

// ✅ AFTER (Proper cleanup)
<script>
  import { createListenerPool } from '$lib/utils/eventListeners';
  const pool = createListenerPool();

  $effect(() => {
    return () => pool.cleanupAll();
  });
</script>
```

## Performance Benefits

1. **Batch Cleanup**: AbortController removes all listeners in one call (more efficient than multiple removeEventListener calls)
2. **Passive Listeners**: All scroll/touch listeners use `passive: true` by default
3. **Debouncing**: Built-in support for debounced events to reduce handler calls
4. **Conditional Listeners**: Only attach listeners when needed, not all the time

## Browser Support

- **AbortController in addEventListener**: Chrome 90+, Safari 15+, Firefox 90+
- **MediaQuery addEventListener**: Chrome 45+, Safari 14+, Firefox 55+
- **Legacy fallbacks**: Included for older browsers where applicable

## Testing

All utilities are designed for testability:

```typescript
import { render } from '@testing-library/svelte';

test('cleans up listeners on unmount', () => {
  const addSpy = vi.spyOn(window, 'addEventListener');
  const removeSpy = vi.spyOn(window, 'removeEventListener');

  const { unmount } = render(Component);
  expect(addSpy).toHaveBeenCalled();

  unmount();
  expect(removeSpy).toHaveBeenCalled();
});
```

## Debugging

Use `useTrackedEvents()` to monitor listener counts:

```svelte
<script>
  import { useTrackedEvents } from '$lib/hooks/useEventCleanup.svelte';

  const tracker = useTrackedEvents();

  $inspect('Active listeners:', tracker.count);
</script>
```

## Migration Checklist

- [ ] Replace `onMount` + `addEventListener` with `useEventListener` or hooks
- [ ] Use `useMultipleEvents` for components with 2+ listeners
- [ ] Add `passive: true` to all scroll/touch/wheel listeners
- [ ] Use `useConditionalEvent` for listeners that should toggle
- [ ] Implement `useDebouncedWindowEvent` for resize/scroll handlers
- [ ] Add `useTrackedEvents` in development to catch leaks

## Future Improvements

1. Add unit tests for all utilities
2. Create Chrome DevTools extension to visualize active listeners
3. Add performance monitoring integration
4. Create ESLint rule to catch missing cleanup
5. Add React Query-style devtools for listener debugging

## Related Files

- `/src/lib/stores/pwa.ts` - Uses manual cleanup, could benefit from these utilities
- `/src/lib/utils/wakeLock.ts` - Has event listeners that could use cleanup utilities
- `/src/lib/components/pwa/*.svelte` - Multiple PWA components with listeners
- `/src/lib/actions/scroll.ts` - Scroll actions with listeners

## References

- [MDN: AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [MDN: addEventListener options](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#parameters)
- [Svelte 5 Runes](https://svelte.dev/docs/svelte/$effect)
- [Web.dev: Passive Event Listeners](https://web.dev/passive-event-listeners/)
