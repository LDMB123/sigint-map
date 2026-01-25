# DMB Almanac State Management Architecture

## Current Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    UI LAYER (Svelte 5 Components)                 │
│                   Using $state, $derived, $effect                 │
└────────┬─────────────────────────────────────────────────────────┘
         │
         ├─ Local State ($state)
         │  ├─ _mounted, _rumInitialized in layout
         │  ├─ Modal/dialog state in components
         │  └─ Form input values
         │
         └─ Store Subscriptions ($derived from stores)
            ├─ Dexie stores
            ├─ PWA store
            ├─ Data store
            ├─ Navigation store
            └─ WASM stores

┌──────────────────────────────────────────────────────────────────┐
│                  STORE LAYER (Svelte Stores)                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─ PWA STORE ────────────────────────────────────────────────┐  │
│  │ ├─ isSupported: boolean                                    │  │
│  │ ├─ isReady: boolean (SW registered)                        │  │
│  │ ├─ hasUpdate: boolean (new SW waiting)                     │  │
│  │ ├─ isInstalled: boolean (standalone mode)                 │  │
│  │ ├─ isOffline: boolean (online/offline)                    │  │
│  │ └─ registration: ServiceWorkerRegistration | null         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─ DATA STORE ───────────────────────────────────────────────┐  │
│  │ ├─ status: 'loading' | 'ready' | 'error'                  │  │
│  │ └─ progress: LoadProgress                                 │  │
│  │    ├─ phase: 'idle' | 'checking' | 'fetching' | ...      │  │
│  │    ├─ entity: string (current entity loading)             │  │
│  │    ├─ percentage: number (0-100)                          │  │
│  │    └─ error?: string                                      │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─ NAVIGATION STORE ─────────────────────────────────────────┐  │
│  │ ├─ currentEntry: NavigationHistoryEntry | null            │  │
│  │ ├─ entries: NavigationHistoryEntry[]                      │  │
│  │ ├─ canGoBack: boolean                                     │  │
│  │ ├─ canGoForward: boolean                                  │  │
│  │ └─ isNavigating: boolean                                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─ DEXIE STORES (IndexedDB Reactive) ────────────────────────┐  │
│  │                                                             │  │
│  │  ENTITY STORES (Live Queries):                            │  │
│  │  ├─ allSongs ⚠️ LOADS ALL                                  │  │
│  │  ├─ allShows ⚠️ LOADS ALL                                  │  │
│  │  ├─ allVenues                                             │  │
│  │  ├─ allGuests                                             │  │
│  │  ├─ allTours                                              │  │
│  │  ├─ songStats, venueStats, showStats                      │  │
│  │  └─ globalStats                                           │  │
│  │                                                             │  │
│  │  PARAMETERIZED STORES (With Caching):                     │  │
│  │  ├─ getSongById(id) → cache[50]                           │  │
│  │  ├─ getSongBySlug(slug) → cache[50]                       │  │
│  │  ├─ getShowById(id) → cache[50]                           │  │
│  │  ├─ getShowWithSetlist(id) → cache[50]                    │  │
│  │  ├─ getAdjacentShows(id) → cache[50]                      │  │
│  │  ├─ getVenueById(id) → cache[50]                          │  │
│  │  ├─ getVenueShows(venueId) → cache[50]                    │  │
│  │  ├─ getTourByYear(year) → cache[50]                       │  │
│  │  ├─ getTourShows(tourId) → cache[50]                      │  │
│  │  ├─ getGuestBySlug(slug) → cache[50]                      │  │
│  │  └─ getGuestAppearances(guestId) → cache[50]              │  │
│  │                                                             │  │
│  │  DETAIL STORES (Parallel Queries):                        │  │
│  │  ├─ getSongDetailData(slug)                               │  │
│  │  │  └─ Fetches: song + performances + year breakdown      │  │
│  │  ├─ getVenueDetailData(id)                                │  │
│  │  │  └─ Fetches: venue + all shows                         │  │
│  │  ├─ getShowDetailData(id)                                 │  │
│  │  │  └─ Fetches: show + setlist + venue + tour + adjacent  │  │
│  │  ├─ getTourDetailData(year)                               │  │
│  │  │  └─ Fetches: tour + all shows                          │  │
│  │  └─ getGuestDetailData(slug)                              │  │
│  │     └─ Fetches: guest + appearances + year breakdown      │  │
│  │                                                             │  │
│  │  USER DATA STORES (Writable):                             │  │
│  │  ├─ userAttendedShows (add, remove, toggle, isAttended)  │  │
│  │  ├─ userFavoriteSongs (add, remove, toggle, isFavorite)  │  │
│  │  └─ userFavoriteVenues (add, remove, toggle)              │  │
│  │                                                             │  │
│  │  SEARCH STORES (Debounced):                               │  │
│  │  ├─ songSearch (debounce 300ms)                           │  │
│  │  ├─ venueSearch (debounce 300ms)                          │  │
│  │  ├─ guestSearch (debounce 300ms)                          │  │
│  │  └─ globalSearch (multi-entity search)                    │  │
│  │                                                             │  │
│  │  ANALYTICS STORES (WASM-Accelerated):                     │  │
│  │  ├─ topOpeningSongs                                       │  │
│  │  ├─ topClosingSongs                                       │  │
│  │  ├─ topEncoreSongs                                        │  │
│  │  ├─ topSongsByPerformances                                │  │
│  │  ├─ topVenuesByShows                                      │  │
│  │  ├─ showsByYearSummary                                    │  │
│  │  ├─ toursGroupedByDecade                                  │  │
│  │  ├─ liberationList                                        │  │
│  │  └─ dataFreshness                                         │  │
│  │                                                             │  │
│  │  MONITORING STORES:                                       │  │
│  │  ├─ databaseHealth                                        │  │
│  │  └─ storageWarning                                        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─ WASM STORES (Async Operations) ───────────────────────────┐  │
│  │ ├─ wasmLoadState                                           │  │
│  │ ├─ wasmIsReady                                             │  │
│  │ ├─ wasmStats (performance metrics)                         │  │
│  │ ├─ songStatisticsStore                                     │  │
│  │ ├─ liberationListStore                                     │  │
│  │ ├─ yearlyStatisticsStore                                  │  │
│  │ ├─ setlistSimilarityStore                                 │  │
│  │ └─ wasmOperations (operation tracker)                     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
         │
         └─ Database Access Layer

