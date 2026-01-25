# Ready-to-Apply Memory Fixes

This file contains copy-paste ready fixes for the 5 critical memory issues found in your codebase.

## Fix 1: Add Store Cleanup to Root Layout

**File**: `src/routes/+layout.svelte` (or create if doesn't exist)

**Why**: Stores initialized at module load time will hold subscriptions forever unless explicitly destroyed.

```svelte
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { memoryMonitor } from '$lib/utils/memory-monitor';
  import {
    userAttendedShows,
    userFavoriteSongs,
    userFavoriteVenues,
    songSearch,
    venueSearch,
    guestSearch,
    globalSearch
  } from '$lib/stores/dexie';
  import { getWasmBridge } from '$lib/wasm/bridge';

  // Start memory monitoring in dev
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    memoryMonitor.start({ interval: 10000 });

    // Log memory every 30 seconds
    const logInterval = setInterval(() => {
      const report = memoryMonitor.getReport();
      if (report.leakRisk === 'high' || report.leakRisk === 'critical') {
        console.warn('[Memory] Potential leak detected:', {
          heap: (report.currentHeap / 1048576).toFixed(2) + 'MB',
          trend: report.trend,
          growth: report.averageGrowthPerSecond.toFixed(3) + 'MB/s'
        });
      }
    }, 30000);
  }

  onDestroy(() => {
    // Cleanup all stores that implement destroy()
    userAttendedShows.destroy?.();
    userFavoriteSongs.destroy?.();
    userFavoriteVenues.destroy?.();
    songSearch.destroy?.();
    venueSearch.destroy?.();
    guestSearch.destroy?.();
    globalSearch.destroy?.();

    // Cleanup WASM bridge
    try {
      const bridge = getWasmBridge();
      bridge.terminate();
    } catch (error) {
      console.warn('[Layout] Failed to terminate WASM bridge:', error);
    }

    // Stop memory monitoring
    if (import.meta.env.DEV) {
      memoryMonitor.stop();
    }

    // Clear any pending intervals
    if (typeof logInterval !== 'undefined') {
      clearInterval(logInterval);
    }
  });
</script>

<slot />
```

---

## Fix 2: Update User Data Stores with Lazy Initialization

**File**: `src/lib/stores/dexie.ts`

**Location**: Replace lines 630-718 (userAttendedShows), 725-804 (userFavoriteSongs), 809-884 (userFavoriteVenues)

**Why**: Subscriptions persist at module load, but should be lifecycle-aware.

### For userAttendedShows:

```typescript
/**
 * User attended shows store with CRUD operations
 */
function createUserAttendedShowsStore() {
  const store = writable<UserAttendedShow[]>([]);
  let subscription: { unsubscribe: () => void } | null = null;
  let subscriberCount = 0;

  const initializeSubscription = () => {
    if (subscription) return;

    getDb()
      .then((db) => {
        subscription = liveQuery(() => db.userAttendedShows.toArray()).subscribe({
          next: (value) => store.set(value),
          error: (err) => console.error('[dexie] userAttendedShows subscription error:', err)
        });
      })
      .catch((err) => console.error('[dexie] Failed to initialize userAttendedShows store:', err));
  };

  // Track subscribers for lazy initialization
  if (isBrowser) {
    // Wrap store.subscribe to implement lazy subscription
    const originalSubscribe = store.subscribe.bind(store);
    store.subscribe = function(fn: (value: UserAttendedShow[]) => void) {
      if (subscriberCount === 0) {
        initializeSubscription();
      }
      subscriberCount++;

      const unsubscribe = originalSubscribe(fn);

      return () => {
        unsubscribe();
        subscriberCount--;
        if (subscriberCount === 0 && subscription) {
          subscription.unsubscribe();
          subscription = null;
        }
      };
    };
  } else if (!isBrowser) {
    // For SSR
    initializeSubscription();
  }

  return {
    subscribe: store.subscribe,

    async add(showId: number, showDate?: string) {
      const db = await getDb();
      try {
        await db.userAttendedShows.add({
          showId,
          addedAt: Date.now(),
          notes: null,
          rating: null,
          showDate: showDate ?? '',
          venueName: '',
          venueCity: '',
          venueState: null,
          tourName: ''
        });
        invalidateUserDataCaches();
      } catch (error) {
        if (error instanceof Dexie.ConstraintError) {
          console.warn('[dexie] Show already marked as attended:', showId);
          return;
        }
        throw error;
      }
    },

    async remove(showId: number) {
      const db = await getDb();
      await db.userAttendedShows.where('showId').equals(showId).delete();
      invalidateUserDataCaches();
    },

    async toggle(showId: number, showDate?: string): Promise<boolean> {
      const db = await getDb();
      const result = await db.transaction('rw', db.userAttendedShows, async () => {
        const existing = await db.userAttendedShows.where('showId').equals(showId).first();
        if (existing) {
          await db.userAttendedShows.where('showId').equals(showId).delete();
          return false;
        }
        await db.userAttendedShows.add({
          showId,
          addedAt: Date.now(),
          notes: null,
          rating: null,
          showDate: showDate ?? '',
          venueName: '',
          venueCity: '',
          venueState: null,
          tourName: ''
        });
        return true;
      });
      invalidateUserDataCaches();
      return result;
    },

    async isAttended(showId: number): Promise<boolean> {
      const db = await getDb();
      const existing = await db.userAttendedShows.where('showId').equals(showId).first();
      return !!existing;
    },

    destroy() {
      subscription?.unsubscribe();
      subscription = null;
      subscriberCount = 0;
    }
  };
}
```

### For userFavoriteSongs (same pattern):

```typescript
function createUserFavoriteSongsStore() {
  const store = writable<UserFavoriteSong[]>([]);
  let subscription: { unsubscribe: () => void } | null = null;
  let subscriberCount = 0;

  const initializeSubscription = () => {
    if (subscription) return;
    getDb()
      .then((db) => {
        subscription = liveQuery(() => db.userFavoriteSongs.toArray()).subscribe({
          next: (value) => store.set(value),
          error: (err) => console.error('[dexie] userFavoriteSongs subscription error:', err)
        });
      })
      .catch((err) => console.error('[dexie] Failed to initialize userFavoriteSongs store:', err));
  };

  if (isBrowser) {
    const originalSubscribe = store.subscribe.bind(store);
    store.subscribe = function(fn: (value: UserFavoriteSong[]) => void) {
      if (subscriberCount === 0) initializeSubscription();
      subscriberCount++;

      const unsubscribe = originalSubscribe(fn);
      return () => {
        unsubscribe();
        subscriberCount--;
        if (subscriberCount === 0 && subscription) {
          subscription.unsubscribe();
          subscription = null;
        }
      };
    };
  } else {
    initializeSubscription();
  }

  return {
    subscribe: store.subscribe,

    async add(songId: number, songTitle?: string, songSlug?: string) {
      const db = await getDb();
      try {
        await db.userFavoriteSongs.add({
          songId,
          addedAt: Date.now(),
          songTitle: songTitle ?? '',
          songSlug: songSlug ?? ''
        });
        invalidateUserDataCaches();
      } catch (error) {
        if (error instanceof Dexie.ConstraintError) {
          console.warn('[dexie] Song already marked as favorite:', songId);
          return;
        }
        throw error;
      }
    },

    async remove(songId: number) {
      const db = await getDb();
      await db.userFavoriteSongs.where('songId').equals(songId).delete();
      invalidateUserDataCaches();
    },

    async toggle(songId: number, songTitle?: string, songSlug?: string): Promise<boolean> {
      const db = await getDb();
      const result = await db.transaction('rw', db.userFavoriteSongs, async () => {
        const existing = await db.userFavoriteSongs.where('songId').equals(songId).first();
        if (existing) {
          await db.userFavoriteSongs.where('songId').equals(songId).delete();
          return false;
        }
        await db.userFavoriteSongs.add({
          songId,
          addedAt: Date.now(),
          songTitle: songTitle ?? '',
          songSlug: songSlug ?? ''
        });
        return true;
      });
      invalidateUserDataCaches();
      return result;
    },

    async isFavorite(songId: number): Promise<boolean> {
      const db = await getDb();
      const existing = await db.userFavoriteSongs.where('songId').equals(songId).first();
      return !!existing;
    },

    destroy() {
      subscription?.unsubscribe();
      subscription = null;
      subscriberCount = 0;
    }
  };
}
```

### For userFavoriteVenues (same pattern):

```typescript
function createUserFavoriteVenuesStore() {
  const store = writable<UserFavoriteVenue[]>([]);
  let subscription: { unsubscribe: () => void } | null = null;
  let subscriberCount = 0;

  const initializeSubscription = () => {
    if (subscription) return;
    getDb()
      .then((db) => {
        subscription = liveQuery(() => db.userFavoriteVenues.toArray()).subscribe({
          next: (value) => store.set(value),
          error: (err) => console.error('[dexie] userFavoriteVenues subscription error:', err)
        });
      })
      .catch((err) => console.error('[dexie] Failed to initialize userFavoriteVenues store:', err));
  };

  if (isBrowser) {
    const originalSubscribe = store.subscribe.bind(store);
    store.subscribe = function(fn: (value: UserFavoriteVenue[]) => void) {
      if (subscriberCount === 0) initializeSubscription();
      subscriberCount++;

      const unsubscribe = originalSubscribe(fn);
      return () => {
        unsubscribe();
        subscriberCount--;
        if (subscriberCount === 0 && subscription) {
          subscription.unsubscribe();
          subscription = null;
        }
      };
    };
  } else {
    initializeSubscription();
  }

  return {
    subscribe: store.subscribe,

    async add(venueId: number, venueName?: string) {
      const db = await getDb();
      try {
        await db.userFavoriteVenues.add({
          venueId,
          addedAt: Date.now(),
          venueName: venueName ?? '',
          venueCity: '',
          venueState: null
        });
        invalidateUserDataCaches();
      } catch (error) {
        if (error instanceof Dexie.ConstraintError) {
          console.warn('[dexie] Venue already marked as favorite:', venueId);
          return;
        }
        throw error;
      }
    },

    async remove(venueId: number) {
      const db = await getDb();
      await db.userFavoriteVenues.where('venueId').equals(venueId).delete();
      invalidateUserDataCaches();
    },

    async toggle(venueId: number, venueName?: string): Promise<boolean> {
      const db = await getDb();
      const result = await db.transaction('rw', db.userFavoriteVenues, async () => {
        const existing = await db.userFavoriteVenues.where('venueId').equals(venueId).first();
        if (existing) {
          await db.userFavoriteVenues.where('venueId').equals(venueId).delete();
          return false;
        }
        await db.userFavoriteVenues.add({
          venueId,
          addedAt: Date.now(),
          venueName: venueName ?? '',
          venueCity: '',
          venueState: null
        });
        return true;
      });
      invalidateUserDataCaches();
      return result;
    },

    destroy() {
      subscription?.unsubscribe();
      subscription = null;
      subscriberCount = 0;
    }
  };
}
```

---

## Fix 3: Update Search Stores with Destroy Support

**File**: `src/lib/stores/dexie.ts`

**Location**: Replace lines 1111-1156 (createDebouncedSearchStore)

**Why**: Debounce timeouts can accumulate if components unmount during pending searches.

```typescript
/**
 * Create a debounced search store
 */
function createDebouncedSearchStore<T>(
  searchFn: (query: string, limit: number) => Promise<T[]>,
  debounceMs = 300
) {
  const query = writable('');
  const limit = writable(20);
  const results = writable<T[]>([]);
  const isPending = writable(false);

  let timeoutId: ReturnType<typeof setTimeout>;
  let isDestroyed = false;
  let unsubscribeQuery: (() => void) | null = null;
  let unsubscribeLimit: (() => void) | null = null;

  if (isBrowser) {
    let currentQuery = '';
    let currentLimit = 20;

    unsubscribeQuery = query.subscribe((q) => {
      if (isDestroyed) return;

      currentQuery = q;
      isPending.set(true);

      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        if (isDestroyed) {
          isPending.set(false);
          return;
        }

        try {
          if (currentQuery.trim()) {
            const data = await searchFn(currentQuery, currentLimit);
            if (!isDestroyed) {
              results.set(data);
            }
          } else {
            if (!isDestroyed) {
              results.set([]);
            }
          }
        } catch (error) {
          console.error('[Search] Error:', error);
          if (!isDestroyed) {
            results.set([]);
          }
        } finally {
          if (!isDestroyed) {
            isPending.set(false);
          }
        }
      }, debounceMs);
    });

    unsubscribeLimit = limit.subscribe((l) => {
      if (!isDestroyed) {
        currentLimit = l;
      }
    });
  }

  return {
    query,
    limit,
    results: { subscribe: results.subscribe },
    isPending: { subscribe: isPending.subscribe },
    setQuery: (q: string) => {
      if (!isDestroyed) query.set(q);
    },
    setLimit: (l: number) => {
      if (!isDestroyed) limit.set(l);
    },
    destroy() {
      isDestroyed = true;
      clearTimeout(timeoutId);
      unsubscribeQuery?.();
      unsubscribeLimit?.();
      results.set([]);
      isPending.set(false);
      query.set('');
      limit.set(20);
    }
  };
}

export const songSearch = createDebouncedSearchStore<DexieSong>(async (q, l) => {
  const db = await getDb();
  return db.songs.where('searchText').startsWithIgnoreCase(q).limit(l).toArray();
});

export const venueSearch = createDebouncedSearchStore<DexieVenue>(async (q, l) => {
  const db = await getDb();
  return db.venues.where('searchText').startsWithIgnoreCase(q).limit(l).toArray();
});

export const guestSearch = createDebouncedSearchStore<DexieGuest>(async (q, l) => {
  const db = await getDb();
  return db.guests.where('searchText').startsWithIgnoreCase(q).limit(l).toArray();
});
```

---

## Fix 4: Update Global Search Store

**File**: `src/lib/stores/dexie.ts`

**Location**: Replace lines 1366-1438 (createGlobalSearchStore function)

**Why**: Race conditions can cause stale updates if component unmounts during search.

```typescript
/**
 * Global search store with debouncing
 */
export function createGlobalSearchStore() {
  const query = writable('');
  const results = writable<GlobalSearchResults>({});
  const isSearching = writable(false);

  let timeoutId: ReturnType<typeof setTimeout>;
  let currentSearchId = 0;
  let isDestroyed = false;
  let unsubscribe: (() => void) | null = null;
  let searchAbortController: AbortController | null = null;

  if (isBrowser) {
    unsubscribe = query.subscribe((q) => {
      if (isDestroyed) return;

      clearTimeout(timeoutId);
      // Abort previous search if still in-flight
      searchAbortController?.abort();

      if (q.trim().length < 1) {
        results.set({});
        isSearching.set(false);
        return;
      }

      isSearching.set(true);

      const searchId = ++currentSearchId;
      searchAbortController = new AbortController();

      timeoutId = setTimeout(async () => {
        if (isDestroyed || searchId !== currentSearchId) {
          isSearching.set(false);
          return;
        }

        try {
          const searchResults = await performGlobalSearch(q.trim(), 10);
          if (searchId === currentSearchId && !isDestroyed) {
            results.set(searchResults);
          }
        } catch (error) {
          if (searchId === currentSearchId && !isDestroyed) {
            if (error instanceof Error && error.name !== 'AbortError') {
              console.error('[dexie] Global search error:', error);
            }
            results.set({});
          }
        } finally {
          if (searchId === currentSearchId && !isDestroyed) {
            isSearching.set(false);
          }
        }
      }, 300);
    });
  }

  return {
    query,
    results: { subscribe: results.subscribe },
    isSearching: { subscribe: isSearching.subscribe },
    setQuery: (q: string) => {
      if (!isDestroyed) query.set(q);
    },
    clear: () => {
      if (!isDestroyed) {
        query.set('');
        results.set({});
      }
    },
    destroy() {
      isDestroyed = true;
      clearTimeout(timeoutId);
      searchAbortController?.abort();
      unsubscribe?.();
      currentSearchId = 0;
      // Reset stores
      results.set({});
      isSearching.set(false);
      query.set('');
    }
  };
}

export const globalSearch = createGlobalSearchStore();
```

---

## Fix 5: Update Dropdown Component with AbortController

**File**: `src/lib/components/ui/Dropdown.svelte`

**Location**: Replace entire component (lines 1-238)

**Why**: Event listeners not using AbortController can accumulate with rapid mount/unmount cycles.

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';
  import {
    isPopoverSupported,
    setupPopoverKeyboardHandler,
    hidePopover
  } from '$lib/utils/popover';

  interface DropdownProps {
    /** Unique identifier for the dropdown popover */
    id: string;
    /** Label for the trigger button */
    label?: string;
    /** CSS class for custom styling */
    class?: string;
    /** Custom trigger button content */
    trigger?: Snippet;
    /** Dropdown menu content (slot) */
    children?: Snippet;
    /** Close dropdown when clicking outside */
    closeOnClickOutside?: boolean;
    /** Close dropdown when item selected */
    closeOnSelect?: boolean;
    /** Aria label for trigger */
    ariaLabel?: string;
    /** Trigger button variant */
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  }

  let {
    id,
    label = 'Menu',
    class: className = '',
    trigger,
    children,
    closeOnClickOutside = true,
    closeOnSelect = true,
    ariaLabel,
    variant = 'secondary'
  }: DropdownProps = $props();

  let dropdownElement = $state<HTMLElement | null>(null);
  let triggerElement = $state<HTMLElement | null>(null);
  let isSupported = $state(false);
  let isOpen = $state(false);
  let cleanupKeyboard: (() => void) | null = null;
  let eventController: AbortController | null = null;

  // PERF: Cache focusable elements to avoid querySelectorAll on every keydown
  const FOCUSABLE_SELECTOR = '[role="menuitem"], button, a, [tabindex]:not([tabindex="-1"])';
  let cachedFocusableItems: HTMLElement[] | null = null;

  function getFocusableItems(): HTMLElement[] {
    if (!dropdownElement) return [];
    // Recalculate only if cache is null (cleared on close)
    if (cachedFocusableItems === null) {
      cachedFocusableItems = Array.from(
        dropdownElement.querySelectorAll(FOCUSABLE_SELECTOR)
      ) as HTMLElement[];
    }
    return cachedFocusableItems;
  }

  function clearFocusableCache(): void {
    cachedFocusableItems = null;
  }

  onMount(() => {
    isSupported = isPopoverSupported();
    eventController = new AbortController();

    if (!isSupported) {
      console.warn('Popover API not supported - dropdown will use fallback styling');
    }

    // Setup keyboard handler
    if (dropdownElement) {
      cleanupKeyboard = setupPopoverKeyboardHandler(dropdownElement, {
        closeOnEscape: true,
        trapFocus: true
      });
    }

    // Setup outside click handler with AbortController
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        dropdownElement &&
        triggerElement &&
        !dropdownElement.contains(event.target as Node) &&
        !triggerElement.contains(event.target as Node)
      ) {
        dropdownElement.classList.remove('popover-open');
      }
    };

    if (closeOnClickOutside && !isSupported) {
      document.addEventListener('click', handleOutsideClick, {
        signal: eventController!.signal
      });
    }

    // Listen for popover state changes
    const handlePopoverShow = () => {
      isOpen = true;
      clearFocusableCache();
    };

    const handlePopoverHide = () => {
      isOpen = false;
      clearFocusableCache();
    };

    if (dropdownElement) {
      dropdownElement.addEventListener('popover:show', handlePopoverShow, {
        signal: eventController!.signal
      });
      dropdownElement.addEventListener('popover:hide', handlePopoverHide, {
        signal: eventController!.signal
      });
    }

    return () => {
      // Single cleanup call aborts all listeners
      eventController?.abort();
      eventController = null;

      if (cleanupKeyboard) {
        cleanupKeyboard();
        cleanupKeyboard = null;
      }

      clearFocusableCache();
    };
  });

  function handleTriggerClick() {
    if (!dropdownElement) return;

    if (isSupported && 'togglePopover' in dropdownElement) {
      dropdownElement.togglePopover();
    } else {
      // Fallback for non-supporting browsers
      dropdownElement.classList.toggle('popover-open');
    }
  }

  function handleItemClick() {
    if (!dropdownElement || !closeOnSelect) return;

    if (isSupported && 'hidePopover' in dropdownElement) {
      try {
        hidePopover(dropdownElement);
      } catch {
        // Already hidden
      }
    } else {
      dropdownElement.classList.remove('popover-open');
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent) {
    if (!dropdownElement) return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        if (isSupported && 'hidePopover' in dropdownElement) {
          try {
            hidePopover(dropdownElement);
          } catch {
            // Already hidden
          }
        } else {
          dropdownElement.classList.remove('popover-open');
        }
        triggerElement?.focus();
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        const focusedItem = dropdownElement.querySelector(':focus-visible') as HTMLElement;
        if (focusedItem) {
          focusedItem.click();
        }
        break;

      case 'ArrowDown': {
        event.preventDefault();
        const focusableItems = getFocusableItems();
        if (focusableItems.length === 0) break;

        const currentIndex = focusableItems.indexOf(
          dropdownElement.querySelector(':focus-visible') as HTMLElement
        );
        const nextIndex = currentIndex < focusableItems.length - 1 ? currentIndex + 1 : 0;
        focusableItems[nextIndex].focus();
        break;
      }

      case 'ArrowUp': {
        event.preventDefault();
        const items = getFocusableItems();
        if (items.length === 0) break;

        const currentIdx = items.indexOf(
          dropdownElement.querySelector(':focus-visible') as HTMLElement
        );
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : items.length - 1;
        items[prevIdx].focus();
        break;
      }

      case 'Home': {
        event.preventDefault();
        const focusableForHome = getFocusableItems();
        if (focusableForHome.length > 0) focusableForHome[0].focus();
        break;
      }

      case 'End': {
        event.preventDefault();
        const allItems = getFocusableItems();
        if (allItems.length > 0) {
          allItems[allItems.length - 1].focus();
        }
        break;
      }
    }
  }
