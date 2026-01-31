# Error System Runtime Errors - Quick Reference

## Critical Issues at a Glance

| # | Issue | Location | One-Liner Fix |
|---|-------|----------|---------------|
| 1 | Async handler rejection | `logger.js:319` | Check if handler returns Promise and attach .catch() |
| 2 | Array mutation race | `logger.js:268` | Create snapshot copy of handlers before forEach |
| 3 | Null/undefined in serialization | `logger.js:77` | Use String() coercion with null coalescing (??) |
| 4 | Event loop blocking | `errors.js:316` | Replace array.shift() with ring buffer pattern |
| 5 | Queue processing race | `telemetryQueue.js:572` | Use generation counter or move finally to wrapper |
| 6 | Validation DoS | `api-middleware.js:333` | Wrap in try/catch, safely access .length property |

---

## Root Cause Patterns

### Pattern A: Unhandled Promise Rejections
**Symptoms**: Silent failures, unhandledrejection events, monitoring gaps
**Files**: logger.js, errors.js, telemetryQueue.js
**Fix**: Always attach .catch() to promises returned from callbacks

```javascript
// Bad
handler(payload);  // If async, rejection is unhandled

// Good
const result = handler(payload);
if (result instanceof Promise) {
  result.catch(err => {
    console.error('Handler failed:', err);
  });
}
```

### Pattern B: Array Mutation During Iteration
**Symptoms**: Skipped handlers, memory leaks, incorrect behavior
**Files**: logger.js
**Fix**: Create snapshot array before iteration

```javascript
// Bad
_handlers.forEach(h => {
  // Meanwhile, another handler unsubscribes and calls splice()
  h(payload);
});

// Good
const copy = [..._handlers];
copy.forEach(h => {
  h(payload);  // Safe from mutations
});
```

### Pattern C: Type Coercion on Untrusted Input
**Symptoms**: TypeError at random times, validation errors, runtime crashes
**Files**: api-middleware.js
**Fix**: Validate types before accessing properties, use safe wrappers

```javascript
// Bad
if (e.message.length > 2000) return false;  // Throws if message is object

// Good
const message = String(e.message ?? '');
if (message.length > 2000) return false;
```

### Pattern D: Unbounded Array Growth
**Symptoms**: Memory leaks, O(n) operations, event loop blocking
**Files**: errors.js, logger.js
**Fix**: Use fixed-size ring buffer instead of shift()

```javascript
// Bad
this.breadcrumbs.push(item);
if (this.breadcrumbs.length > 50) {
  this.breadcrumbs.shift();  // O(n) operation!
}

// Good
if (this.breadcrumbs.length < 50) {
  this.breadcrumbs.push(item);
} else {
  this.breadcrumbs[this.head] = item;  // O(1)
  this.head = (this.head + 1) % 50;
}
```

### Pattern E: Race Conditions in State Management
**Symptoms**: Intermittent failures, hard to reproduce, timing dependent
**Files**: telemetryQueue.js
**Fix**: Use generation counters, atomic checks

```javascript
// Bad
if (processingPromise) return processingPromise;
processingPromise = newPromise;
// Meanwhile another call sets processingPromise to different value
// In finally: if (processingPromise === newPromise) processingPromise = null;
// This clears the WRONG promise!

// Good
const myId = ++processingId;
// ... do work ...
finally {
  if (processingId === myId) {
    processingPromise = null;  // Only if we're still active
  }
}
```

---

## Prevention Checklists

### Before Committing Error Handling Code

- [ ] All async functions have .catch() on their return values?
- [ ] Array mutations not happening during .forEach()?
- [ ] All property accesses wrapped in try/catch or null checks?
- [ ] No unbounded array growth without fixed limits?
- [ ] No race conditions with shared mutable state?
- [ ] All handlers continue if one fails?
- [ ] Test coverage for error cases exists?
- [ ] Performance profile shows no event loop blocking?

### Code Review Points

1. **Async Handling**
   - Do callbacks return promises? If yes, are rejections handled?
   - Are there timeout promises that might hang?
   - Is there unhandledrejection listening at global level?

2. **Array Mutations**
   - Does code modify arrays during forEach/map/filter?
   - Could unsubscribe happen while iterating?
   - Are WeakMaps used for cleanup instead of array modification?

3. **Type Safety**
   - Are properties accessed without checking they exist?
   - Could untrusted input trigger getters that throw?
   - Is String() coercion used as fallback?

4. **Memory**
   - Are there unbounded collections?
   - Do event listeners get removed?
   - Are WeakMaps used instead of Maps when possible?

5. **Race Conditions**
   - Is there shared mutable state?
   - Could timing between multiple async operations break things?
   - Are generation counters or atomic operations used?

---

## Error Symptoms → Root Cause Mapping

| Symptom | Likely Cause | Check |
|---------|-------------|-------|
| Monitoring functions not called | Issue #1: Async rejection | Check console for unhandledrejection |
| Memory grows unbounded | Issue #2/#12: Leaking handlers | Check WeakMap cleanup |
| Some handlers skip | Issue #2: Array shift during iteration | Check if unsubscribe concurrent |
| "Cannot read property X of undefined" | Issue #3/#9: Null dereference | Check error object shape |
| Frame drops during clicks | Issue #4: Event loop blocking | Profile with DevTools |
| Telemetry sent twice | Issue #5: Race in queue | Check if processQueue called twice |
| Validation fails with TypeError | Issue #6: Untrusted property access | Check validation with malicious input |
| Stack trace lost in logs | Issue #17: New Error() wrapping | Keep original error reference |