┌──────────────────────────────────────────────────────────────────┐
│              DATABASE LAYER (IndexedDB + SQLite)                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─ CLIENT-SIDE (IndexedDB via Dexie) ────────────────────────┐  │
│  │ ├─ songs (10K+ records)                                   │  │
│  │ ├─ shows (2K+ records)                                    │  │
│  │ ├─ venues (500+ records)                                  │  │
│  │ ├─ guests (200+ records)                                  │  │
│  │ ├─ tours (60 records)                                     │  │
│  │ ├─ setlistEntries (50K+ records)                          │  │
│  │ ├─ releases (100+ records)                                │  │
│  │ ├─ guestAppearances (2K+ records)                         │  │
│  │ ├─ userAttendedShows (user data)                          │  │
│  │ ├─ userFavoriteSongs (user data)                          │  │
│  │ ├─ userFavoriteVenues (user data)                         │  │
│  │ ├─ liberationList (computed)                              │  │
│  │ └─ syncMetadata (metadata)                                │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─ SERVER-SIDE (SQLite) ─────────────────────────────────────┐  │
│  │ └─ data/dmb-almanac.db (22MB)                              │  │
│  │    ├─ Same schema as client                               │  │
│  │    ├─ WAL mode enabled                                    │  │
│  │    └─ Source of truth for all data                        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Proposed Improved Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    UI LAYER (Enhanced)                            │
│                    + Form state helpers                           │
│                    + UI state management                          │
└────────┬─────────────────────────────────────────────────────────┘
         │
         └─ Store Subscriptions