</script>

<div class="dropdown-wrapper">
  <!-- Trigger Button -->
  <button
    bind:this={triggerElement}
    popovertarget={isSupported ? id : undefined}
    popovertargetaction={isSupported ? 'toggle' : undefined}
    class="dropdown-trigger dropdown-variant-{variant}"
    aria-label={ariaLabel || label}
    aria-haspopup="menu"
    aria-expanded={isOpen}
    aria-controls={id}
    onclick={handleTriggerClick}
  >
    {#if trigger}
      {@render trigger()}
    {:else}
      <span class="dropdown-label">{label}</span>
      <svg
        class="dropdown-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    {/if}
  </button>

  <!-- Dropdown Menu Popover -->
  <div
    bind:this={dropdownElement}
    {id}
    popover={isSupported ? 'auto' : undefined}
    class="dropdown-menu {className}"
    role="menu"
    tabindex="0"
    onclick={handleItemClick}
    onkeydown={handleMenuKeyDown}
  >
    <div class="dropdown-content">
      {#if children}
        {@render children()}
      {/if}
    </div>
  </div>
</div>

<!-- STYLES UNCHANGED - Keep existing styles from lines 289-667 -->
<style>
  /* [Paste all CSS from the original component lines 289-667] */
</style>
```

---

## Fix 6: Clear VirtualList References on Destroy

**File**: `src/lib/components/ui/VirtualList.svelte`

**Location**: Update onMount cleanup function (lines 224-228)

**Why**: ResizeObserver references can keep DOM elements in memory after component unmounts.

```typescript
onMount(() => {
  if (!scrollContainer) return;

  containerHeight = scrollContainer.clientHeight;
  isInitialized = true;

  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      containerHeight = entry.contentRect.height;
    }
  });
  resizeObserver.observe(scrollContainer);

  if (typeof itemHeight === 'function') {
    itemResizeObserver = new ResizeObserver((entries) => {
      let needsUpdate = false;
      for (const entry of entries) {
        const index = parseInt(entry.target.getAttribute('data-index') ?? '-1', 10);
        if (index >= 0) {
          const newHeight = entry.contentRect.height;
          const oldHeight = heightCache.get(index);
          if (oldHeight !== newHeight) {
            heightCache.set(index, newHeight);
            needsUpdate = true;
          }
        }
      }
      if (needsUpdate) {
        heightCache = new Map(heightCache);
      }
    });
  }

  return () => {
    // FIXED: Disconnect and clear references
    resizeObserver?.disconnect();
    itemResizeObserver?.disconnect();

    // Clear caches to allow GC
    resizeObserver = null;
    itemResizeObserver = null;
    heightCache.clear();
    offsetCache = [];
  };
});
```

---

## Verification Checklist

After applying these fixes, verify with this checklist:

```bash
# 1. Type checking should pass
npm run check

