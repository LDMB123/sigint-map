# Error Handling Architecture Diagram
## DMB Almanac Svelte - System Overview

---

## Current Architecture (Before)

```
┌─────────────────────────────────────────────────────────┐
│                    DMB Almanac App                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │   Component A    │  │   Component B    │             │
│  │   (TourMap)      │  │  (GuestNetwork)  │             │
│  │                  │  │                  │             │
│  │  [ERROR]         │  │                  │             │
│  └──────────────────┘  └──────────────────┘             │
│         │                     │                          │
│         └─────────────────────┴──────────────────┐      │
│                                                   │      │
│                          ┌────────────────────────┴──┐   │
│                          │                           │   │
│                   CRASH  │  ERROR PROPAGATES        │   │
│                    🔴    │  UNHANDLED              │   │
│                          │                           │   │
│                    ┌─────┴─────────────────────┐     │
│                    │   Entire App Breaks 💥   │     │
│                    │   User sees blank page    │     │
│                    │   Error only in console   │     │
│                    └───────────────────────────┘     │
│                                                       │
│  Error Visibility: ❌ None (production)              │
│  Error Recovery: ❌ None                             │
│  User Experience: 💔 Terrible                        │
└─────────────────────────────────────────────────────────┘
```

---

## Proposed Architecture (After)

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Global Error Capture Layer                     │
│  ┌────────────────┐  ┌──────────────────┐  ┌───────────────────┐    │
│  │ window.onerror │  │unhandledrejection│  │ resource errors   │    │
│  └────────────────┘  └──────────────────┘  └───────────────────┘    │
│         │                     │                     │                │
│         └─────────────────────┴─────────────────────┘                │
│                               │                                      │
│                    ┌──────────▼──────────────┐                       │
│                    │ Global Error Handler    │                       │
│                    │  (setupGlobalHandlers)  │                       │
│                    └──────────────────────────┘                       │
│                               │                                      │
└───────────────────────────────┼──────────────────────────────────────┘
                                │
                    ┌───────────▼────────────┐
                    │  Error Categorization  │
                    │  & Enrichment          │
                    │  (context, severity)   │
                    └───────────┬────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        │                       │                       │
   ┌────▼────┐        ┌────────▼────────┐    ┌────────▼─────┐
   │ Console  │        │  Sentry Service │    │ User Notifi- │
   │ Logging  │        │  (Production)   │    │ cation Event │
   │ (Dev)    │        │                 │    │              │
   └──────────┘        └─────────────────┘    └──────────────┘


