# Event Listener Cleanup - Quick Reference

## Import Paths

```typescript
// Utilities (for onMount pattern)
import {
  useEventListener,
  createEventController,
  createEventTracker,
  useDebouncedEventListener
} from '$lib/utils/eventListeners';

// Svelte 5 Hooks (recommended)
import {
  useEventCleanup,
  useWindowEvent,
  useDocumentEvent,
  useMultipleEvents,
  useConditionalEvent,
  useMediaQuery,
  useDebouncedWindowEvent,
  useTrackedEvents
} from '$lib/hooks/useEventCleanup.svelte';
```

## Common Patterns

### 1. Single Window Event

```svelte
<script>
  import { useWindowEvent } from '$lib/hooks/useEventCleanup.svelte';

  let width = $state(0);

  useWindowEvent('resize', () => {
    width = window.innerWidth;
  }, { passive: true });
</script>
```

### 2. Multiple Events

```svelte
<script>
  import { useMultipleEvents } from '$lib/hooks/useEventCleanup.svelte';

  useMultipleEvents([
    [window, 'online', handleOnline],
    [window, 'offline', handleOffline],
    [document, 'visibilitychange', handleVisibility]
  ]);
</script>
```

### 3. Conditional Event (Only When Active)

```svelte
<script>
  import { useConditionalEvent } from '$lib/hooks/useEventCleanup.svelte';

  let isModalOpen = $state(false);

  useConditionalEvent(
    () => isModalOpen,
    document,
    'keydown',
    handleEscape
  );
</script>
```

### 4. Debounced Event

```svelte
<script>
  import { useDebouncedWindowEvent } from '$lib/hooks/useEventCleanup.svelte';

  useDebouncedWindowEvent('resize', () => {
    console.log('Resized!');
  }, 300, { passive: true });
</script>
```

### 5. Media Query

```svelte
<script>
  import { useMediaQuery } from '$lib/hooks/useEventCleanup.svelte';

  let isDark = $state(false);

  useMediaQuery('(prefers-color-scheme: dark)', (e) => {
    isDark = e.matches;
  });
</script>
```

### 6. AbortController (Advanced)

```svelte
<script>
  import { useEventCleanup } from '$lib/hooks/useEventCleanup.svelte';

  const events = useEventCleanup();

  $effect(() => {
    window.addEventListener('resize', handler, { signal: events.signal, passive: true });
    window.addEventListener('scroll', handler, { signal: events.signal, passive: true });
  });
</script>
```

## onMount Pattern (Legacy)

```svelte
<script>
  import { onMount } from 'svelte';
  import { useEventListener } from '$lib/utils/eventListeners';

  onMount(() => {
    return useEventListener(
      window,
      'resize',
      handleResize,
      { passive: true }
    );
  });
</script>
```

## Debugging

```svelte
<script>
  import { useTrackedEvents } from '$lib/hooks/useEventCleanup.svelte';

  const tracker = useTrackedEvents();

  $inspect('Listeners:', tracker.count);
</script>
```

## Best Practices

✅ **DO:**
- Use `passive: true` for scroll/touch events
- Debounce high-frequency events (resize, scroll)
- Use conditional listeners when appropriate
- Prefer Svelte 5 hooks over onMount pattern

❌ **DON'T:**
- Forget cleanup functions
- Add listeners without passive flag for scroll
- Manually track cleanup unless necessary
- Use inline handlers for cleanup-critical events

## Performance Tips

| Event Type | Recommended Pattern | Options |
|------------|-------------------|---------|
| `resize` | `useDebouncedWindowEvent` | `{ delay: 250-500, passive: true }` |
| `scroll` | `useWindowEvent` | `{ passive: true }` |
| `click` | `useWindowEvent` | none |
| `keydown` | `useConditionalEvent` | Conditional on modal/focus state |
| Media query | `useMediaQuery` | Built-in |

## Type Safety

All functions are fully typed with overloads:

```typescript
// Window events
useWindowEvent<K extends keyof WindowEventMap>(
  event: K,
  handler: (e: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions
)

// Document events
useDocumentEvent<K extends keyof DocumentEventMap>(
  event: K,
  handler: (e: DocumentEventMap[K]) => void,
  options?: AddEventListenerOptions
)

// Conditional events
useConditionalEvent<K extends keyof WindowEventMap>(
  condition: () => boolean,
  target: Window,
  event: K,
  handler: (e: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions
)
```

## Migration Examples

### Before → After

#### Example 1: Basic Listener

```svelte
<!-- BEFORE -->
<script>
  import { onMount } from 'svelte';

  onMount(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });
</script>

<!-- AFTER -->
<script>
  import { useWindowEvent } from '$lib/hooks/useEventCleanup.svelte';

  useWindowEvent('resize', handleResize, { passive: true });
</script>
```

#### Example 2: Multiple Listeners

```svelte
<!-- BEFORE -->
<script>
  import { onMount } from 'svelte';

  onMount(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });
</script>

<!-- AFTER -->
<script>
  import { useMultipleEvents } from '$lib/hooks/useEventCleanup.svelte';

  useMultipleEvents([
    [window, 'online', handleOnline],
    [window, 'offline', handleOffline]
  ]);
</script>
```

#### Example 3: Conditional Listener

```svelte
<!-- BEFORE -->
<script>
  let active = $state(false);

  $effect(() => {
    if (active) {
      const handler = () => { /* ... */ };
      window.addEventListener('scroll', handler, { passive: true });
      return () => window.removeEventListener('scroll', handler);
    }
  });
</script>

<!-- AFTER -->
<script>
  import { useConditionalEvent } from '$lib/hooks/useEventCleanup.svelte';

  let active = $state(false);

  useConditionalEvent(
    () => active,
    window,
    'scroll',
    handleScroll,
    { passive: true }
  );
</script>
```

## Testing

```typescript
import { render } from '@testing-library/svelte';
import { vi } from 'vitest';

test('cleans up on unmount', () => {
  const addSpy = vi.spyOn(window, 'addEventListener');
  const removeSpy = vi.spyOn(window, 'removeEventListener');

  const { unmount } = render(Component);
  expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function), { passive: true });

  unmount();
  expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function), { passive: true });
});
```

## Browser Support

| Feature | Chrome | Safari | Firefox |
|---------|--------|--------|---------|
| AbortController | 90+ | 15+ | 90+ |
| Passive listeners | 51+ | 10+ | 49+ |
| MediaQuery addEventListener | 45+ | 14+ | 55+ |

All utilities include fallbacks where applicable.
