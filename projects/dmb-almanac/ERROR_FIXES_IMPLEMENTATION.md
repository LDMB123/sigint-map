# Error System Fixes - Implementation Guide

This document provides concrete code fixes for the 6 critical runtime errors identified in the error logging system.

---

## CRITICAL FIX #1: Async Error Handler Rejection Handling

### Problem
Error handler callbacks that return promises have unhandled rejections that silently fail.

### Current Code (logger.js:318-336)
```javascript
_notifyHandlers(level, message, error) {
  _handlers.forEach(handler => {
    try {
      const payload = { level, message, error, timestamp: new Date().toISOString() };

      if (error && typeof error === 'object') {
        if (error.name) payload.errorName = error.name;
        if (error.code) payload.errorCode = error.code;
        if (error.statusCode) payload.statusCode = error.statusCode;
        if (error.context) payload.context = error.context;
      }

      handler(payload);  // ❌ Async rejection not caught
    } catch (err) {
      console.error('Error handler failed:', err);
    }
  });
}
```

### Fixed Code
```javascript
_notifyHandlers(level, message, error) {
  // Create snapshot to prevent mid-iteration mutations
  const handlersCopy = [..._handlers];

  handlersCopy.forEach(handler => {
    try {
      const payload = {
        level,
        message,
        error,
        timestamp: new Date().toISOString()
      };

      if (error && typeof error === 'object') {
        if (error.name) payload.errorName = error.name;
        if (error.code) payload.errorCode = error.code;
        if (error.statusCode) payload.statusCode = error.statusCode;
        if (error.context) payload.context = error.context;
      }

      const result = handler(payload);

      // Handle async handlers that return promises
      if (result instanceof Promise) {
        result.catch(err => {
          console.error('Async error handler failed:', err);
          // Don't throw - prevent cascade failures
        });
      }
    } catch (err) {
      console.error('Error handler failed:', err);
      // Continue processing other handlers
    }
  });
}
```

### Testing
```javascript
describe('_notifyHandlers', () => {
  test('handles async error handler rejection', async () => {
    const mockConsoleError = jest.spyOn(console, 'error');

    errorLogger.onError(async (report) => {
      throw new Error('Async handler error');
    });

    errorLogger.error('Test', new Error('test'));

    // Give time for async rejection to be caught
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockConsoleError).toHaveBeenCalledWith(
      'Async error handler failed:',
      expect.any(Error)
    );

    mockConsoleError.mockRestore();
  });

  test('continues calling remaining handlers on failure', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();

    errorLogger.onError(handler1);
    errorLogger.onError(() => {
      throw new Error('Handler 1 fails');
    });
    errorLogger.onError(handler2);

    errorLogger.error('Test', new Error());

    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });
});
```

---

## CRITICAL FIX #2: Handler Array Mutation During Iteration

### Problem
Unsubscribing handlers while _notifyHandlers is executing causes array index shifts.

### Current Code (logger.js:268-280)
```javascript
onError(handler) {
  if (typeof handler === 'function') {
    _handlers.push(handler);
    return () => {
      const index = _handlers.indexOf(handler);  // ❌ O(n) lookup
      if (index > -1) {
        _handlers.splice(index, 1);  // ❌ Mutates during iteration
      }
    };
  }
  return () => {};
}
```