# 2. No console errors in dev
npm run dev

# 3. Memory monitoring output (if using)
# You should see memory remaining stable during navigation

# 4. Test store cleanup with Chrome DevTools
# - Open DevTools → Memory → Heap snapshot
# - Navigate between pages with stores 10 times
# - Take another snapshot
# - Compare: should have <5MB difference

# 5. Test rapid Dropdown mounts
# - Open/close dropdown 50 times rapidly
# - Check listener count in DevTools doesn't grow

# 6. Test search termination
# - Start search, then navigate away
# - No console warnings about updates on destroyed stores
```

---

## When to Apply These Fixes

**URGENT (Apply immediately)**:
1. Fix 1 (Layout cleanup) - Prevents store subscriptions from persisting
2. Fix 2 (User stores) - Memory leak in long sessions
3. Fix 5 (Dropdown) - Event listener accumulation with rapid navigation

**IMPORTANT (Apply this week)**:
4. Fix 3 (Search stores) - Race conditions on component unmount
5. Fix 4 (Global search) - Prevents stale updates

**NICE-TO-HAVE (Apply next sprint)**:
6. Fix 6 (VirtualList) - Improved cleanup (already working, just safer)

---

## Questions?

If anything is unclear:
1. Check the full analysis in `MEMORY_LEAK_ANALYSIS.md`
2. Review Chrome DevTools memory profiling docs
3. Test with the memory monitor utility already in your codebase