┌──────────────────────────────────────────────────────────────────────┐
│                 Component Error Isolation Layer                       │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────┐          │
│  │  Page Component                                         │          │
│  │                                                          │          │
│  │  ┌────────────────────────────────────────────────┐    │          │
│  │  │ BoundaryWrapper name="TourMap"                 │    │          │
│  │  │                                                 │    │          │
│  │  │  ┌──────────────────────────────────────┐     │    │          │
│  │  │  │ TourMap Component                    │     │    │          │
│  │  │  │ [ERROR] 🔴 ← Caught by Boundary    │     │    │          │
│  │  │  └──────────────────────────────────────┘     │    │          │
│  │  │         │                                      │    │          │
│  │  │         ▼                                      │    │          │
│  │  │  ┌──────────────────────────────────────┐     │    │          │
│  │  │  │ Error UI Displayed                   │     │    │          │
│  │  │  │ "Error in TourMap"                   │     │    │          │
│  │  │  │ [Try Again]                          │     │    │          │
│  │  │  └──────────────────────────────────────┘     │    │          │
│  │  └────────────────────────────────────────────────┘    │          │
│  │                                                          │          │
│  │  ┌────────────────────────────────────────────────┐    │          │
│  │  │ BoundaryWrapper name="GuestNetwork"            │    │          │
│  │  │                                                 │    │          │
│  │  │  ┌──────────────────────────────────────┐     │    │          │
│  │  │  │ GuestNetwork Component ✅           │     │    │          │
│  │  │  │ (Still works normally)               │     │    │          │
│  │  │  └──────────────────────────────────────┘     │    │          │
│  │  └────────────────────────────────────────────────┘    │          │
│  │                                                          │          │
│  │  Page remains functional ✅                              │          │
│  └─────────────────────────────────────────────────────────┘          │
│                                                                        │
│  Error Visibility: ✅ Component-level                                │
│  Error Recovery: ✅ Retry button works                               │
│  User Experience: 😊 Graceful degradation                            │
└──────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────┐
│              Async Error Handling & Recovery Layer                    │
│                                                                        │
│  ┌────────────────────────────────────────────────────────┐          │
│  │ Offline Mutation Queue Service                         │          │
│  │                                                         │          │
│  │  Mutation Request Failed                               │          │
│  │           │                                             │          │
│  │           ▼                                             │          │
│  │  ┌──────────────────────────┐                          │          │
│  │  │ Error Categorization     │                          │          │
│  │  │  • Network? Retryable ✅ │                          │          │
│  │  │  • Auth? Don't retry ❌  │                          │          │
│  │  │  • Rate limit? Wait ⏳   │                          │          │
│  │  └──────────────────────────┘                          │          │
│  │           │                                             │          │
│  │           ▼                                             │          │
│  │  ┌──────────────────────────────────┐                  │          │
│  │  │ Exponential Backoff Retry        │                  │          │
│  │  │  Attempt 1: Wait 1s + jitter     │                  │          │
│  │  │  Attempt 2: Wait 2s + jitter     │                  │          │
│  │  │  Attempt 3: Wait 4s + jitter     │                  │          │
│  │  │  Max: 3 retries                  │                  │          │
│  │  └──────────────────────────────────┘                  │          │
│  │           │                                             │          │
│  │     ┌─────┴──────┐                                      │          │
│  │     │            │                                      │          │
│  │  Success        Failed                                 │          │
│  │  ✅ Sync        ❌ Queue for manual retry               │          │
│  │                                                         │          │
│  │  Mutations persist in IndexedDB ← Resume after reload  │          │
│  └────────────────────────────────────────────────────────┘          │
│                                                                        │
│  Error Visibility: ✅ Queued, tracked, persisted                     │
│  Error Recovery: ✅ Automatic retry, manual recovery                 │
│  User Experience: 😊 Seamless offline support                        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Error Flow Diagram

```
┌─────────────────────────────┐
│    Error Occurs             │
│  • Thrown exception         │
│  • Async rejection          │
│  • Resource failure         │
└──────────────┬──────────────┘
               │
      ┌────────▼────────┐
      │ Error Type?     │
      └────────┬────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
    │          │          │
┌───▼──┐  ┌───▼──┐  ┌────▼───┐
│Sync  │  │Async │  │Resource│
│Error │  │Error │  │Error   │
└───┬──┘  └───┬──┘  └────┬───┘
    │        │          │
    └────────┼──────────┘
             │
      ┌──────▼──────────┐
      │ Caught by       │
      │ Boundary?       │
      └────────┬────────┘
         Yes / │ \ No
            /  │  \
    ┌──────▼┐  │  ┌────▼──────┐
    │Show   │  │  │Bubble to   │
    │Error  │  │  │Global      │
    │UI     │  │  │Handler     │
    └───────┘  │  └────┬───────┘
               │       │
        ┌──────▼──────▼┐
        │ Categorize   │
        │ & Log        │
        └──────┬───────┘
               │
        ┌──────▼────────────┐
        │ Send to Sentry    │
        │ (if configured)   │
        └──────┬────────────┘
               │
        ┌──────▼────────────┐
        │ Show User Notice? │
        │ (if user-facing)  │
        └───────────────────┘
```

---

## Error Categorization Tree

