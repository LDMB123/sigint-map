# Performance Optimization Implementation Guide

## Quick Navigation
- [Priority 1: scheduler.yield() for INP](#priority-1-scheduleryield-for-inp)
- [Priority 2: Parallel Data Loading](#priority-2-parallel-data-loading)
- [Priority 3: VirtualList Memoization](#priority-3-virtuallist-memoization)
- [Priority 4: Network-Aware Caching](#priority-4-network-aware-caching)

---

## Priority 1: scheduler.yield() for INP

**Current Status:** scheduler.yield() types defined but not used in components
**Impact:** 50-70ms INP reduction (120ms → 50ms)
**Effort:** 2-3 hours

### Create Performance Utilities

Create new file: `src/lib/utils/performance.ts`

```typescript
/**
 * Performance utilities for Chromium 2025
 * Yields to main thread for responsive interactions
 */

export async function yieldToMain(): Promise<void> {
  if (typeof window !== 'undefined' && 'scheduler' in window) {
    const scheduler = (window as any).scheduler;
    if ('yield' in scheduler) {
      try {
        await scheduler.yield();
        return;
      } catch (error) {
        console.warn('scheduler.yield() failed:', error);
      }
    }
  }
  return new Promise(resolve => setTimeout(resolve, 0));
}

export function debounceWithYield<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return async function (...args: Parameters<T>) {
    if (timeoutId) clearTimeout(timeoutId);
    return new Promise((resolve) => {
      timeoutId = setTimeout(async () => {
        await yieldToMain();
        resolve(fn(...args));
      }, delay);
    });
  };
}
```

### Apply to Event Handlers

Update search component to use scheduler.yield():

```svelte
<script lang="ts">
  import { debounceWithYield } from '$lib/utils/performance';

  let query = $state('');
  let isLoading = $state(false);

  const performSearch = debounceWithYield(async (q: string) => {
    isLoading = true;
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await response.json();
      results = data.shows;
    } finally {
      isLoading = false;
    }
  }, 300);

  function handleSearchChange(e: Event) {
    const input = e.target as HTMLInputElement;
    query = input.value;
    performSearch(query);
  }
</script>
```

---

## Priority 2: Parallel Data Loading

**Current Status:** Sequential queries in +page.server.ts
**Impact:** 200ms LCP improvement
**Effort:** 1 hour

Update `src/routes/songs/+page.server.ts`:

```typescript
export const load = (async ({ setHeaders }) => {
  setHeaders({
    'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600'
  });

  // BEFORE: Sequential
  // const songs = getSongs();
  // const songStats = getSongStats();

  // AFTER: Parallel
  const [songs, songStats] = await Promise.all([
    getSongs(),
    getSongStats()
  ]);

  const sortedSongs = [...songs].sort((a, b) => {
    const aSort = a.sortTitle || a.title;
    const bSort = b.sortTitle || b.title;
    return aSort.localeCompare(bSort);
  });

  return { songs: sortedSongs, songStats };
}) satisfies PageServerLoad;
```

Apply to all +page.server.ts files in:
- `/shows`, `/venues`, `/tours`, `/guests`

---

## Priority 3: VirtualList Memoization

**Current Status:** Force re-renders on cache updates
**Effort:** 2 hours

Fix `src/lib/components/ui/VirtualList.svelte` line 219:

```typescript
// BEFORE: Creates new Map, triggers full re-render
// heightCache = new Map(heightCache);

// AFTER: Use version signal
let cacheVersion = $state(0);

// In ResizeObserver (line 218):
if (needsUpdate) {
  cacheVersion++; // Increment instead of recreating
}

// Update $effect to depend on cacheVersion
$effect(() => {
  if (typeof itemHeight === 'function' && items.length > 0) {
    // Rebuild offset cache
    const newOffsetCache: number[] = new Array(items.length + 1);
    newOffsetCache[0] = 0;
    for (let i = 0; i < items.length; i++) {
      newOffsetCache[i + 1] = newOffsetCache[i] + (heightCache.get(i) ?? estimateSize);
    }
    offsetCache = newOffsetCache;
  }
  cacheVersion; // Access to create dependency
});
```

---

## Priority 4: Network-Aware Caching

**Current Status:** Same strategy for all networks
**Effort:** 3 hours

Update `static/sw.js` after line 86:

```javascript
// Add network configuration
const NETWORK_CONFIG = {
  '4g': { cacheFirst: false, timeout: 3000 },
  '3g': { cacheFirst: true, timeout: 5000 },
  '2g': { cacheFirst: true, timeout: 10000 },
};

function getNetworkConfig() {
  if (typeof navigator === 'undefined') return NETWORK_CONFIG['4g'];
  const connection = (navigator as any).connection;
  const effectiveType = connection?.effectiveType || '4g';
  return NETWORK_CONFIG[effectiveType] || NETWORK_CONFIG['4g'];
}
```

Update fetch handler (line 265-269):

```javascript
// API routes - Adaptive strategy
if (url.pathname.startsWith('/api/')) {
  const networkConfig = getNetworkConfig();
  if (networkConfig.cacheFirst) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirstWithExpiration(request, EXPIRATION_TIMES.API));
  }
  return;
}
```

---

## Verification

### Test with Lighthouse

```bash
npm run build && npm run preview
# Open http://localhost:4173
# Chrome > F12 > Lighthouse > Analyze page load
```

### Expected Improvements

| Metric | Before | After |
|--------|--------|-------|
| LCP | 0.6s | 0.4s |
| INP | 120ms | 60ms |
| Performance Score | 92 | 96 |

---

## Checklist

- [ ] Create `src/lib/utils/performance.ts`
- [ ] Add scheduler.yield() to search component
- [ ] Update all +page.server.ts with Promise.all()
- [ ] Fix VirtualList memoization
- [ ] Add network-aware caching to SW
- [ ] Test with Lighthouse
- [ ] Monitor real user metrics

---

For detailed implementation code, see PERFORMANCE_AUDIT_REPORT.md sections 1, 3, and 6.