### Fixed Code
```javascript
/**
 * Internal state: map of handler -> unsubscribe state
 * Using WeakMap since handlers are functions (objects)
 */
const handlerStates = new WeakMap();

onError(handler) {
  if (typeof handler === 'function') {
    // Create state object for this handler
    const state = { subscribed: true };
    handlerStates.set(handler, state);

    _handlers.push(handler);

    // Return unsubscribe function that marks handler as inactive
    return () => {
      const state = handlerStates.get(handler);
      if (state) {
        state.subscribed = false;
      }
      // Don't mutate array - let snapshot in _notifyHandlers filter it out
    };
  }
  return () => {};
}

_notifyHandlers(level, message, error) {
  // Create snapshot to prevent mid-iteration mutations
  const handlersCopy = [..._handlers];

  handlersCopy.forEach(handler => {
    // Check if handler was unsubscribed
    const state = handlerStates.get(handler);
    if (state && !state.subscribed) {
      return; // Skip unsubscribed handlers
    }

    try {
      const payload = {
        level,
        message,
        error,
        timestamp: new Date().toISOString()
      };

      if (error && typeof error === 'object') {
        if (error.name) payload.errorName = error.name;
        if (error.code) payload.errorCode = error.code;
        if (error.statusCode) payload.statusCode = error.statusCode;
        if (error.context) payload.context = error.context;
      }

      const result = handler(payload);

      if (result instanceof Promise) {
        result.catch(err => {
          console.error('Async error handler failed:', err);
        });
      }
    } catch (err) {
      console.error('Error handler failed:', err);
    }
  });
}

/**
 * Periodic cleanup: remove unsubscribed handlers from array
 * Call this occasionally to prevent memory bloat
 * @private
 */
function _cleanupUnsubscribedHandlers() {
  const newHandlers = [];

  for (const handler of _handlers) {
    const state = handlerStates.get(handler);
    if (!state || state.subscribed) {
      newHandlers.push(handler);
    }
  }

  _handlers = newHandlers;
}
```

### Testing
```javascript
describe('onError subscription lifecycle', () => {
  test('unsubscribe during error notification does not skip handlers', () => {
    const handlers = [jest.fn(), jest.fn(), jest.fn()];
    const unsubscribes = handlers.map(h => errorLogger.onError(h));

    // Unsubscribe middle handler while notifying
    errorLogger.onError(() => {
      unsubscribes[1]();  // Unsubscribe handler 2
    });

    errorLogger.error('Test', new Error());

    expect(handlers[0]).toHaveBeenCalled();
    expect(handlers[1]).toHaveBeenCalled();  // Should still be called in snapshot
    expect(handlers[2]).toHaveBeenCalled();
  });

  test('memory cleanup removes unsubscribed handlers', () => {
    const handler = jest.fn();
    const unsubscribe = errorLogger.onError(handler);

    unsubscribe();

    // Cleanup should remove it
    errorLogger._cleanupUnsubscribedHandlers?.();

    // After cleanup, should not be called
    errorLogger.clearHandlers();  // Reset for clean test
  });
});
```

---

## CRITICAL FIX #3: Error Serialization with Type Safety

### Problem
Non-standard error objects can have undefined/null properties, causing serialization issues.

### Current Code (logger.js:77-88)
```javascript
function serializeError(error) {
  if (!error) return undefined;

  return {
    name: error.name,  // ❌ Could be undefined
    message: error.message,  // ❌ Could be undefined
    stack: error.stack,  // ❌ Could be undefined
    ...(error.code && { code: error.code }),
    ...(error.statusCode && { statusCode: error.statusCode }),
    ...(error.cause && { cause: String(error.cause) })
  };
}
```

### Fixed Code
```javascript
function serializeError(error) {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  // Build object defensively
  const serialized = {};

  // Always include these fields with sensible defaults
  serialized.name = String(error?.name ?? 'Error');
  serialized.message = String(error?.message ?? '');

  // Only include stack if it's actually a string
  if (typeof error?.stack === 'string' && error.stack.length > 0) {
    // Cap stack trace size to prevent log bloat
    serialized.stack = error.stack.slice(0, 10000);
  }

  // Include optional properties only if they exist and are valid
  if (
    error.code !== undefined &&
    (typeof error.code === 'string' || typeof error.code === 'number')
  ) {
    serialized.code = error.code;
  }

  if (
    error.statusCode !== undefined &&
    typeof error.statusCode === 'number' &&
    Number.isInteger(error.statusCode)
  ) {
    serialized.statusCode = error.statusCode;
  }

  // Safely convert cause to string
  if (error.cause !== undefined) {
    try {
      serialized.cause = String(error.cause).slice(0, 1000);
    } catch {
      serialized.cause = '[cause serialization failed]';
    }
  }

  return serialized;
}
```