---

## Testing Strategy

### Must-Have Tests

```javascript
// Test each critical issue
describe('Error System Critical Tests', () => {
  // Issue #1
  test('async error handler rejection caught');
  test('async handler failure does not break other handlers');

  // Issue #2
  test('unsubscribe during notification does not skip handlers');
  test('no memory leaks from handler registration');

  // Issue #3
  test('serialize non-standard error objects');
  test('serialize circular error references');

  // Issue #4
  test('breadcrumb addition < 1ms even with 100 additions');
  test('deduplication prevents duplicates');
  test('ring buffer preserves order');

  // Issue #5
  test('concurrent processQueue calls use same promise');
  test('promise not cleared prematurely');

  // Issue #6
  test('validation does not throw on malicious input');
  test('safe property access in validator');
});
```

### Performance Benchmarks

```
Benchmark: addBreadcrumb() performance
Target:    < 0.1ms per call, even with 100 calls
Current:   0.5-2ms per call due to array.shift()
After Fix: < 0.05ms per call using ring buffer

Benchmark: Handler notification
Target:    < 1ms for 10 handlers
Current:   < 2ms
Risk:      If any handler is async and slow
Fix:       Ensure handlers don't block via promises

Benchmark: Error serialization
Target:    < 1ms for any error object
Current:   < 0.5ms
Risk:      If error has large cause object
Fix:       Truncate serialized output to 50KB max
```

---

## Monitoring & Alerts

### Metrics to Track

1. **Handler Execution**
   - Count of handlers registered
   - Count of failed handler invocations
   - Unhandledrejection events

2. **Memory**
   - Size of error buffer
   - Size of breadcrumbs array
   - Number of pending handlers

3. **Performance**
   - Time to add breadcrumb
   - Time to serialize error
   - Time to process queue

4. **Correctness**
   - Telemetry sent count
   - Telemetry deduped count
   - Validation rejection count

### Alert Thresholds

```
Alert if:
- unhandledrejection events > 5/minute
- Handler failures > 10/hour
- Breadcrumb additions > 100/second
- Queue processing time > 5 seconds
- Serialization errors > 1/hour
```

---

## Debugging Guide

### Issue #1: Async Handler Not Called?

```javascript
// Add monitoring
const originalOnError = errorLogger.onError;
errorLogger.onError = function(handler) {
  const wrappedHandler = (report) => {
    console.log('Handler called:', handler.name);
    const result = handler(report);
    if (result instanceof Promise) {
      console.log('Handler returned promise, attaching catch...');
      result.catch(err => {
        console.error('Handler promise rejected:', err);
      });
    }
    return result;
  };
  return originalOnError.call(this, wrappedHandler);
};

// Test
errorLogger.onError(async (report) => {
  throw new Error('Test rejection');
});
errorLogger.error('Trigger', new Error('test'));
// Should see: "Handler returned promise, attaching catch..."
// Then: "Handler promise rejected: Error: Test rejection"
```

### Issue #4: Event Loop Blocked?

```javascript
// Profile breadcrumb additions
const measure = () => {
  const start = performance.now();
  for (let i = 0; i < 100; i++) {
    errorMonitor.addBreadcrumb({
      category: 'test',
      level: 'info',
      message: `Item ${i}`
    });
  }
  const duration = performance.now() - start;
  console.log(`Added 100 breadcrumbs in ${duration.toFixed(2)}ms`);
};

measure();
// Should be < 5ms, if > 10ms then array.shift() is problem
```

### Issue #5: Queue Double Processing?

```javascript
// Monitor processQueue calls
const originalProcessQueue = telemetryQueue.processQueue;
let callCount = 0;
telemetryQueue.processQueue = async function(...args) {
  const myCall = ++callCount;
  console.log(`[ProcessQueue #${myCall}] Starting`);
  try {
    const result = await originalProcessQueue.apply(this, args);
    console.log(`[ProcessQueue #${myCall}] Completed`);
    return result;
  } catch (error) {
    console.error(`[ProcessQueue #${myCall}] Error:`, error);
    throw error;
  }
};

// Trigger rapid calls
processQueue();
processQueue();
processQueue();
// All should return same promise reference
```

---

## Fix Priority Matrix

```
         Low Risk    High Risk
Quick    #4, #6      #1, #2
Medium   #17-19      #3, #5
Complex  #7-16       #20+
```

**Recommendation**: Fix in this order:
1. **This sprint**: #1, #2, #5, #6 (highest impact)
2. **Next sprint**: #3, #4, #7, #12 (high impact)
3. **Backlog**: #8-11, #13-20 (medium/low impact)

---

## Summary

The error logging system has **6 critical runtime errors** that can cause:
- Silent monitoring failures
- Memory leaks
- Event loop blocking
- Race condition bugs
- Validation crashes

All are **fixable with localized changes** to specific functions. Recommended effort: **1-2 sprints** for full remediation.

**Most critical**: Issues #1, #2, #5 - these cause complete monitoring system failure if they occur.

**Easiest wins**: Issues #4, #6 - quick fixes with immediate performance benefits.

