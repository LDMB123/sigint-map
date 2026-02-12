# Memory Management Audit - COMPRESSED

**Original**: 24KB, 783 lines | **Compressed**: ~2KB | **Ratio**: 92% reduction
**Full audit**: `MEMORY_MANAGEMENT_AUDIT.md`
**Date**: 2026-02-03 | **Scope**: 157 JS files in `/src/lib/`

---

## Executive Summary

**Grade**: B+ (Good practices with targeted gaps)
**Issues**: 2 critical, 4 high, 8 medium

Strong memory management foundation with cleanup helpers and AbortController adoption. Primary gaps: lifecycle integration missing, nested listener patterns, inconsistent timer management.

---

## Critical Issues (2)

### 1. Service Worker Nested Listener Leak
**File**: `/src/lib/monitoring/rum.js:451`
**Type**: Event listener never removed

```javascript
newWorker.addEventListener('statechange', statechangeHandler);
// No cleanup! Handler retains RUMManager closure
```

**Impact**: Every SW update creates new listener → 100+ restarts = 100+ dead listeners
**Fix**: Add AbortController or WeakRef for nested worker listeners

### 2. RUM Event Cleanup Array Accumulation
**Files**: `/src/lib/monitoring/rum.js:148, 224-225, 459, 477`
**Type**: Unbounded cleanup array growth

```javascript
this.eventCleanups = [];  // Reset on init
this.eventCleanups.push(() => window.removeEventListener(...));
// No pre-cleanup if initialize() called multiple times
```

**Impact**: Cleanup functions accumulate with closures, never cleared (singleton)
**Fix**: Execute + clear `eventCleanups` before re-initializing

---

## High Priority Issues (4)

1. **Telemetry Queue Timer Lifecycle** (`/src/lib/services/telemetryQueue.js:89-92`)
   - `setInterval` for flush never cleared
   - No cleanup export

2. **PWA Store Event Listeners** (`/src/lib/stores/pwa.js:97-156`)
   - Navigation listeners lack cleanup
   - No AbortController for SSE

3. **Download Manager Event Tracking** (`/src/lib/utils/downloadManager.js:235-244`)
   - XMLHttpRequest listeners in closures
   - No abort mechanism

4. **Error Logger Breadcrumb Retention** (`/src/lib/errors/logger.js:132-180`)
   - Breadcrumb array grows unbounded
   - No max size enforcement

---

## Medium Priority Issues (8)

- Push manager promise cache grows indefinitely
- Navigation API listener accumulation on SPA nav
- Weak reference helpers defined but unused
- Service worker registration store leaks on unregister
- Chart rendering creates detached canvas nodes
- Force simulation workers not terminated
- Geolocation watchers never cleared
- IndexedDB cursors not explicitly closed

---

## Memory Leak Patterns Identified

### Event Listeners (8 instances)
- Nested SW listeners (rum.js)
- Navigation event accumulation (pwa.js, navigationApi.js)
- Download progress handlers (downloadManager.js)

### Closures (12 instances)
- Cleanup function arrays retaining handlers
- Promise caches in singletons
- Breadcrumb retention in logger

### Timers (6 instances)
- Telemetry queue flush interval
- Speculation rules refresh
- Download timeout tracking

### DOM References (4 instances)
- Detached chart canvas nodes
- Worker-generated SVG not garbage collected

---

## Strengths ✅

1. **Cleanup helpers** (`/src/lib/utils/memory-cleanup-helpers.js`)
   - WeakMap, WeakRef patterns
   - AbortController utilities
   - Not fully integrated yet

2. **AbortController adoption** in stores
   - Used in data.js, dexie.js
   - Pattern established, needs expansion

3. **Explicit cleanup exports**
   - Many utilities export cleanup functions
   - Just need lifecycle integration

---

## Prevention Patterns

1. Always use AbortController for event listeners (especially in stores)
2. Export cleanup functions from utilities
3. Test unmount cycles for components with timers/listeners
4. Use memory-cleanup-helpers - don't reinvent patterns
5. Call cleanup on navigation - add to route change handlers
6. Track large objects (Float64Array, GPU buffers) with explicit lifecycle

---

## Files Requiring Changes

**Critical** (2 files):
- `/src/lib/monitoring/rum.js` - 3 fixes (nested listeners, cleanup array, timer)
- `/src/lib/services/telemetryQueue.js` - 1 integration (timer cleanup)

**High** (4 files):
- `/src/lib/stores/pwa.js` - 1 fix (nav listeners)
- `/src/lib/sw/register.js` - 1 integration (cleanup)
- `/src/lib/utils/downloadManager.js` - 1 integration (abort)
- `/src/lib/errors/logger.js` - 1 completion (breadcrumb limit)

**Medium** (4 files):
- `/src/lib/pwa/push-manager.js` - promise cache optimization
- `/src/lib/utils/navigationApi.js` - listener cleanup
- `/src/lib/utils/force-worker-client.js` - worker termination
- `/src/lib/utils/geo-worker.js` - watch cleanup

**Integration** (1 location):
- App layout - centralized cleanup on navigation

---

## Estimated Memory Impact

| Metric | Before Fix | After Fix |
|--------|-----------|-----------|
| Event Listeners (app lifetime) | 30-50 | 5-10 |
| Cleanup arrays (accumulated) | ~80 functions | 0 |
| Active intervals | 10-15 | 2-3 |
| Detached DOM nodes | 10-20 | 0-5 |

---

## Remediation Plan

**Effort**: 8-12 hours
**Priority**: HIGH (prevents production memory issues on long sessions)

**Sprint 1** (Critical):
1. Fix RUM nested listener lifecycle
2. Add cleanup execution to RUM initialize()
3. Export telemetry queue cleanup

**Sprint 2** (High):
4. Integrate cleanup helpers in stores
5. Add AbortController to navigation listeners
6. Implement breadcrumb max size

**Sprint 3** (Medium):
7. Worker termination on cleanup
8. Promise cache with WeakMap
9. Centralized app cleanup on route change

---

**See full audit for**: Detailed leak patterns, code examples, memory profiling methodology, heap snapshot analysis, Chrome DevTools procedures