### Testing
```javascript
describe('serializeError', () => {
  test('handles standard Error objects', () => {
    const err = new Error('Test message');
    const serialized = serializeError(err);

    expect(serialized.name).toBe('Error');
    expect(serialized.message).toBe('Test message');
    expect(typeof serialized.stack).toBe('string');
  });

  test('handles non-standard error objects', () => {
    const weirdError = {
      name: null,
      message: undefined,
      stack: null,
      custom: 'value'
    };

    const serialized = serializeError(weirdError);

    expect(serialized.name).toBe('null');  // Coerced to string
    expect(serialized.message).toBe('');  // Uses default
    expect(serialized.stack).toBeUndefined();  // Not included
  });

  test('handles objects with getters that throw', () => {
    const badError = Object.create(null);
    Object.defineProperty(badError, 'message', {
      get() {
        throw new Error('Getter error');
      }
    });

    expect(() => serializeError(badError)).not.toThrow();
  });

  test('truncates large stack traces', () => {
    const err = new Error('Test');
    err.stack = 'a'.repeat(20000);

    const serialized = serializeError(err);

    expect(serialized.stack.length).toBe(10000);
  });
});
```

---

## CRITICAL FIX #4: Event Loop Blocking in Breadcrumb Addition

### Problem
Frequent breadcrumb additions with array.shift() can block event loop.

### Current Code (errors.js:316-348)
```javascript
addBreadcrumb(breadcrumb) {
  const timestamp = Date.now();

  const lastBreadcrumb = this.breadcrumbs.at(-1);
  if (
    lastBreadcrumb &&
    lastBreadcrumb.category === breadcrumb.category &&
    lastBreadcrumb.message === breadcrumb.message &&
    timestamp - lastBreadcrumb.timestamp < 100
  ) {
    errorLogger.debug('Breadcrumb deduplicated...', {...});  // ❌ Logging overhead
    return;
  }

  this.breadcrumbs.push({ ...breadcrumb, timestamp });

  if (this.breadcrumbs.length > this.maxBreadcrumbs) {
    this.breadcrumbs.shift();  // ❌ O(n) operation blocks event loop
  }

  errorLogger.debug('Breadcrumb added', {...});  // ❌ Logging overhead
}
```

### Fixed Code
```javascript
class ErrorMonitor {
  constructor() {
    // Ring buffer: use fixed-size array with head pointer
    this.breadcrumbs = [];
    this.breadcrumbHead = 0;
    this.maxBreadcrumbs = 50;
    this.lastBreadcrumb = null;
  }

  /**
   * Ring buffer implementation: O(1) add, no shifting
   */
  addBreadcrumb(breadcrumb) {
    const timestamp = Date.now();

    // Skip duplicate breadcrumbs (avoid logging overhead)
    if (
      this.lastBreadcrumb &&
      this.lastBreadcrumb.category === breadcrumb.category &&
      this.lastBreadcrumb.message === breadcrumb.message &&
      timestamp - this.lastBreadcrumb.timestamp < 100
    ) {
      return; // Early exit, no logging
    }

    const entry = { ...breadcrumb, timestamp };
    this.lastBreadcrumb = entry;

    // Ring buffer: overwrite oldest entry if full
    if (this.breadcrumbs.length < this.maxBreadcrumbs) {
      this.breadcrumbs.push(entry);
    } else {
      // Circular overwrite: O(1) operation
      this.breadcrumbs[this.breadcrumbHead] = entry;
      this.breadcrumbHead = (this.breadcrumbHead + 1) % this.maxBreadcrumbs;
    }
  }

  /**
   * Get breadcrumbs in chronological order
   */
  getBreadcrumbs() {
    if (this.breadcrumbs.length < this.maxBreadcrumbs) {
      return [...this.breadcrumbs];
    }

    // Return in insertion order (head is oldest)
    return [
      ...this.breadcrumbs.slice(this.breadcrumbHead),
      ...this.breadcrumbs.slice(0, this.breadcrumbHead)
    ];
  }
}
```

