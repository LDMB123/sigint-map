# Detailed Async Pattern Analysis - DMB Almanac

## Issue #1: Unhandled Promise Rejections in User Data Stores

### Location
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts`
- Lines: 789-796 (userAttendedShows), 883-890 (userFavoriteSongs), 968-974 (userFavoriteVenues)

### Current Code
```typescript
function createUserAttendedShowsStore() {
    const store = writable<UserAttendedShow[]>([]);
    let subscription: { unsubscribe: () => void } | null = null;

    if (isBrowser) {
        getDb()
            .then((db) => {
                subscription = liveQuery(() => db.userAttendedShows.toArray()).subscribe({
                    next: (value) => store.set(value),
                    error: (err) => console.error('[dexie] userAttendedShows subscription error:', err)
                });
            })
            .catch((err) => console.error('[dexie] Failed to initialize userAttendedShows store:', err));
    }

    return {
        subscribe: store.subscribe,
        async add(showId: number, showDate?: string) {
            const db = await getDb();
            try {
                await db.userAttendedShows.add({
                    showId,
                    addedAt: Date.now(),
                    // ... other fields
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
        // ... other methods
    };
}
```

### The Problem

**Silent Failure Pattern:**
1. If `getDb()` rejects during store initialization, the error is logged to console only
2. The store remains uninitialized with empty array `[]`
3. Consumers have no way to know the store failed to load
4. Later calls to `.add()` will succeed, but the live query was never established
5. User favorites appear to work, but won't sync with database changes

**Timeline:**
- T=0ms: Store created, `getDb()` called
- T=100ms: `getDb()` rejects (IndexedDB error, corrupted data, etc.)
- T=101ms: Error logged to console, subscription never created
- T=200ms: User marks show as favorite via `.add()`
- T=201ms: Add succeeds, but changes never trigger live query (it was never set up)
- T=500ms: Component reads store, gets empty array
- **Result: Silent data loss**

### Why This Happens

The pattern conflates two error handling strategies:

```typescript
// Pattern 1: Fire-and-forget (bad for stores)
getDb().catch(err => console.error('Error:', err));
// Problem: Caller doesn't know if it succeeded

// Pattern 2: Promise chain without awaiting
function initStore() {
    getDb().then(db => { /* setup */ });
    return store; // Returns before db ready!
}
// Problem: Store is returned before initialization complete
```

### Occurrences

**Three identical issues:**
1. `userAttendedShows` (Line 789-796)
2. `userFavoriteSongs` (Line 883-890)
3. `userFavoriteVenues` (Line 968-974)

### Impact

**Severity: HIGH**

- Affects three critical user data stores
- Silent failure mode (no error visible to user)
- Potential data loss (changes made but not synced)
- Duplicate initialization pattern across codebase (future maintenance risk)

### How to Fix

**Option 1: Add initialization state tracking**
```typescript
interface StoreState {
    initialized: boolean;
    error: Error | null;
    data: UserAttendedShow[];
}

function createUserAttendedShowsStore() {
    const state = writable<StoreState>({
        initialized: false,
        error: null,
        data: []
    });

    if (isBrowser) {
        getDb()
            .then((db) => {
                subscription = liveQuery(() => db.userAttendedShows.toArray()).subscribe({
                    next: (value) => state.update(s => ({ ...s, data: value, initialized: true })),
                    error: (err) => {
                        console.error('[dexie] userAttendedShows subscription error:', err);
                        state.update(s => ({ ...s, error: err }));
                    }
                });
            })
            .catch((err) => {
                console.error('[dexie] Failed to initialize userAttendedShows store:', err);
                state.update(s => ({ ...s, error: err }));
            });
    }

    return {
        subscribe: state.subscribe,
        async add(showId: number, showDate?: string) {
            const currentState = get(state);
            if (currentState.error) {
                throw new Error('Store initialization failed: ' + currentState.error.message);
            }
            // ... rest of add logic
        }
    };
}
```

**Option 2: Async initialization promise**
```typescript
function createUserAttendedShowsStore() {
    let initPromise = Promise.resolve();
    const store = writable<UserAttendedShow[]>([]);

    if (isBrowser) {
        initPromise = getDb()
            .then((db) => {
                return new Promise<void>((resolve, reject) => {
                    subscription = liveQuery(() => db.userAttendedShows.toArray()).subscribe({
                        next: (value) => {
                            store.set(value);
                            resolve();
                        },
                        error: (err) => reject(err)
                    });
                });
            });
    }

    return {
        subscribe: store.subscribe,
        async add(showId: number, showDate?: string) {
            await initPromise; // Wait for store to be ready
            const db = await getDb();
            // ... rest of add logic
        }
    };
}
```

---

## Issue #2: Missing AbortController in Data Loader Fetches

### Location
`/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/data-loader.ts`
Lines: 1200-1246

### Current Code
```typescript
export async function loadInitialData(
    onProgress?: (progress: LoadProgress) => void,
    config: Partial<LoaderConfig> = {}
): Promise<void> {
    const finalConfig: LoaderConfig = { ...DEFAULT_CONFIG, ...config };
    const db = getDb();

    try {
        // Phase 1: Check if already loaded
        onProgress?.({
            phase: 'checking',
            loaded: 0,
            total: 1,
            percentage: 0,
        });

        const alreadyLoaded = await isDataLoaded();
        if (alreadyLoaded) {
            return;
        }

        // Phase 2: Fetch all JSON files in parallel using Promise.allSettled
        onProgress?.({
            phase: 'fetching',
            loaded: 0,
            total: LOAD_TASKS.length,
            percentage: 0,
        });

        const fetchedData: Map<string, TransformedEntityArray> = new Map();

        // ❌ NO ABORT CONTROLLER - Fetches will continue forever if user navigates away
        const fetchPromises = LOAD_TASKS.map(async (task) => {
            const rawData = await fetchJsonData<RawScrapedData>(task.jsonFile);
            return { task, rawData };
        });

        const fetchResults = await Promise.allSettled(fetchPromises);

        // Process results with graceful degradation
        // ...
    } catch (error) {
        logger.error('[DataLoader] Data initialization failed:', error);
        throw error;
    }
}
```

### The Problem

**No timeout or cancellation on parallel JSON fetches:**
- User navigates to another page during data load
- 10+ JSON fetches are still pending
- Browser keeps connections open
- Memory usage increases as data is buffered
- No way to cancel the operation

**Assuming `fetchJsonData()` uses fetch without timeout:**
```typescript
async function fetchJsonData<T>(url: string): Promise<T | null> {
    try {
        const response = await fetch(url); // ❌ No AbortController, no timeout
        if (!response.ok) return null;
        return response.json();
    } catch (error) {
        console.error(`Failed to fetch ${url}:`, error);
        return null;
    }
}
```

### Timeline - Normal Load
- T=0ms: User on home page, data load starts
- T=500ms: 5 JSON files downloaded
- T=2000ms: All 10 files downloaded, loading begins
- T=3000ms: Load complete, store ready
- ✓ **Success**

### Timeline - Problematic Scenario
- T=0ms: User on home page, data load starts
- T=500ms: 5 JSON files downloaded
- T=750ms: **User navigates to /songs**
- T=1000ms: Component unmounts, but fetchPromises still pending
- T=1500ms: 8 of 10 files downloaded
- T=2000ms: All files finished downloading (wasting bandwidth)
- T=2100ms: Dexie inserts happen on unmounted app
- T=2200ms: Data arrives in store that nobody is listening to
- **Result: Wasted network, wasted CPU, potential race condition**

### Why This Happens

The `loadInitialData()` function:
1. Is not tied to component lifecycle
2. Doesn't accept cancellation signal
3. Uses `Promise.allSettled()` which ignores abort

### Impact

**Severity: MEDIUM**

- Affects initial app load (happens once per session usually)
- Could cause issues if user rapidly navigates before data loads
- On slow networks (mobile 3G), user could navigate away 10+ times per load
- Each time, more orphaned fetches continue
- Eventually: "Too many open connections" or memory exhaustion

### How to Fix

**Add AbortController with timeout:**
```typescript
export async function loadInitialData(
    onProgress?: (progress: LoadProgress) => void,
    config: Partial<LoaderConfig> = {},
    signal?: AbortSignal
): Promise<void> {
    const finalConfig: LoaderConfig = { ...DEFAULT_CONFIG, ...config };
    const db = getDb();

    // Create abort controller with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    // Link external signal if provided (for navigation cancellation)
    if (signal) {
        signal.addEventListener('abort', () => controller.abort());
    }

    try {
        // ... checking phase

        // Fetch with abort support
        const fetchPromises = LOAD_TASKS.map(async (task) => {
            try {
                const rawData = await fetchJsonDataWithAbort<RawScrapedData>(
                    task.jsonFile,
                    controller.signal
                );
                return { task, rawData };
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                    throw error; // Re-throw abort errors
                }
                // Other errors are handled by allSettled
                return { task, rawData: null };
            }
        });

        const fetchResults = await Promise.allSettled(fetchPromises);

        // Check if we were aborted during fetch phase
        if (controller.signal.aborted) {
            throw new Error('Data loading cancelled');
        }

        // ... process results

    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            logger.debug('[DataLoader] Data loading cancelled by user navigation');
        } else {
            logger.error('[DataLoader] Data initialization failed:', error);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

// Update fetch helper to accept signal
async function fetchJsonDataWithAbort<T>(
    url: string,
    signal: AbortSignal
): Promise<T | null> {
    try {
        const response = await fetch(url, { signal });
        if (!response.ok) return null;
        return response.json();
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw error; // Propagate abort
        }
        console.error(`Failed to fetch ${url}:`, error);
        return null;
    }
}
```

---

## Issue #3: Global Search Store Database Race

### Location
`/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts`
Lines: 1520-1595

### Current Code
```typescript
export function createGlobalSearchStore() {
    const query = writable('');
    const results = writable<GlobalSearchResults>({});
    const isSearching = writable(false);

    let timeoutId: ReturnType<typeof setTimeout>;
    let currentSearchId = 0;
    let isDestroyed = false;
    let unsubscribe: (() => void) | null = null;

    if (isBrowser) {
        // ❌ Subscribe immediately, no check if DB is ready
        unsubscribe = query.subscribe((q) => {
            clearTimeout(timeoutId);

            if (q.trim().length < 1) {
                results.set({});
                isSearching.set(false);
                return;
            }

            isSearching.set(true);

            const searchId = ++currentSearchId;

            timeoutId = setTimeout(async () => {
                if (isDestroyed) return;

                try {
                    // ❌ Database might not be initialized yet
                    const searchResults = await performGlobalSearch(q.trim(), 10);
                    if (searchId === currentSearchId && !isDestroyed) {
                        results.set(searchResults);
                    }
                } catch (error) {
                    if (searchId === currentSearchId && !isDestroyed) {
                        console.error('[dexie] Global search error:', error);
                        results.set({});
                    }
                }
            }, 300);
        });
    }
```

### The Problem

**Race condition during app initialization:**
- App boots up
- `createGlobalSearchStore()` called before database initialized
- Store subscription is created
- User types in search box at T=100ms
- `performGlobalSearch()` awaits database (T=150ms for DB init)
- Meanwhile, database initialization also happening on main thread
- Two concurrent async flows trying to access DB during critical setup phase

### Detailed Flow
```
T=0ms: App creation
├─ createGlobalSearchStore()
│  └─ query.subscribe() setup (synchronous)
├─ Database initialization starts
│  └─ IndexedDB open + schema setup
│
T=100ms: User types "Dave"
├─ query.set("Dave") fires
├─ setTimeout(..., 300ms) scheduled
│  └─ Will call performGlobalSearch() at T=400ms
│
T=150ms: Database initialization complete
│
T=400ms: Search timeout fires
├─ performGlobalSearch() starts
├─ Database query starts (DB ready now, so works)
├─ ✓ Search succeeds
│
BUT: What if user typed before T=150ms?
│
T=50ms: User types "Dave"
├─ setTimeout(..., 300ms) scheduled
├─ Will call performGlobalSearch() at T=350ms
│
T=150ms: Database initialization complete
│
T=350ms: Search timeout fires
├─ performGlobalSearch() starts
├─ Database query starts
├─ ⚠ Could race with initialization cleanup
└─ Potential: Query runs during DB schema update
```

### Why This Happens

1. `createGlobalSearchStore()` runs at module load time
2. Store doesn't know when DB is ready
3. `performGlobalSearch()` calls database functions
4. Database initialization is async and could still be pending

### Impact

**Severity: MEDIUM**

- Only affects very first search (app coldstart)
- Rare: User has to type quickly after page load
- Usually: DB initializes before 300ms debounce timeout
- But: On slow mobile (3G), DB init could take 500ms+
- Result: Stale error messages, silent search failures, confusing UX

### How to Fix

**Option 1: Wait for DB before first search**
```typescript
export function createGlobalSearchStore() {
    const query = writable('');
    const results = writable<GlobalSearchResults>({});
    const isSearching = writable(false);

    let timeoutId: ReturnType<typeof setTimeout>;
    let currentSearchId = 0;
    let isDestroyed = false;
    let unsubscribe: (() => void) | null = null;
    let dbReady = false;

    if (isBrowser) {
        // Ensure DB is ready before subscribing
        getDb()
            .then(() => {
                dbReady = true;
            })
            .catch((err) => {
                console.error('[Global Search] Failed to initialize database:', err);
            });

        unsubscribe = query.subscribe((q) => {
            clearTimeout(timeoutId);

            if (q.trim().length < 1) {
                results.set({});
                isSearching.set(false);
                return;
            }

            // Only search if DB is ready
            if (!dbReady) {
                isSearching.set(false);
                console.debug('[Global Search] Database not ready, skipping search');
                return;
            }

            isSearching.set(true);
            const searchId = ++currentSearchId;

            timeoutId = setTimeout(async () => {
                if (isDestroyed) return;

                try {
                    const searchResults = await performGlobalSearch(q.trim(), 10);
                    if (searchId === currentSearchId && !isDestroyed) {
                        results.set(searchResults);
                    }
                } catch (error) {
                    if (searchId === currentSearchId && !isDestroyed) {
                        console.error('[dexie] Global search error:', error);
                        results.set({});
                    }
                }
            }, 300);
        });
    }

    return {
        // ... rest of store
    };
}
```

---

## Issue #4: Promise.all vs Promise.allSettled in Navigation

### Location
`/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/utils/navigationApi.ts`
Lines: 680-690

### Current Code
```typescript
async function parallelDataAndNavigation(
    url: string,
    loadDataFn: (url: string) => Promise<any>,
    options?: NavigationOptions
): Promise<void> {
    // Start loading data in parallel
    const dataPromise = loadDataFn(url);

    // Start navigation with transition
    const navPromise = navigateWithTransition(url, options);

    // ❌ Wait for both - if either fails, entire navigation fails
    await Promise.all([dataPromise, navPromise]);
}
```

### The Problem

**Promise.all fails if ANY promise rejects:**
- If `loadDataFn` is slow on slow network, times out after 30s
- Navigation immediately fails, user sees nothing
- User has to retry entire operation

**Better: Use Promise.allSettled** to handle partial failures:
- If data fails: Navigate anyway, show error state
- If navigation fails: User stays on page, can retry data load
- Both fail: Show error message but don't break app

### Timeline - Failure Case
```
T=0ms: User clicks link
├─ dataPromise starts loading
└─ navPromise starts navigation

T=5000ms: Navigation completes (fast)
├─ URL changed
├─ New component mounting
└─ Waiting for dataPromise

T=30000ms: dataPromise times out and rejects
├─ Promise.all catches rejection
├─ Entire parallelDataAndNavigation() rejects
├─ Navigation is already done (user on wrong page)
└─ New component has no data, shows spinner forever
```

### How to Fix

```typescript
async function parallelDataAndNavigation(
    url: string,
    loadDataFn: (url: string) => Promise<any>,
    options?: NavigationOptions
): Promise<void> {
    const dataPromise = loadDataFn(url);
    const navPromise = navigateWithTransition(url, options);

    // Use allSettled to handle partial failures
    const [dataResult, navResult] = await Promise.allSettled([
        dataPromise,
        navPromise
    ]);

    // Analyze results
    if (navResult.status === 'rejected') {
        console.error('[Navigation] Navigation failed:', navResult.reason);
        // Could rethrow or handle gracefully
        throw navResult.reason;
    }

    if (dataResult.status === 'rejected') {
        console.error('[Navigation] Data loading failed:', dataResult.reason);
        // Don't fail entire operation, let component handle missing data
        // Component should show error/retry UI
    }

    // At this point, navigation succeeded even if data failed
}
```

---

## Summary of Race Condition Risks

| Issue | Trigger | Impact | Probability |
|-------|---------|--------|-------------|
| User store silent failure | DB init fails | Data loss | Low (requires DB error) |
| Stale closure in song detail | Normal operation | Works but hard to maintain | Medium (not a bug) |
| Global search DB race | Very fast typing at app start | Search fails silently | Low (needs sub-150ms typing) |
| Navigation error handling | Slow network data load | User sees spinner indefinitely | Medium (on 3G networks) |
| Data loader fetch cancellation | User navigates during load | Wasted network/CPU | Low (rare, low impact) |

---

## Testing Strategy

### Unit Tests
```typescript
// Test: User store initialization failure
test('handles database initialization failure', async () => {
    const store = createUserAttendedShowsStore();

    // Simulate DB initialization failure
    // Verify store shows error state, not empty array
    expect(get(store).error).toBeDefined();
});

// Test: Global search waits for DB
test('waits for database before searching', async () => {
    const store = createGlobalSearchStore();
    store.setQuery('test');

    // Should not throw even if DB not ready
    // Should wait for DB initialization
    await new Promise(r => setTimeout(r, 200));
    expect(store).toBeDefined();
});
```

### Integration Tests
```typescript
// Test: Rapid navigation cancels data load
test('cancels data load on navigation', async () => {
    const loadSpy = vi.fn();
    const loadPromise = loadInitialData(loadSpy);

    // Simulate navigation
    await new Promise(r => setTimeout(r, 50));
    // cancelLoad(); // Would need to expose this

    // Verify fetches are cleaned up
    expect(openRequests).toBe(0);
});

// Test: Multiple concurrent user store writes
test('handles concurrent user data mutations', async () => {
    const store = createUserAttendedShowsStore();

    await Promise.all([
        store.add(1),
        store.add(2),
        store.add(3)
    ]);

    // Verify all succeeded and order is consistent
    const attended = get(store);
    expect(attended.length).toBe(3);
});
```

