# Offline Mutation Queue - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DMB Almanac PWA                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐                                              │
│  │  Svelte          │                                              │
│  │  Component       │                                              │
│  │                  │                                              │
│  │  addFavorite()   │                                              │
│  └────────┬─────────┘                                              │
│           │                                                        │
│           │ queueMutation(url, method, body)                       │
│           │                                                        │
│           ▼                                                        │
│  ┌─────────────────────────────────────────┐                       │
│  │  Offline Mutation Queue Service         │                       │
│  ├─────────────────────────────────────────┤                       │
│  │                                         │                       │
│  │  ┌──────────────────────────────────┐   │                       │
│  │  │  Queue Operations                │   │                       │
│  │  ├──────────────────────────────────┤   │                       │
│  │  │ • queueMutation()                │   │                       │
│  │  │ • processQueue()                 │   │                       │
│  │  │ • getQueueStats()                │   │                       │
│  │  │ • clearCompleted()               │   │                       │
│  │  └──────────────────────────────────┘   │                       │
│  │                                         │                       │
│  │  ┌──────────────────────────────────┐   │                       │
│  │  │  Event Listeners                 │   │                       │
│  │  ├──────────────────────────────────┤   │                       │
│  │  │ • 'online' event                 │   │                       │
│  │  │ • 'offline' event                │   │                       │
│  │  │ • 'visibilitychange' event       │   │                       │
│  │  └──────────────────────────────────┘   │                       │
│  │                                         │                       │
│  │  ┌──────────────────────────────────┐   │                       │
│  │  │  Background Sync API             │   │                       │
│  │  ├──────────────────────────────────┤   │                       │
│  │  │ • registerBackgroundSync()       │   │                       │
│  │  │ • Sync tag coordination          │   │                       │
│  │  └──────────────────────────────────┘   │                       │
│  │                                         │                       │
│  │  ┌──────────────────────────────────┐   │                       │
│  │  │  Retry Logic                     │   │                       │
│  │  ├──────────────────────────────────┤   │                       │
│  │  │ • Exponential backoff (1s,2s,4s) │   │                       │
│  │  │ • Jitter to prevent thundering   │   │                       │
│  │  │ • Max 3 retries                  │   │                       │
│  │  │ • Error classification           │   │                       │
│  │  └──────────────────────────────────┘   │                       │
│  │                                         │                       │
│  └─────────────────┬───────────────────────┘                       │
│                    │                                               │
└────────────────────┼───────────────────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
    ┌──────────────┐    ┌─────────────────┐
    │  IndexedDB   │    │   Browser       │
    │  (Dexie.js)  │    │   Network       │
    │              │    │                 │
    │ ┌──────────┐ │    │ ┌─────────────┐ │
    │ │ Queue    │ │    │ │ fetch()     │ │
    │ │ Storage  │ │    │ │             │ │
    │ │          │ │    │ │ POST/PUT    │ │
    │ │ ┌──────┐ │ │    │ │ PATCH/DEL   │ │
    │ │ │Items │ │ │    │ │             │ │
    │ │ └──────┘ │ │    │ │ timeout: 30s│ │
    │ └──────────┘ │    │ └─────────────┘ │
    └──────────────┘    └─────────────────┘
```

## Data Flow Diagram

```
OFFLINE SCENARIO:
═════════════════════════════════════════════════════════════════════

User Component        Service              IndexedDB        Network
    │                  │                      │                │
    │─ addFavorite()──→│                      │                │
    │                  │─ check online status │                │
    │                  │                      │                │
    │                  │─ OFFLINE! ────────→  │                │
    │                  │  add to queue        │                │
    │                  │                      │                │
    │                  │← queueID (e.g. 42)   │                │
    │← Promise resolves│                      │                │
    │                  │                      │                │
    │ (Update UI       │                      │                │
    │  optimistically) │                      │                │
    │                  │                      │                │
    │        [USER WAITS FOR NETWORK]         │                │
    │                  │                      │                │
    │ [NETWORK RESTORED - 'online' event]    │                │
    │                  │                      │                │
    │                  │◄──[online event]─────│                │
    │                  │                      │                │
    │                  │─ processQueue()──────│                │
    │                  │  fetch all pending   │                │
    │                  │                      │                │
    │                  │◄─ [mutation obj]─────│                │
    │                  │                      │                │
    │                  │─ fetch(url, opts)───────────────────→ │
    │                  │                      │                │ POST
    │                  │                      │                │ /api/fav
    │                  │                      │                │
    │                  │                      │         [Server processing]
    │                  │                      │                │
    │                  │◄─ Response 200 ──────────────────────│
    │                  │                      │                │
    │                  │─ update status ──────│                │
    │                  │  "completed"         │                │
    │                  │                      │                │
    │                  │◄─ [complete] ────────│                │
    │                  │                      │                │
    │◄─ Mutation done ─│                      │                │
    │                  │                      │                │