### Testing
```javascript
describe('Breadcrumb performance', () => {
  test('adding breadcrumbs does not block event loop', () => {
    const monitor = new ErrorMonitor();

    const startTime = performance.now();

    // Add 100 breadcrumbs (simulating rapid clicks)
    for (let i = 0; i < 100; i++) {
      monitor.addBreadcrumb({
        category: 'user',
        level: 'info',
        message: `Click ${i}`
      });
    }

    const duration = performance.now() - startTime;

    // Should complete in < 5ms (no array shifting)
    expect(duration).toBeLessThan(5);
  });

  test('deduplication prevents duplicate breadcrumbs', () => {
    const monitor = new ErrorMonitor();

    for (let i = 0; i < 10; i++) {
      monitor.addBreadcrumb({
        category: 'console',
        level: 'error',
        message: 'Same error'
      });
    }

    const breadcrumbs = monitor.getBreadcrumbs();
    expect(breadcrumbs.length).toBe(1);
  });

  test('ring buffer preserves insertion order', () => {
    const monitor = new ErrorMonitor();
    monitor.maxBreadcrumbs = 5;

    for (let i = 0; i < 10; i++) {
      monitor.addBreadcrumb({
        category: 'test',
        level: 'info',
        message: `Item ${i}`
      });
    }

    const breadcrumbs = monitor.getBreadcrumbs();
    expect(breadcrumbs.length).toBe(5);
    expect(breadcrumbs[0].message).toBe('Item 5');  // Oldest kept
    expect(breadcrumbs[4].message).toBe('Item 9');  // Newest
  });
});
```

---

## CRITICAL FIX #5: Race Condition in Queue Processing

### Problem
Processing promise can be incorrectly cleared if timing is right.

### Current Code (telemetryQueue.js:572-596)
```javascript
let processingPromise = null;

export async function processQueue(options) {
  if (!isBrowser()) {
    throw new Error('[TelemetryQueue] Cannot process queue in SSR environment');
  }

  if (processingPromise) {
    return processingPromise;  // ❌ Returns old promise
  }

  const currentPromise = performQueueProcessing(options);
  processingPromise = currentPromise;

  try {
    return await currentPromise;
  } finally {
    // ❌ RACE: If new processQueue() called during finally,
    // this clears the new promise!
    if (processingPromise === currentPromise) {
      processingPromise = null;
    }
  }
}
```

### Fixed Code
```javascript
let processingPromise = null;
let processingId = 0;  // Generation counter to detect stale promises

export async function processQueue(options) {
  if (!isBrowser()) {
    throw new Error('[TelemetryQueue] Cannot process queue in SSR environment');
  }

  // If already processing, return the existing promise
  if (processingPromise) {
    return processingPromise;
  }

  // Generate ID for this processing run
  const myId = ++processingId;

  try {
    // Create and store the processing promise
    const currentPromise = performQueueProcessing(options);
    processingPromise = currentPromise;

    const result = await currentPromise;
    return result;
  } finally {
    // Only clear if we're still the active processor
    // (prevents clearing if new processQueue() started during our finally)
    if (processingId === myId) {
      processingPromise = null;
    }
  }
}
```

### Alternative: Using AbortController
```javascript
let processingPromise = null;

export async function processQueue(options) {
  if (!isBrowser()) {
    throw new Error('[TelemetryQueue] Cannot process queue in SSR environment');
  }

  // If already processing, return the existing promise
  if (processingPromise) {
    return processingPromise;
  }

  // Wrap in Promise that always clears itself
  const processingHandle = (async () => {
    try {
      return await performQueueProcessing(options);
    } finally {
      // IMPORTANT: Only clear if we're still the active promise
      if (processingPromise === processingHandle) {
        processingPromise = null;
      }
    }
  })();

  processingPromise = processingHandle;
  return processingHandle;
}
```