```
Error Occurred
    │
    ├─── Network Error ────────────────┐
    │    • Timeout                     │
    │    • Connection refused          │ Retryable: ✅ YES
    │    • DNS failure                 │ Retry Count: 3
    │    • Offline                     │ Backoff: Exponential
    │                                  │
    ├─── Validation Error ─────────────┤
    │    • Invalid input               │ Retryable: ❌ NO
    │    • Missing required fields     │ Action: Show user
    │    • Format mismatch             │ message & suggest fix
    │                                  │
    ├─── Authentication Error ────────┤
    │    • Invalid token              │ Retryable: ❌ NO
    │    • Expired session            │ Action: Redirect to
    │    • Unauthorized               │ login
    │                                  │
    ├─── Rate Limit ──────────────────┤
    │    • Too many requests (429)    │ Retryable: ✅ YES
    │                                  │ Retry: After Retry-After
    │                                  │ header or exponential
    │                                  │
    ├─── Server Error ────────────────┤
    │    • 5xx errors                 │ Retryable: ✅ YES
    │    • Database failure           │ Retry Count: 3
    │    • Service unavailable        │ Backoff: Exponential
    │                                  │
    └─── Component Error ─────────────┤
         • Null reference             │ Retryable: ✅ Maybe
         • Undefined method           │ Action: Show component
         • D3 rendering error         │ error, allow retry
```

---

## Data Flow: Offline Mutation

```
User Action (e.g., Mark as Favorite)
           │
           ▼
    ┌──────────────────┐
    │ Is Online?       │
    └────────┬─────────┘
      Yes / │ \ No
        /   │   \
   ┌───▼┐  │   ┌──▼───────────────────┐
   │Send│  │   │Queue in IndexedDB    │
   │API │  │   │(offlineMutationQueue)│
   └───┬┘  │   └──┬──────────┬─────────┘
       │   │      │          │
    ┌──▼───▼──┐   │    ┌─────▼─────────┐
    │Response?│   │    │ Wait for      │
    └────┬────┘   │    │ online event  │
         │        │    └──────┬────────┘
    ┌────▼───┐   │           │
    │Success?│   │    ┌──────▼─────┐
    │   │    │   │    │Process     │
    │Yes│No  │   │    │queue when  │
    │ ✅│❌   │   │    │online ✅   │
    └───┴────┼───┴────┴──────┬─────┘
        │   │                │
    Success  Retry           │
             Logic   ┌───────┴────────┐
                     │                │
                  ┌──▼──┐        ┌───▼──┐
                  │Pass │        │Fail  │
                  │✅   │        │❌    │
                  │Mark │        │Mark  │
                  │Done │        │Error │
                  └─────┘        └──────┘
                     │                │
                     │                ▼
                     │         User sees error
                     │         in UI with
                     │         "Retry" option
                     │
                     ▼
            Update UI, dismiss
            loading state


Total Flow: 20-30ms locally + network latency
Persistence: ✅ Data saved in IndexedDB
Recovery: ✅ Automatic on reconnect
```

---

## State Machine: BoundaryWrapper

```
                  ┌─────────────────────┐
                  │   Component Renders │
                  └──────────┬──────────┘
                             │
                      ┌──────▼──────┐
                      │  NORMAL     │
                      │ state: null │
                      └──────┬──────┘
                             │
                    ┌────────┴────────┐
                    │ Error thrown?   │
                    └────┬────────┬───┘
                    Yes /│        │\ No
                    /    │        │  \
              ┌────▼┐   │       │   ┌─▼────┐
              │ERROR│   │       │   │Normal │
              │caught   │       │   │UI     │
              └────┬┘   │       │   └───────┘
                   │    │       │
         ┌─────────▼────▼┐      │
         │  ERRORED      │      │
         │ state: Error  │      │
         │ count: N      │      │
         └─────────┬─────┘      │
                   │            │
          ┌────────▼─────────┐  │
          │ Show Error UI    │  │
          │ "Try Again" btn  │  │
          └────────┬─────────┘  │
                   │            │
         ┌─────────▼──────────┐ │
         │ User clicks retry? │ │
         └─────┬────────┬─────┘ │
         Yes / │        │\ No   │
           /   │        │   \   │
      ┌───▼┐  │        │   ┌──▼──┐
      │Call│  │        │   │Wait │
      │reset  │        │   │for  │
      └───┬┘  │        │   │user │
          │   │        │   └─────┘
      ┌───▼───┴───┐    │
      │  NORMAL   │    │
      │ error:null│◄───┴────┐
      │ count: 0  │         │
      └───────────┘  If still
                     errored
                     return to
                     ERRORED


Legend:
───► Normal path
═══► Error path
```

---

## Server vs Client Error Handling