ONLINE SCENARIO:
═════════════════════════════════════════════════════════════════════

User Component        Service              IndexedDB        Network
    │                  │                      │                │
    │─ addFavorite()──→│                      │                │
    │                  │─ check online status │                │
    │                  │                      │                │
    │                  │─ ONLINE! ───────────────────────→ │
    │                  │  fetch immediately   │                │ POST
    │                  │                      │                │
    │                  │                      │         [Server processing]
    │                  │                      │                │
    │                  │◄─ Response 200 ──────────────────────│
    │                  │                      │                │
    │◄─ Promise resolves                      │                │
    │                  │                      │                │
    │ (Update UI)      │                      │                │
    │                  │                      │                │


FAILURE + RETRY SCENARIO:
═════════════════════════════════════════════════════════════════════

User Component        Service              IndexedDB        Network
    │                  │                      │                │
    │─ addFavorite()──→│                      │                │
    │                  │─ ONLINE but API DOWN │                │
    │                  │                      │                │
    │                  │─ fetch()─────────────────────────→ │
    │                  │                      │                │ 500 ERROR
    │                  │                      │                │
    │                  │◄─ Error 500 ──────────────────────│
    │                  │                      │                │
    │                  │─ update status ──────│                │
    │                  │  "retrying"          │                │
    │                  │ set nextRetry = now  │                │
    │                  │ increment retries    │                │
    │                  │                      │                │
    │◄─ Promise resolves                      │                │
    │ (still queued!)  │                      │                │
    │                  │                      │                │
    │        [WAIT 1000ms + jitter]           │                │
    │                  │                      │                │
    │        [scheduledRetry triggers] ◄──────│                │
    │                  │                      │                │
    │                  │─ fetch() again ───────────────────→ │
    │                  │                      │                │ 200 OK
    │                  │                      │                │
    │                  │◄─ Response 200 ───────────────────│
    │                  │                      │                │
    │                  │─ update status ──────│                │
    │                  │  "completed"         │                │
    │                  │                      │                │
    │ [Eventually UI   │                      │                │
    │  sees completed] │                      │                │
    │                  │                      │                │
```

## State Machine Diagram

```
MUTATION LIFECYCLE:
═════════════════════════════════════════════════════════════════════

                        ┌─────────────────┐
                        │  New Mutation   │
                        │  (from user)    │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                    ┌─→ │    PENDING      │ ◄─┐
                    │   │ (in queue,      │   │
                    │   │  awaiting send) │   │
                    │   └────────┬────────┘   │
                    │            │            │
              [max retries]       │            │
              [reached]           │ [online +
                    │             │  no errors]
                    │             │
                    │             ▼
                    │    ┌─────────────────┐
                    │    │  fetch(url)     │
                    │    │  (sending req)  │
                    │    └────────┬────────┘
                    │             │
              [error]             │ [success]
              [or 4xx]      ┌──────┴──────┐
                    │       │             │
                    │       ▼             ▼
            ┌───────────────────┐  ┌──────────────┐
            │    RETRYING       │  │  COMPLETED   │
            │ (scheduled for    │  │ (sent, done) │
            │  next attempt)    │  └──────────────┘
            └─────────┬─────────┘
                      │
              [backoff delay]
              [expires]
                      │
                      ▼
              [retry attempt ≥ 3?]
                      │
      [YES]           │ [NO]
        │             │
        ▼             ▼
    ┌───────┐    [retry]
    │FAILED │      │
    │(given │      └────→ back to fetch()
    │ up)   │
    └───────┘

Status Transitions:
═════════════════════════════════════════════════════════════════════

pending ──[fetch succeeded]──→ completed
   ↑                               ↓
   │                          [cleanup]
   │                               ↓
   │                            DELETED
   │
   ├──[fetch failed, error retryable]──→ retrying
   │                                        ↓
   │                                  [backoff delay]
   │                                        ↓
   └────────────────────────────────────────┘


   pending ──[fetch failed, 4xx error]──→ failed
      ↑                                     ↓
      │                               [manual action
      │                                needed]
      │
      ├──[too many retries]──→ failed
      │
      └──[network error]──→ retrying
```

## Component Integration Diagram

```
APPLICATION STRUCTURE:
═════════════════════════════════════════════════════════════════════