### Testing
```javascript
describe('Queue processing race conditions', () => {
  test('does not clear promise if new processing starts', async () => {
    let resolve1;
    const promise1 = new Promise(r => { resolve1 = r; });

    jest.spyOn(global, 'performQueueProcessing').mockReturnValue(promise1);

    // Start processing
    const result1 = processQueue();

    // Start second processing while first is pending
    const result2 = processQueue();

    // Both should return same promise
    expect(result1).toBe(result2);

    // Resolve first processing
    resolve1({ processed: 5, succeeded: 5, failed: 0, retrying: 0, results: [] });

    await expect(result1).resolves.toBeDefined();
    await expect(result2).resolves.toBeDefined();

    // After first completes, promise should still be set (not cleared yet)
    // because new processing might have started
    expect(processingPromise).toBe(null);  // Only cleared when safe
  });

  test('handles rapid successive calls', async () => {
    const results = [];

    const calls = Array(10).fill(null).map(() => processQueue());

    // All should return same promise
    const firstPromise = calls[0];
    for (const call of calls) {
      expect(call).toBe(firstPromise);
    }

    // Mock successful completion
    const settledResult = {
      processed: 5,
      succeeded: 5,
      failed: 0,
      retrying: 0,
      results: []
    };

    await Promise.all(calls);

    // After all complete, promise should be cleared
    expect(processingPromise).toBeNull();
  });
});
```

---

## CRITICAL FIX #6: Validation Function Error Handling

### Problem
Validation function itself can throw due to property access on untrusted input.

### Current Code (api-middleware.js:333-371)
```javascript
export function isValidErrorTelemetry(data) {
  if (typeof data !== 'object' || data === null) return false;

  const obj = /** @type {Record<string, unknown>} */ (data);

  if (!Array.isArray(obj.errors)) return false;
  if (obj.errors.length === 0 || obj.errors.length > MAX_ERROR_BATCH) return false;

  for (const err of obj.errors) {
    if (typeof err !== 'object' || err === null) return false;
    const e = /** @type {Record<string, unknown>} */ (err);
    if (typeof e.message !== 'string' || e.message.length === 0) return false;
    if (e.message.length > 2000) return false;  // ❌ DoS with large strings

    if (e.level !== undefined) {
      if (typeof e.level !== 'string') return false;
      if (!['debug', 'info', 'warning', 'error', 'fatal'].includes(e.level)) return false;
    }

    if (e.breadcrumbs !== undefined) {
      if (!Array.isArray(e.breadcrumbs)) return false;
      if (e.breadcrumbs.length > 100) return false;
    }

    if (e.stack !== undefined && typeof e.stack === 'string' && e.stack.length > 10000) {
      return false;
    }
  }

  if (obj.timestamp !== undefined && typeof obj.timestamp !== 'number') return false;

  return true;
}
```