```
┌─────────────────────────────────────────────────────────────────┐
│              REQUEST-RESPONSE CYCLE                              │
└─────────────────────────────────────────────────────────────────┘

Client Browser                          Server
    │                                     │
    ├─ Error in component                │
    │  • Component error handler catches  │
    │  • Boundary wrapper catches         │
    │  • Global handler catches           │
    │  • Error logged to console          │
    │  • Sent to Sentry                   │
    │                                     │
    ├──── HTTP Request ─────────────────► Server
    │                                     │
    │                          ┌──────────▼──────┐
    │                          │ Request Handler │
    │                          └────────┬────────┘
    │                                   │
    │                          ┌────────▼────────┐
    │                          │ Validation      │
    │                          │ Rate Limiting   │
    │                          │ Security Check  │
    │                          └────────┬────────┘
    │                                   │
    │                          ┌────────▼────────┐
    │                          │ Error?          │
    │                          └────┬────────┬───┘
    │                          Yes /│        │\ No
    │                                │       │
    │                         ┌──────▼──┐  ┌──▼─────┐
    │                         │Return   │  │Process │
    │                         │Error    │  │Request │
    │                         │Response │  └───┬────┘
    │                         │         │      │
    │◄──── Error Response ────│ (4xx)   │    Success
    │      (+ context)        │(5xx)    │      │
    │                         └─────────┘      │
    │                                   ┌──────▼───┐
    │                                   │Return    │
    │◄──── Success Response ────────────│Success   │
    │                                   │Data      │
    │                                   └──────────┘
    │
    ├─ Client parses response
    │  • Check status code
    │  • Parse JSON
    │  • Validate data
    │  • Catch errors
    │
    ├─ On Error
    │  • Error state handler
    │  • Show error UI
    │  • Queue for retry (if applicable)
    │
    ├─ On Success
    │  • Update UI
    │  • Cache data
    │  • Show success message


Key Points:
✅ Server validates & rate-limits early
✅ Client has multiple error handlers
✅ Both log with context
✅ Network errors are retryable
✅ Validation errors are not
```

---

## Coverage Heatmap

### Before Implementation

```
Component         Error Protection
──────────────────────────────────
TourMap           ❌ NONE ────────────── 0%
GuestNetwork      ❌ NONE ────────────── 0%
GapTimeline       ❌ NONE ────────────── 0%
TransitionFlow    ❌ NONE ────────────── 0%
API Handlers      ✅ PARTIAL ──────────► 40%
Offline Queue     ✅ GOOD ────────────► 80%
Data Loader       ⚠️  BASIC ──────────► 50%
────────────────────────────────────
AVERAGE COVERAGE: 24% ───────────► 🔴
```

### After Implementation

```
Component         Error Protection
──────────────────────────────────
TourMap           ✅ FULL ────────────── 100%
GuestNetwork      ✅ FULL ────────────── 100%
GapTimeline       ✅ FULL ────────────── 100%
TransitionFlow    ✅ FULL ────────────── 100%
API Handlers      ✅ ENHANCED ────────► 90%
Offline Queue     ✅ EXCELLENT ───────► 95%
Data Loader       ✅ RESILIENT ───────► 85%
Global Handlers   ✅ COMPLETE ────────► 100%
────────────────────────────────────
AVERAGE COVERAGE: 95% ───────────► 🟢
```

---

## Risk Reduction

```
Scenario: D3 Visualization Crashes

BEFORE                              AFTER
───────                             ─────

[App renders]                       [App renders]
    │                                   │
    ▼                                   ▼
[TourMap]                           [BoundaryWrapper]
    │                                   │
    ▼                                   ▼
[D3 error]                          [TourMap]
    │                                   │
    ▼                                   ▼
    X CRASH                         [D3 error]
    │                                   │
    ▼                                   ▼
[Blank page]                        [Caught by boundary]
[User confused]                         │
[Error in console only]                 ▼
                                    [Error UI displayed]
                                    [Try Again button]
                                    [Rest of app works]
                                    [Error logged to Sentry]

Risk Mitigation:
• Isolated failure ✅
• User informed ✅
• Rest of app functional ✅
• Error tracked ✅
• Automatic retry available ✅
```

---

**Print this for reference during implementation!**