┌──────────────────────────────────────────────────────────────────┐
│              STORE LAYER (With Improvements)                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  NEW: PAGINATION STORES                                          │
│  ├─ createPaginatedShowsStore(pageSize)                          │
│  │  ├─ items: Show[]                                             │
│  │  ├─ hasMore: boolean                                          │
│  │  ├─ loadMore(): void                                          │
│  │  └─ reset(): void                                             │
│  └─ createPaginatedSongsStore(pageSize)                          │
│     └─ Same structure                                            │
│                                                                    │
│  NEW: SYNC QUEUE STORE                                           │
│  └─ syncQueue                                                    │
│     ├─ items: SyncItem[]                                         │
│     ├─ isSyncing: boolean                                        │
│     ├─ pendingCount: number                                      │
│     ├─ failedCount: number                                       │
│     ├─ add(op, table, data)                                      │
│     ├─ sync()                                                    │
│     ├─ retry(itemId)                                             │
│     └─ clear()                                                   │
│                                                                    │
│  NEW: RESILIENT STORES                                           │
│  ├─ createResilientStore(queryFn, options)                       │
│  │  ├─ data: T | null                                            │
│  │  ├─ loading: boolean                                          │
│  │  ├─ error: Error | null                                       │
│  │  ├─ retryCount: number                                        │
│  │  ├─ canRetry: boolean                                         │
│  │  ├─ load()                                                    │
│  │  ├─ retry()                                                   │
│  │  └─ reset()                                                   │
│  └─ USED FOR:                                                    │
│     ├─ dataStore.initialize()                                    │
│     ├─ Critical data loads                                       │
│     └─ Detail page queries                                       │
│                                                                    │
│  NEW: FORM STATE STORE                                           │
│  ├─ createForm(initialValues, validate, onSubmit)               │
│  │  ├─ values: T                                                 │
│  │  ├─ touched: Partial<Record<keyof T, boolean>>               │
│  │  ├─ errors: Partial<Record<keyof T, string>>                 │
│  │  ├─ dirty: boolean                                            │
│  │  ├─ isSubmitting: boolean                                     │
│  │  ├─ setFieldValue(field, value)                               │
│  │  ├─ validateField(field)                                      │
│  │  ├─ submit()                                                  │
│  │  └─ reset()                                                   │
│  └─ USED FOR:                                                    │
│     ├─ Search forms                                              │
│     ├─ Filter dialogs                                            │
│     └─ User preference forms                                     │
│                                                                    │
│  NEW: MONITORING STORE                                           │
│  ├─ storeMetrics: Map<string, StoreMetrics>                      │
│  ├─ withMonitoring(name, store)                                  │
│  ├─ getStoreMetrics()                                            │
│  └─ exportMetrics()                                              │
│                                                                    │
│  IMPROVED: DEXIE STORES                                          │
│  ├─ allSongs → DEPRECATED → Use pagination                      │
│  ├─ allShows → DEPRECATED → Use pagination                      │
│  ├─ OTHER STORES → Enhanced with monitoring                     │
│  └─ NEW: Error recovery on query failure                        │
│                                                                    │
│  IMPROVED: PWA STORE                                             │
│  ├─ Uses AbortController for cleanup                            │
│  ├─ Better error messages                                        │
│  └─ Graceful SW update handling                                 │
│                                                                    │
│  IMPROVED: DATA STORE                                            │
│  ├─ Uses resilient stores for retries                           │
│  ├─ Better error categorization                                  │
│  ├─ Error recovery suggestions                                   │
│  └─ Online/offline state aware                                   │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
         │
         └─ Database Access

┌──────────────────────────────────────────────────────────────────┐
│                  DATABASE LAYER (Enhanced)                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  CLIENT-SIDE (IndexedDB + Sync):                                 │
│  ├─ Paginated queries (load on demand)                           │
│  ├─ Local sync queue (for offline mutations)                    │
│  ├─ Conflict resolution metadata                                 │
│  └─ Sync status tracking                                         │
│                                                                    │
│  SERVER-SIDE (SQLite):                                           │
│  └─ Same as before (source of truth)                             │
│                                                                    │
│  SYNC MECHANISM:                                                 │
│  ├─ On online → Process sync queue                               │
│  ├─ Handle conflicts → User chooses version                      │
│  ├─ Fallback to server on conflict                               │
│  └─ Persist sync status to IndexedDB                             │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## State Flow Diagrams

### Data Loading Flow

```
START
  │
  ├─► dataStore.initialize()
  │        │
  │        ├─► Check if data exists in IndexedDB
  │        │
  │        ├─ Yes: Set status = 'ready'
  │        │
  │        └─ No: Load from static JSON
  │             │
  │             ├─► loadInitialData(onProgress)
  │             │        │
  │             │        ├─► For each entity:
  │             │        │    ├─ Fetch JSON
  │             │        │    ├─ Validate data
  │             │        │    ├─ Store in IndexedDB
  │             │        │    └─ Emit progress
  │             │        │
  │             │        └─► When complete:
  │             │             └─ Status = 'ready'
  │             │
  │             └─► On error:
  │                  ├─ Retry with exponential backoff
  │                  ├─ After 3 retries:
  │                  └─ Status = 'error'
  │
  └─ Layout renders based on $dataState.status
       ├─ 'loading' → LoadingScreen
       ├─ 'ready' → App content
       └─ 'error' → ErrorScreen
```