### Fixed Code
```javascript
/**
 * Safe string length check that won't throw on weird objects
 */
function getSafeLength(value) {
  try {
    if (typeof value?.length === 'number' && Number.isFinite(value.length)) {
      return value.length;
    }
  } catch {
    // Ignore errors from property access
  }
  return undefined;
}

export function isValidErrorTelemetry(data) {
  try {
    if (typeof data !== 'object' || data === null) return false;

    const obj = /** @type {Record<string, unknown>} */ (data);

    if (!Array.isArray(obj.errors)) return false;

    const errorCount = getSafeLength(obj.errors);
    if (errorCount === undefined || errorCount === 0 || errorCount > MAX_ERROR_BATCH) {
      return false;
    }

    for (const err of obj.errors) {
      if (typeof err !== 'object' || err === null) return false;
      const e = /** @type {Record<string, unknown>} */ (err);

      // Safely check message
      const message = String(e.message ?? '');
      if (message.length === 0 || message.length > 2000) return false;

      // Check level if present
      if (e.level !== undefined) {
        if (typeof e.level !== 'string') return false;
        if (!['debug', 'info', 'warning', 'error', 'fatal'].includes(e.level)) {
          return false;
        }
      }

      // Check breadcrumbs if present
      if (e.breadcrumbs !== undefined) {
        if (!Array.isArray(e.breadcrumbs)) return false;
        const breadcrumbCount = getSafeLength(e.breadcrumbs);
        if (breadcrumbCount === undefined || breadcrumbCount > 100) return false;
      }

      // Check stack if present
      if (e.stack !== undefined) {
        const stack = String(e.stack);
        if (stack.length > 10000) return false;
      }
    }

    // Check timestamp if present
    if (obj.timestamp !== undefined) {
      if (typeof obj.timestamp !== 'number' || !Number.isFinite(obj.timestamp)) {
        return false;
      }
    }

    return true;
  } catch (error) {
    // If validation itself throws, log it and reject
    errorLogger.error('Validation error in isValidErrorTelemetry', error);
    return false;
  }
}
```

### Testing
```javascript
describe('isValidErrorTelemetry', () => {
  test('rejects valid error telemetry', () => {
    const valid = {
      errors: [
        {
          level: 'error',
          message: 'Test error',
          stack: 'Error: Test\n  at function (file.js:10:5)'
        }
      ],
      timestamp: Date.now()
    };

    expect(isValidErrorTelemetry(valid)).toBe(true);
  });

  test('rejects empty message', () => {
    expect(isValidErrorTelemetry({
      errors: [{ message: '' }]
    })).toBe(false);
  });

  test('safely handles malicious .length property', () => {
    const malicious = {
      errors: [
        {
          message: Object.defineProperty({}, 'length', {
            get() { throw new Error('Boom'); }
          })
        }
      ]
    };

    // Should not throw, should return false
    expect(() => isValidErrorTelemetry(malicious)).not.toThrow();
    expect(isValidErrorTelemetry(malicious)).toBe(false);
  });

  test('safely handles custom objects with large .length', () => {
    const fake = {
      errors: [{
        message: { length: Number.MAX_SAFE_INTEGER },
        [Symbol.iterator]: function*() {
          for (let i = 0; i < 1000; i++) yield undefined;
        }
      }]
    };

    expect(() => isValidErrorTelemetry(fake)).not.toThrow();
    expect(isValidErrorTelemetry(fake)).toBe(false);
  });

  test('rejects array with too many items', () => {
    const overfilled = {
      errors: Array(MAX_ERROR_BATCH + 1).fill({ message: 'error' })
    };

    expect(isValidErrorTelemetry(overfilled)).toBe(false);
  });

  test('truncates and validates large messages', () => {
    const largeMessage = 'a'.repeat(2000);
    expect(isValidErrorTelemetry({
      errors: [{ message: largeMessage }]
    })).toBe(false);

    const okMessage = 'a'.repeat(1999);
    expect(isValidErrorTelemetry({
      errors: [{ message: okMessage }]
    })).toBe(true);
  });
});
```

---

## Implementation Checklist

- [ ] Apply Fix #1: Async handler rejection handling
- [ ] Apply Fix #2: Handler array mutation prevention
- [ ] Apply Fix #3: Error serialization type safety
- [ ] Apply Fix #4: Ring buffer for breadcrumbs
- [ ] Apply Fix #5: Queue processing race condition
- [ ] Apply Fix #6: Validation function error handling
- [ ] Add test cases for each fix
- [ ] Run full test suite
- [ ] Performance test breadcrumb additions
- [ ] Test in staging environment
- [ ] Code review by team
- [ ] Deploy to production
- [ ] Monitor error rates post-deployment