src/routes/
├── +layout.svelte
│   │
│   └─ onMount(() => {
│        initializeQueue() ◄─────┐
│        registerBackgroundSync()│ Initializes service
│      })                        │
│
└── shows/
    ├── [id]/
    │   └── +page.svelte
    │       │
    │       └─ onFavorite() {
    │            queueMutation(...) ◄─── Uses service
    │            optimisticUpdate()
    │          }
    │
    └── favorites.svelte
        │
        └─ getQueueStats() ◄─── Monitors service
           displayPendingCount()

src/lib/services/
├── offlineMutationQueue.ts
│   │
│   ├─ initializeQueue()
│   ├─ cleanupQueue()
│   ├─ queueMutation()
│   ├─ processQueue()
│   ├─ getQueueStats()
│   └─ ... (9 more functions)
│
└── index.ts (re-exports)


SERVICE WORKER INTEGRATION:
═════════════════════════════════════════════════════════════════════

src/service-worker.ts
│
└─ addEventListener('sync', (event) => {
     if (event.tag === 'dmb-offline-mutation-queue') {
       event.waitUntil(
         fetch('/__queue/process', { method: 'POST' })
       )
     }
   })

src/routes/__queue/process/+server.ts
│
└─ export async function POST() {
     const result = await processQueue()
     return json(result)
   }
```

## Retry Backoff Visualization

```
EXPONENTIAL BACKOFF WITH JITTER:
═════════════════════════════════════════════════════════════════════

Retry Timeline:
───────────────────────────────────────────────────────────────────────

T=0ms     T=1000-1500ms     T=3000-3500ms     T=7000-7500ms
  │              │                │                 │
  ├─ Attempt 1   ├─ Attempt 2     ├─ Attempt 3      └─ Attempt 4
  │  (immediate) │  (fail)        │  (fail)
  ├─ fail        │                │
  │              ├─ retry delay   ├─ retry delay
  │              │  1000ms+jitter │  2000ms+jitter
  │              │  ↓             │  ↓
  │              └─ fetch()       └─ fetch()


Backoff Calculation:
───────────────────────────────────────────────────────────────────────

delay = (BACKOFF_BASE * multiplier^retryCount) + jitter

Retry 0 (first fail):
  delay = (1000 * 2^0) + random(0-500)
       = 1000 + jitter
       = 1000-1500ms

Retry 1 (second fail):
  delay = (1000 * 2^1) + random(0-500)
       = 2000 + jitter
       = 2000-2500ms

Retry 2 (third fail):
  delay = (1000 * 2^2) + random(0-500)
       = 4000 + jitter
       = 4000-4500ms

Retry 3 (max retries, FAILED):
  ✗ No more retries


Thundering Herd Prevention:
───────────────────────────────────────────────────────────────────────

Without Jitter (BAD):
  Client 1: ●●●●●●●●●●●●●●●●●● fetch at 1000ms
  Client 2: ●●●●●●●●●●●●●●●●●● fetch at 1000ms
  Client 3: ●●●●●●●●●●●●●●●●●● fetch at 1000ms
  Server:   [SPIKE]   [idle]   [SPIKE]   [idle]

With Jitter (GOOD):
  Client 1: ●●●●●●●●●●●●●●●●●●○ fetch at 1247ms
  Client 2: ●●●●●●●●●●●●●●●●●○● fetch at 1391ms
  Client 3: ●●●●●●●●●●●●●●●●●●● fetch at 1088ms
  Server:   [smooth load over time]
```

## Error Handling Flow

```
MUTATION PROCESSING ERROR HANDLING:
═════════════════════════════════════════════════════════════════════

              ┌─────────────────────────┐
              │  fetch() mutation       │
              └────────────┬────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
              [SUCCESS]        [ERROR]
              200-299          ANY ERROR
                    │             │
                    │             ▼
                    │      ┌──────────────────┐
                    │      │ Classify Error   │
                    │      └────────┬─────────┘
                    │               │
                    │        ┌──────┴────────┐
                    │        │               │
                    │    [4xx]           [5xx or
                    │   (except          network
                    │    429)            error]
                    │        │               │
                    │        ▼               ▼
                    │    [non-       [retryable]
                    │   retryable]       │
                    │        │           │
                    │        ▼           ▼
                    │    FAILED      RETRYING
                    │                   │
                    │                   ├─ Check:
                    │                   │  retries < 3?
                    │                   │
                    │                   ├─ YES:
                    │                   │  schedule
                    │                   │  next retry
                    │                   │
                    │                   └─ NO:
                    │                      FAILED
                    │
                    ▼
              COMPLETED