### Offline Mutation Flow

```
USER ACTION: Mark show as attended
  │
  ├─ userAttendedShows.add(showId)
  │  │
  │  ├─ Save to local IndexedDB
  │  │
  │  ├─ Add to sync queue
  │  │  ├─ operation: 'add'
  │  │  ├─ table: 'userAttendedShows'
  │  │  ├─ data: { showId, ... }
  │  │  ├─ status: 'pending'
  │  │  └─ attempts: 0
  │  │
  │  └─ If online: syncQueue.sync()
  │     │
  │     └─ POST /api/sync
  │        ├─ Server validates
  │        ├─ Server applies change
  │        └─ Mark as 'synced'
  │
  └─ If offline:
     │
     ├─ Item stays in queue
     │
     ├─ User sees local change immediately
     │
     └─ When online:
        ├─ Browser online event fires
        ├─ syncQueue.sync()
        ├─ POST /api/sync for all pending
        ├─ Handle conflicts if needed
        └─ Clear synced items from queue
```

### Error Recovery Flow

```
STORE QUERY: getShowDetailData(showId)
  │
  ├─► Try queryFn() [Attempt 1]
  │   │
  │   ├─ Success → Return data
  │   │
  │   └─ Error
  │      │
  │      ├─ Wait 1000ms (exponential backoff)
  │      │
  │      └─► Try queryFn() [Attempt 2]
  │         │
  │         ├─ Success → Return data
  │         │
  │         └─ Error
  │            │
  │            ├─ Wait 2000ms (1000ms * 2^1)
  │            │
  │            └─► Try queryFn() [Attempt 3]
  │               │
  │               ├─ Success → Return data
  │               │
  │               └─ Error
  │                  │
  │                  ├─ Max retries reached
  │                  │
  │                  ├─ Set canRetry = true
  │                  │
  │                  ├─ Emit CustomEvent for monitoring
  │                  │
  │                  └─ Return error state
  │
  └─ Component shows:
     ├─ If loading: "Loading..."
     ├─ If error + canRetry: "Error occurred. [Retry] button"
     └─ If error + !canRetry: "Failed to load data"
```

### Pagination Flow

```
COMPONENT MOUNT: Shows page
  │
  ├─► createPaginatedStore(queryFn, pageSize=50)
  │   │
  │   ├─ Load first page (0-50)
  │   │  │
  │   │  ├─ Query DB for 51 items (50 + 1 to check hasMore)
  │   │  │
  │   │  ├─ Return 50 items + hasMore=true
  │   │  │
  │   │  └─ Store in state.items
  │   │
  │   └─ Render 50 items
  │      │
  │      └─ Show "Load More" button (if hasMore)
  │
  └─ USER CLICK: "Load More"
     │
     ├─ Load next page (50-100)
     │  │
     │  ├─ Query DB offset=50, limit=51
     │  │
     │  ├─ Append to state.items
     │  │
     │  └─ Update hasMore
     │
     └─ Render 100 items
        └─ Show "Load More" button (if hasMore)
```

---

## Store Relationships

```
┌─────────────────┐
│  pwaState       │────┐
└─────────────────┘    │
                       ├─────► $effect in layout
┌─────────────────┐    │       (sets data-offline)
│  dataState      │────┤
└─────────────────┘    │
                       └─► Triggers component re-render
┌─────────────────┐
│  isNavigating   │────┐
└─────────────────┘    │
                       ├─────► $effect in layout
                       │       (sets data-navigating)
                       │
       ┌────────────────┘
       │
       ▼
  ┌─────────────────────────────────┐
  │  Dexie Stores                   │
  │  ├─ allShows                    │
  │  ├─ allSongs                    │
  │  ├─ getSongDetailData(slug)     │ ◄──── Depend on:
  │  └─ getShowDetailData(id)       │       - User search query
  │                                 │       - Route param
  │                                 │       - User selections
  └─────────────────────────────────┘
        ▲
        │ All depend on:
        ├─ IndexedDB data available
        └─ Browser environment

┌─────────────────────────────────┐
│  User Data Stores               │
│  ├─ userAttendedShows           │
│  ├─ userFavoriteSongs           │ ◄──── Sync with:
│  └─ userFavoriteVenues          │       - syncQueue (when offline)
└─────────────────────────────────┘       - Server (when online)

┌─────────────────────────────────┐
│  WASM Stores                    │
│  ├─ topOpeningSongs             │ ◄──── Depend on:
│  ├─ liberationList              │       - setlistEntries from DB
│  └─ showsByYearSummary          │       - WASM module ready
└─────────────────────────────────┘
```