ERROR CLASSIFICATION TABLE:
═════════════════════════════════════════════════════════════════════

HTTP Status  Error Type           Retryable  Action
───────────  ─────────────────    ─────────  ──────────────────
200-299      OK                   N/A        Mark completed
300-399      Redirect             No         Mark failed
400          Bad Request          No         Mark failed
401          Unauthorized         No         Mark failed
403          Forbidden            No         Mark failed
404          Not Found            No         Mark failed
429          Too Many Req         Yes        Retry (backoff)
500-599      Server Error         Yes        Retry (backoff)
timeout      Network Timeout      Yes        Retry (backoff)
error        Network Error        Yes        Retry (backoff)
```

## Storage Structure

```
INDEXEDDB STORAGE:
═════════════════════════════════════════════════════════════════════

Database: dmb-almanac
│
└─ Store: offlineMutationQueue
   │
   ├─ Primary Key: ++id (auto-increment)
   │
   ├─ Indexes:
   │  ├─ status (for filtering)
   │  ├─ createdAt (for FIFO ordering)
   │  └─ nextRetry (for scheduling)
   │
   └─ Documents:
      │
      ├─ Document #1
      │  ├─ id: 1
      │  ├─ url: "https://api.example.com/favorites"
      │  ├─ method: "POST"
      │  ├─ body: '{"songId":123}'
      │  ├─ status: "pending"
      │  ├─ retries: 0
      │  ├─ createdAt: 1705859400000
      │  └─ lastError: undefined
      │
      ├─ Document #2
      │  ├─ id: 2
      │  ├─ url: "https://api.example.com/favorites/456"
      │  ├─ method: "DELETE"
      │  ├─ body: '{"songId":456}'
      │  ├─ status: "retrying"
      │  ├─ retries: 1
      │  ├─ createdAt: 1705859410000
      │  ├─ lastError: "HTTP 503: Service Unavailable"
      │  └─ nextRetry: 1705859411500
      │
      └─ Document #3
         ├─ id: 3
         ├─ url: "https://api.example.com/favorites/789"
         ├─ method: "PUT"
         ├─ body: '{"rating":5}'
         ├─ status: "completed"
         ├─ retries: 0
         ├─ createdAt: 1705859420000
         └─ lastError: undefined


INDEX PERFORMANCE:
═════────────────────────────────────────────────────────────────

Getting pending mutations:
  db.offlineMutationQueue
    .where('status')
    .equals('pending')
    .sortBy('createdAt')

  Index Used: status
  Result: O(log n) + k
  Returns: k=number of pending
  Fast!


Getting queue stats:
  Count by status (4 operations):
    .where('status').equals('pending').count()
    .where('status').equals('retrying').count()
    .where('status').equals('failed').count()
    .where('status').equals('completed').count()

  Index Used: status (all 4)
  Result: O(log n) each
  Very fast!
```

## Processing Pipeline

```
QUEUE PROCESSING PIPELINE:
═════════════════════════════════════════════════════════════════════

processQueue() called
        │
        ▼
isProcessing already? ──YES──→ skip (return early)
        │
        NO
        │
        ▼
Set isProcessing = true
        │
        ▼
Get all 'pending' and 'retrying' mutations
        │
        ▼
Sort by createdAt (FIFO order)
        │
        ▼
Apply maxMutations limit (if specified)
        │
        ▼
For each mutation:
   │
   ├─ Check abort signal
   │
   ├─ navigator.onLine? ─NO─→ Skip to retrying
   │                      │
   │                      └─→ set nextRetry, return
   │
   ├─ YES: fetch(url, {method, body})
   │
   └─ Response?
      │
      ├─ OK (200-299)
      │  ├─ Mark: COMPLETED
      │  └─ result: succeeded++
      │
      ├─ Error (any)
      │  ├─ Classify error
      │  ├─ retryable + retries < 3?
      │  │  ├─ Mark: RETRYING
      │  │  ├─ set nextRetry
      │  │  ├─ increment retries
      │  │  └─ result: retrying++
      │  │
      │  └─ non-retryable or max retries
      │     ├─ Mark: FAILED
      │     ├─ set lastError
      │     └─ result: failed++
      │
      └─ Continue to next mutation
            │
            ▼
Collect all results
        │
        ▼
Schedule nextRetry timeout (if needed)
        │
        ▼
Set isProcessing = false
        │
        ▼
Return results:
  ├─ processed: count
  ├─ succeeded: count
  ├─ failed: count
  ├─ retrying: count
  └─ results: array of {id, success, status, error}
```

This architecture ensures robust, reliable, and performant offline mutation handling for the DMB Almanac PWA.