---

## Performance Characteristics

### Current Performance

```
allShows query:
  ├─ Query time: 500-800ms (first load)
  ├─ Memory used: 50MB (10K shows in memory)
  ├─ Subscribers re-render: Every update
  └─ Cache hit: Always (but re-fetches everything)

getSongDetailData:
  ├─ Parallel queries: 3 (song + performances + breakdown)
  ├─ Query time: 200-400ms
  ├─ Memory used: Variable (depends on results)
  └─ Caching: Moderate (50 entries max)
```

### After Improvements

```
createPaginatedShowsStore(50):
  ├─ First page query: 100-200ms (50 items)
  ├─ Memory used: 2-5MB (50 shows in memory)
  ├─ Load more: 50-100ms (incremental)
  └─ Total load for 1000 shows: ~2s (vs ~3s with full load)

getShowDetailData (with resilient wrapper):
  ├─ Success case: 200-400ms (same)
  ├─ Failure + retry: 400-1000ms (with backoff)
  ├─ Cache hit: 10-50ms
  └─ User experience: Instant feedback + retry option
```

---

## Dependency Graph

```
Layout (+layout.svelte)
  ├─ pwaStore
  │  └─ offline detection
  ├─ dataStore
  │  └─ initial data load
  └─ isNavigating
     └─ navigation progress

Shows Page (shows/+page.svelte)
  ├─ allShows ⚠️ PROBLEM: Loads all
  │  └─ Used by: show list, filtering, grouping
  │
  ├─ globalStats
  │  └─ Used by: stats display
  │
  └─ [AFTER IMPROVEMENTS]
     ├─ createPaginatedShowsStore(50)
     │  └─ items loaded on demand
     │
     └─ showsByYearSummary (WASM)
        └─ aggregated yearly data

Song Detail Page (songs/[slug]/+page.svelte)
  ├─ getSongDetailData(slug)
  │  ├─ song data
  │  ├─ performance history
  │  └─ yearly breakdown
  │
  ├─ [AFTER IMPROVEMENTS]
  │  ├─ Wrapped with resilient store
  │  └─ Auto-retry on failure

User Data Operations
  ├─ userAttendedShows
  │  ├─ Add show
  │  ├─ [AFTER IMPROVEMENTS]
  │  │  └─ → syncQueue.add()
  │  └─ Remove show
  │     └─ [AFTER IMPROVEMENTS]
  │        └─ → syncQueue.add()
  │
  └─ When online:
     └─ syncQueue.sync()
        └─ POST /api/sync
```

---

## Recommended Implementation Order

```
Week 1: Critical Fixes
├─ Day 1: Fix PWA store cleanup (AbortController)
├─ Day 2: Create pagination store
├─ Day 3: Create resilient store + implement
├─ Day 4: Create sync queue store + implement
└─ Day 5: Testing + monitoring

Week 2: Enhancement
├─ Day 1: Create form state helper
├─ Day 2: Add store monitoring
├─ Day 3: Implement DevTools integration
├─ Day 4: Update documentation
└─ Day 5: Code review + refinement

Week 3-4: Strategic Features
├─ Conflict resolution
├─ Advanced sync features
├─ Comprehensive test suite
└─ Production deployment
```

---

## Testing Strategy by Layer

```
UNIT TESTS:
├─ Store creation and subscription
├─ State updates and derivation
├─ Cache invalidation
├─ Error handling and retries
└─ Offline mutation queueing

INTEGRATION TESTS:
├─ Store interactions
├─ Data flow through layers
├─ Cache coherency
└─ Pagination + search combination

E2E TESTS:
├─ Offline scenarios
├─ Sync on reconnect
├─ Error recovery
└─ User workflows
```

---

**This architecture document should be kept in sync with the codebase as improvements are implemented.**
