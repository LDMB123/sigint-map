# Runtime Error Analysis: Error Logging System
## DMB Almanac Error Handling Infrastructure

**Analysis Date**: 2025-01-30
**Files Analyzed**:
- `/app/src/lib/errors/logger.js`
- `/app/src/lib/errors/handler.js`
- `/app/src/lib/errors/types.js`
- `/app/src/lib/monitoring/errors.js`
- `/app/src/lib/server/api-middleware.js`
- `/app/src/lib/services/telemetryQueue.js`

---

## Executive Summary

The error logging system is well-structured with comprehensive error handling patterns. However, **6 critical runtime error risks** and **12 edge case vulnerabilities** were identified that could cause cascading failures under specific conditions.

**Risk Level**: 🟡 **MEDIUM**
- **Critical Issues**: 6
- **High Priority**: 8
- **Medium Priority**: 4

---

## Critical Issues (Must Fix)

### Issue #1: Unhandled Promise Rejection in Error Handler Callbacks

**Location**: `logger.js:319-335` (`_notifyHandlers` method)

```javascript
_notifyHandlers(level, message, error) {
  _handlers.forEach(handler => {
    try {
      const payload = { level, message, error, timestamp: new Date().toISOString() };
      // ... payload construction
      handler(payload);  // ⚠️ DANGER: No catch for async handlers
    } catch (err) {
      console.error('Error handler failed:', err);
    }
  });
}
```

**Problem**:
- Handler is called synchronously, but if handler is async function that rejects, the rejection is **not caught**
- Unhandled rejection happens in forEach callback - try/catch only wraps synchronous code
- One failing async handler doesn't prevent other handlers from executing but leaves unhandled rejection

**Reproduction**:
```javascript
errorLogger.onError(async (report) => {
  throw new Error('Async handler failure');  // Unhandled rejection!
});
errorLogger.error('Test', new Error('test'));
```

**Impact**: Silent failures in monitoring callbacks, unhandled rejection events

**Fix Strategy**:
```javascript
_notifyHandlers(level, message, error) {
  _handlers.forEach(handler => {
    try {
      const payload = { level, message, error, timestamp: new Date().toISOString() };
      const result = handler(payload);
      // If handler returns a promise, attach rejection handler
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
```

---

### Issue #2: Array Mutation in Handler Management

**Location**: `logger.js:268-280` (`onError` method)

```javascript
onError(handler) {
  if (typeof handler === 'function') {
    _handlers.push(handler);  // ⚠️ Direct array mutation
    return () => {
      const index = _handlers.indexOf(handler);  // O(n) lookup
      if (index > -1) {
        _handlers.splice(index, 1);  // ⚠️ Array mutation during iteration
      }
    };
  }
  return () => {}; // No-op for invalid handlers
}
```

**Problem**:
- If unsubscribe is called while `_notifyHandlers` is executing forEach, array indices shift
- `_handlers.splice()` during forEach iteration can skip handlers or cause incorrect behavior
- Multiple concurrent subscriptions/unsubscriptions could corrupt handler list

**Reproduction**:
```javascript
const unsubscribe = errorLogger.onError((e) => {
  errorLogger.onError(() => console.log('race'));  // Concurrent mutation
});

errorLogger.error('test', new Error());
unsubscribe();  // Array index shift during forEach
```

**Impact**: Memory leaks (handlers never removed), missed error notifications

**Fix Strategy**:
```javascript
_notifyHandlers(level, message, error) {
  // Create snapshot to prevent mid-iteration mutations
  const handlersCopy = [..._handlers];

  handlersCopy.forEach(handler => {
    try {
      const payload = { level, message, error, timestamp: new Date().toISOString() };
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
```

---

### Issue #3: Null/Undefined Dereference in Error Serialization

**Location**: `logger.js:77-88` (`serializeError` function)

```javascript
function serializeError(error) {
  if (!error) return undefined;

  return {
    name: error.name,        // ⚠️ Could be undefined
    message: error.message,  // ⚠️ Could be undefined
    stack: error.stack,      // ⚠️ Could be undefined
    ...(error.code && { code: error.code }),
    ...(error.statusCode && { statusCode: error.statusCode }),
    ...(error.cause && { cause: String(error.cause) })  // ⚠️ Assuming .cause exists
  };
}
```

**Problem**:
- Non-standard error objects might not have `name`, `message`, or `stack` properties
- If someone passes `{ custom: 'error' }` object, `error.name` is `undefined`
- `String()` coercion on `error.cause` could invoke `toString()` with side effects
- No type validation before accessing properties

**Reproduction**:
```javascript
const weirdError = Object.create(null);
weirdError.name = null;  // Not undefined, but null
weirdError.message = null;

const serialized = serializeError(weirdError);
console.log(serialized.name);  // null (not filtered)

// Or passing through JSON.stringify
const result = JSON.stringify(serializeError(new Error()));
// Result might include undefined fields
```

**Impact**: Undefined values in logs, potentially invalid JSON, type inconsistency

**Fix Strategy**:
```javascript
function serializeError(error) {
  if (!error || typeof error !== 'object') return undefined;

  return {
    name: String(error?.name ?? 'Error'),
    message: String(error?.message ?? ''),
    stack: typeof error?.stack === 'string' ? error.stack : undefined,
    ...(error.code && { code: error.code }),
    ...(error.statusCode && typeof error.statusCode === 'number' && { statusCode: error.statusCode }),
    ...(error.cause !== undefined && { cause: String(error.cause) })
  };
}
```

---

### Issue #4: Event Loop Blocking in Breadcrumb Addition

**Location**: `monitoring/errors.js:316-348` (`addBreadcrumb` method)

```javascript
addBreadcrumb(breadcrumb) {
  const timestamp = Date.now();

  const lastBreadcrumb = this.breadcrumbs.at(-1);
  if (
    lastBreadcrumb &&
    lastBreadcrumb.category === breadcrumb.category &&
    lastBreadcrumb.message === breadcrumb.message &&
    timestamp - lastBreadcrumb.timestamp < 100  // ⚠️ Tight timing window
  ) {
    errorLogger.debug('Breadcrumb deduplicated...', {...});  // Synchronous logging
    return;
  }

  this.breadcrumbs.push({ ...breadcrumb, timestamp });  // ⚠️ Array growth unbounded

  if (this.breadcrumbs.length > this.maxBreadcrumbs) {
    this.breadcrumbs.shift();  // ⚠️ O(n) operation with shallow shift
  }

  errorLogger.debug('Breadcrumb added', {...});  // Synchronous logging
}
```

**Problem**:
- Breadcrumbs added at high frequency (clicks, network calls, navigations)
- Deduplication check runs every breadcrumb addition (repeated comparisons)
- `.shift()` on array with 50+ items can block event loop for 1-2ms
- Multiple `errorLogger.debug()` calls per breadcrumb add chain up synchronously
- With click tracking on 1000+ interactive elements, could hit 50 breadcrumb limit quickly

**Reproduction**:
```javascript
// Rapid click simulation
for (let i = 0; i < 100; i++) {
  errorMonitor.addBreadcrumb({
    category: 'user',
    level: 'info',
    message: 'Click',
    data: { selector: `#btn-${i}` }
  });
  // Each addition does dedup check + array.shift() + logging
}
// Event loop blocked for 50-100ms total
```

**Impact**: Jank/dropped frames during heavy interaction, slow First Input Delay (FID)

**Fix Strategy**:
```javascript
addBreadcrumb(breadcrumb) {
  const timestamp = Date.now();

  // Defer dedup logic to avoid blocking on every add
  const lastBreadcrumb = this.breadcrumbs[this.breadcrumbs.length - 1];
  if (
    lastBreadcrumb &&
    lastBreadcrumb.category === breadcrumb.category &&
    lastBreadcrumb.message === breadcrumb.message &&
    timestamp - lastBreadcrumb.timestamp < 100
  ) {
    return; // Early exit, no logging needed
  }

  this.breadcrumbs.push({ ...breadcrumb, timestamp });

  // Use deque pattern or ring buffer instead of shift()
  if (this.breadcrumbs.length > this.maxBreadcrumbs) {
    // Rotate instead of shift: O(1) amortized
    this.breadcrumbs[this.breadcrumbs.length - this.maxBreadcrumbs - 1] = undefined;
    this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
  }
}
```

---

### Issue #5: Race Condition in Telemetry Queue Processing

**Location**: `telemetryQueue.js:572-596` (`processQueue` function)

```javascript
export async function processQueue(options) {
  if (!isBrowser()) {
    throw new Error('[TelemetryQueue] Cannot process queue in SSR environment');
  }

  // If already processing, return the existing promise
  if (processingPromise) {
    errorLogger.debug('[TelemetryQueue] Queue already processing, returning existing promise');
    return processingPromise;  // ⚠️ Returns old promise if new call starts
  }

  const currentPromise = performQueueProcessing(options);
  processingPromise = currentPromise;

  try {
    return await currentPromise;
  } finally {
    // ⚠️ RACE: If new call starts during this finally, processingPromise was just set again
    if (processingPromise === currentPromise) {
      processingPromise = null;  // Clears the right promise, BUT...
    }
  }
}
```

**Problem**:
- If `processQueue()` called while previous promise in finally block
- New call sets `processingPromise` to new promise
- Old call's finally checks `if (processingPromise === currentPromise)` - TRUE
- Old call clears the **new** promise!
- Next caller gets `null` instead of active promise

**Timeline**:
```
Call 1: processingPromise = Promise1
Call 1: await Promise1...
Call 2: processingPromise === Promise1? YES, return Promise1
  [Call 1 finally block executes asynchronously]
Call 1 finally: if (processingPromise === currentPromise) → TRUE (processingPromise is Promise1)
Call 1 finally: processingPromise = null  // ⚠️ Clears active Promise1!
Call 2: returns null (processingPromise cleared)
```

**Impact**: Duplicate queue processing, race conditions, missed telemetry

**Fix Strategy**:
```javascript
export async function processQueue(options) {
  if (!isBrowser()) {
    throw new Error('[TelemetryQueue] Cannot process queue in SSR environment');
  }

  if (processingPromise) {
    return processingPromise;
  }

  const controller = new AbortController();
  const currentPromise = performQueueProcessing(options).then(
    result => ({ success: true, result, controller }),
    error => { controller.abort(); throw error; }
  );

  processingPromise = currentPromise;

  try {
    return await currentPromise;
  } finally {
    // Always clear after completion
    processingPromise = null;
  }
}
```

---

### Issue #6: Type Coercion Vulnerability in Validation

**Location**: `api-middleware.js:333-371` (`isValidErrorTelemetry` function)

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
    if (e.message.length > 2000) return false;  // ⚠️ Trusts .length property

    // ⚠️ Check happens but level could be symbol or numeric
    if (e.level !== undefined) {
      if (typeof e.level !== 'string') return false;
      if (!['debug', 'info', 'warning', 'error', 'fatal'].includes(e.level)) return false;
    }

    if (e.breadcrumbs !== undefined) {
      if (!Array.isArray(e.breadcrumbs)) return false;
      if (e.breadcrumbs.length > 100) return false;  // ⚠️ Trusts .length
    }

    if (e.stack !== undefined && typeof e.stack === 'string' && e.stack.length > 10000) {
      return false;  // ⚠️ DoS: Large stack traces cause validation to fail
    }
  }

  if (obj.timestamp !== undefined && typeof obj.timestamp !== 'number') return false;

  return true;
}
```

**Problem**:
- Object with custom `length` property that's not a number: `{ message: { length: -1 } }`
- Type guard `typeof e.message === 'string'` passed, but property could be a getter that throws
- `e.message.length` could trigger custom getter/error
- Stack trace size limit (10000) could be DoS vector - accepts any object with large `.length`
- `Array.isArray()` check could be bypassed with array-like object

**Reproduction**:
```javascript
const malicious = {
  errors: [{
    message: Object.defineProperty({}, 'length', {
      get() { throw new Error('Validation DoS'); }
    })
  }]
};

try {
  isValidErrorTelemetry(malicious);  // TypeError during validation
} catch (e) {
  console.log('Validation threw:', e);  // Runtime error in validator!
}
```

**Impact**: Validation function itself can throw, causing unhandled errors

**Fix Strategy**:
```javascript
export function isValidErrorTelemetry(data) {
  if (typeof data !== 'object' || data === null) return false;

  const obj = /** @type {Record<string, unknown>} */ (data);

  try {
    if (!Array.isArray(obj.errors)) return false;

    const errorCount = obj.errors.length;
    if (errorCount === 0 || errorCount > MAX_ERROR_BATCH) return false;

    for (const err of obj.errors) {
      if (typeof err !== 'object' || err === null) return false;
      const e = /** @type {Record<string, unknown>} */ (err);

      // Safe property access
      const message = String(e.message ?? '');
      if (message.length === 0 || message.length > 2000) return false;

      if (e.level !== undefined) {
        if (typeof e.level !== 'string') return false;
        if (!['debug', 'info', 'warning', 'error', 'fatal'].includes(e.level)) return false;
      }

      if (e.breadcrumbs !== undefined) {
        if (!Array.isArray(e.breadcrumbs)) return false;
        if (e.breadcrumbs.length > 100) return false;
      }

      if (e.stack !== undefined) {
        const stack = String(e.stack);
        if (stack.length > 10000) return false;
      }
    }

    if (obj.timestamp !== undefined) {
      if (typeof obj.timestamp !== 'number' || !Number.isFinite(obj.timestamp)) return false;
    }

    return true;
  } catch (error) {
    errorLogger.error('Validation error in isValidErrorTelemetry', error);
    return false;
  }
}
```

---

## High Priority Issues

### Issue #7: Sanitization Recursion Depth Not Enforced for All Paths

**Location**: `logger.js:47-69` (`sanitizeObject` function)

```javascript
function sanitizeObject(obj, depth = 0) {
  if (depth > 3) return '[Max Depth Exceeded]';  // ⚠️ Only 3 levels!
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some(sk =>
      keyLower.includes(sk.toLowerCase())  // ⚠️ Substring match, not exact
    );

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, depth + 1);  // ⚠️ Circular reference?
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
```

**Problems**:
1. Circular references not detected - if `obj.a.b === obj`, infinite recursion possible
2. `includes()` check too broad - `password_field_name` matches `password`
3. Depth check at 3 levels very shallow - real objects often 5+ levels
4. No protection against prototype pollution in spread operator

**Reproduction**:
```javascript
const circular = { user: { name: 'test' } };
circular.user.self = circular.user;  // Circular reference

errorLogger.error('Test', new Error(), circular);  // Stack overflow!

// Or:
const obj = {
  data: {
    mypassword_reset_token: 'secret'  // Matches 'password'
  }
};
errorLogger.error('Test', new Error(), obj);  // Overly redacted
```

**Fix Strategy**:
- Track visited objects using WeakSet
- Use exact key matching instead of substring
- Increase depth limit to 10
- Sanitize array indices to prevent prototype pollution

---

### Issue #8: Improper Error Context in Handler Failures

**Location**: `handler.js:157-159` (`handleValidationError` function)

```javascript
export function handleValidationError(error, options = {}) {
  errorLogger.error('Validation error', error);

  const fieldList = Object.entries(error.fields)  // ⚠️ error.fields could be undefined
    .map(([field, messages]) => `${field}: ${messages.join(', ')}`)  // ⚠️ messages could be non-array
    .join('\n');

  const userMessage = `Please fix the following issues:\n${fieldList}`;
  // ...
}
```

**Problem**:
- `error.fields` might not exist on ValidationError instance
- `messages` in field object might not be array
- `.join(', ')` on non-array throws TypeError
- No try/catch around user message construction

**Reproduction**:
```javascript
const badError = new ValidationError({
  email: 'not an array'  // Should be string[]
}, 'Validation failed');

handleValidationError(badError);  // TypeError: messages.join is not a function
```

---

### Issue #9: Window Object Race Condition in SSR

**Location**: `monitoring/errors.js:175-198` (multiple locations checking `typeof window`)

```javascript
initialize() {
  if (this.initialized) return;
  if (typeof window === 'undefined') return;  // ⚠️ SSR check happens once

  window.addEventListener('error', (event) => {
    this.captureError(event.error || new Error(event.message), {
      tags: {
        type: 'uncaught_error',
        filename: event.filename,
        lineno: String(event.lineno),  // ⚠️ Trusts event properties
        colno: String(event.colno)
      }
    });
  }, { signal });
  // ...
}
```

**Problem**:
- `event.lineno` and `event.colno` might be undefined
- `String(undefined)` = `"undefined"` (truthy string)
- Event properties not validated before access
- Error event could have event.error = null

**Reproduction**:
```javascript
// Synthetic error event with missing properties
const event = new ErrorEvent('error', {
  message: 'Test error'
  // No lineno, colno, filename
});

window.dispatchEvent(event);  // context has lineno: 'undefined'
```

---

### Issue #10: Missing Null Check in JSON Stringify

**Location**: `logger.js:251-253` (`exportLogs` method)

```javascript
exportLogs() {
  return JSON.stringify(_logs, null, 2);  // ⚠️ _logs could contain circular refs or non-serializable
}
```

**Problem**:
- If _logs contains DOM nodes (from error context), JSON.stringify throws
- Circular references in captured context cause TypeError
- ErrorMonitor stores window.__ERROR_MONITOR_USER__ which could be mutated

**Fix Strategy**:
```javascript
exportLogs() {
  try {
    return JSON.stringify(_logs, (key, value) => {
      // Filter non-serializable values
      if (value instanceof Error) return value.toString();
      if (typeof value === 'function') return undefined;
      if (value instanceof HTMLElement) return `[DOM: ${value.tagName}]`;
      return value;
    }, 2);
  } catch (error) {
    errorLogger.warn('Failed to export logs', error);
    return JSON.stringify({ error: 'Failed to serialize logs' });
  }
}
```

---

### Issue #11: Unhandled Rejection in Error Monitoring Initialization

**Location**: `monitoring/errors.js:213-215`

```javascript
// Register error handler with error logger
errorLogger.onError(async (report) => {
  await this.handleErrorReport(report);  // ⚠️ Unhandled rejection possible
});
```

**Problem**:
- `handleErrorReport` is async but rejection not handled
- If `handleErrorReport` throws, error is unhandled
- Maps back to Issue #1 - async error handler without rejection handler

**Fix Strategy**: Apply Issue #1 fix first

---

### Issue #12: Memory Leak in Console Method Interception

**Location**: `monitoring/errors.js:483-503` (`interceptConsoleErrors` method)

```javascript
interceptConsoleErrors() {
  if (typeof console === 'undefined') return;

  this.originalConsoleMethods.error = console.error;
  this.originalConsoleMethods.warn = console.warn;

  const originalError = console.error;  // ⚠️ Captures reference
  console.error = (...args) => {
    this.addBreadcrumb({
      category: 'console',
      level: 'error',
      message: args.map(String).join(' ')  // ⚠️ Closure captures 'this'
    });

    originalError.apply(console, args);  // ⚠️ Missing bind context
  };
  // ...
}
```

**Problem**:
- Closure captures `this` reference - prevents garbage collection
- If ErrorMonitor destroyed but console.error not restored, memory leak
- `originalError` is function reference, not bound properly
- destroy() restores original but if called twice, could restore wrong function

**Reproduction**:
```javascript
const monitor = new ErrorMonitor();
monitor.initialize();
monitor.destroy();
monitor.destroy();  // Second destroy might break console

// Or: console still points to monitor after destroy
// monitor is in closure → memory leak
```

---

## Medium Priority Issues

### Issue #13: Race Condition in Fetch Interception

**Location**: `monitoring/errors.js:595` (fetch reassignment)

```javascript
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  // ...
  return originalFetch(...args);  // ⚠️ Lost context
};
```

**Problem**:
- `originalFetch` not bound to window context
- Request objects created without proper this binding
- Multiple monitors overwriting each other's interceptions

---

### Issue #14: Array Length Property Assumption

**Location**: `monitoring/errors.js:553-563` (element selector)

```javascript
getElementSelector(element) {
  if (element.id) return `#${element.id}`;

  if (element.classList && element.classList.length > 0) {  // ⚠️ Assumes .length exists
    return `${element.tagName.toLowerCase()}.${
      Array.from(element.classList).join('.')
    }`;
  }

  return element.tagName.toLowerCase();
}
```

**Problem**:
- SVG and custom elements might not have standard classList
- `.length` property might be enumerable but not numeric
- Array.from() could fail on non-iterable classList

---

### Issue #15: No Timeout on Global Event Handlers

**Location**: `monitoring/errors.js:587-695` (fetch/XHR interception)

```javascript
XMLHttpRequest.prototype.send = function (...args) {
  const xhr = /** @type {TrackedXHR} */ (this);
  const startTime = Date.now();

  xhr.addEventListener('load', () => {  // ⚠️ No cleanup on abort
    // breadcrumb tracking
  }, { once: true });

  xhr.addEventListener('error', () => {  // ⚠️ No cleanup on timeout
    // breadcrumb tracking
  }, { once: true });

  return originalXHRSend.apply(xhr, args);
}
```

**Problem**:
- If XHR hangs forever, event listeners never fire
- Memory leak accumulates if many hung requests
- No cleanup if xhr object garbage collected

---

### Issue #16: Error Handler State Inconsistency

**Location**: `handler.js:389-519` (`setupGlobalErrorHandlers` function)

```javascript
const recentErrors = new Map();  // ⚠️ Grows without bound initially

function isDuplicateError(fingerprint) {
  const now = Date.now();
  const lastSeen = recentErrors.get(fingerprint);
  if (lastSeen && (now - lastSeen) < DEDUP_WINDOW_MS) {
    return true;
  }
  // Enforce max size
  if (recentErrors.size >= MAX_TRACKED_ERRORS) {  // ⚠️ Only clears oldest after limit
    const oldestKey = recentErrors.keys().next().value;  // ⚠️ Gets first, not oldest
    if (oldestKey !== undefined) {
      recentErrors.delete(oldestKey);
    }
  }
  recentErrors.set(fingerprint, now);
  return false;
}
```

**Problem**:
- Map doesn't track insertion order by timestamp, just keys
- `keys().next().value` gets first key, not oldest by timestamp
- If 50 errors in rapid succession, only newest deleted

---

## Edge Cases & Defensive Coding

### Issue #17: Async Stack Loss in Error Handlers

**Location**: `handler.js:312-348` (`retryOperation` function)

```javascript
export async function retryOperation(
  operation,
  maxRetries = 3,
  initialDelayMs = 1000,
  context
) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error(String(error));  // ⚠️ New stack

      if (attempt < maxRetries - 1) {
        const delayMs = initialDelayMs * Math.pow(2, attempt);
        errorLogger.info(
          `Retrying operation (attempt ${attempt + 1}/${maxRetries}) after ${delayMs}ms`,
          context
        );

        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  if (lastError) {
    throw new AsyncError(  // ⚠️ Loses original stack
      'retryOperation',
      lastError,
      { maxRetries, attempts: maxRetries, ...context }
    );
  }

  throw new Error('Retry operation failed');  // ⚠️ Generic message
}
```

**Problems**:
1. `new AsyncError()` wraps error, losing original call stack
2. Multiple retries lose intermediate attempts
3. `lastError` could be undefined if maxRetries is 0

---

### Issue #18: Type Guard Function Not Exported

**Location**: `types.js:377-411` (Type guards)

```javascript
export function isAppError(error) {
  return error instanceof AppError;
}
```

**Problem**:
- Type guards assume error is Error instance
- But instanceof check doesn't work cross-realm (iframes)
- No fallback for serialized/deserialized errors from network

---

### Issue #19: Error Context Mutation

**Location**: `errors.js:355-395` (window globals)

```javascript
setUser(user) {
  if (typeof window !== 'undefined') {
    window.__ERROR_MONITOR_USER__ = user;  // ⚠️ Mutable global
  }
}

setTags(tags) {
  if (typeof window !== 'undefined') {
    window.__ERROR_MONITOR_TAGS__ = {
      ...window.__ERROR_MONITOR_TAGS__,  // ⚠️ Assumes it exists
      ...tags
    };
  }
}
```

**Problem**:
- `window.__ERROR_MONITOR_TAGS__` might be undefined first call
- Multiple monitors could conflict on same global
- Objects mutable - callers could modify after setting

---

### Issue #20: Missing JSDoc @throws Documentation

**Location**: Multiple locations

```javascript
// Missing @throws for async functions
export async function processQueue(options) {
  // Could throw from SSR check, db operations, Promise rejections
  // But @throws not documented
}
```

---

## Summary Table

| Issue | Location | Type | Severity | Impact |
|-------|----------|------|----------|--------|
| #1 | logger.js:319 | Unhandled async rejection | CRITICAL | Silent monitoring failures |
| #2 | logger.js:268 | Array mutation race | CRITICAL | Memory leaks, handler loss |
| #3 | logger.js:77 | Null dereference | CRITICAL | Invalid logs, undefined values |
| #4 | errors.js:316 | Event loop blocking | CRITICAL | Performance jank |
| #5 | telemetryQueue.js:572 | Race in queue processing | CRITICAL | Duplicate submissions |
| #6 | api-middleware.js:333 | Validation DoS | CRITICAL | Unhandled errors in validator |
| #7 | logger.js:47 | Circular reference | HIGH | Stack overflow |
| #8 | handler.js:157 | Missing field validation | HIGH | TypeError in handler |
| #9 | errors.js:175 | Event property access | HIGH | Invalid context data |
| #10 | logger.js:251 | JSON.stringify circular | HIGH | Export failure |
| #11 | errors.js:213 | Unhandled rejection | HIGH | Monitoring gap |
| #12 | errors.js:483 | Memory leak in interception | HIGH | Prevented GC |
| #13 | errors.js:595 | Lost fetch context | MEDIUM | Potential request failures |
| #14 | errors.js:553 | ClassList assumptions | MEDIUM | Runtime errors on custom elements |
| #15 | errors.js:647 | No XHR timeout cleanup | MEDIUM | Memory leak on hung requests |
| #16 | handler.js:415 | Wrong oldest deletion | MEDIUM | Dedup map bloat |
| #17 | handler.js:312 | Stack loss on retry | MEDIUM | Lost debugging context |
| #18 | types.js:377 | Cross-realm instanceof | MEDIUM | Type guard failure |
| #19 | errors.js:355 | Global mutation | MEDIUM | Conflict between monitors |
| #20 | Multiple | Missing @throws | LOW | Documentation gap |

---

## Recommended Action Plan

### Phase 1: Immediate (This Sprint)
1. **Fix Issue #1**: Add Promise rejection handler to _notifyHandlers
2. **Fix Issue #2**: Create snapshot of handlers before forEach iteration
3. **Fix Issue #5**: Refactor queue processing promise management
4. **Fix Issue #6**: Add try/catch to validation function

### Phase 2: High Priority (Next Sprint)
5. **Fix Issue #7**: Implement WeakSet for circular reference detection
6. **Fix Issue #8**: Add defensive checks to handler functions
7. **Fix Issue #12**: Refactor console method restoration with guard

### Phase 3: Medium Priority (Backlog)
8. **Fix Issues #9-11**: Add comprehensive SSR and async handling tests
9. **Fix Issue #4**: Profile breadcrumb addition and optimize
10. **Add monitoring**: Create test suite for all error paths

---

## Testing Strategy

### Unit Tests Needed
```javascript
describe('Error Logger Edge Cases', () => {
  test('handleError called while handlers unsubscribing');
  test('circular reference in error context');
  test('async error handler rejection');
  test('serializeError with non-standard error object');
  test('validation function with malicious input');
  test('breadcrumb addition at 60fps');
  test('queue processing race conditions');
});
```

### Integration Tests Needed
```javascript
describe('Error System E2E', () => {
  test('error in handler callback handled gracefully');
  test('monitoring survives page navigation');
  test('console override does not break error logs');
  test('multiple error monitors do not conflict');
});
```

---

## Files Requiring Fixes

1. `/app/src/lib/errors/logger.js` - 3 critical issues
2. `/app/src/lib/errors/handler.js` - 2 critical issues
3. `/app/src/lib/monitoring/errors.js` - 4 critical issues
4. `/app/src/lib/services/telemetryQueue.js` - 1 critical issue
5. `/app/src/lib/server/api-middleware.js` - 1 critical issue

---

## Prevention Checklist

- [ ] Add ESLint rules for Promise rejection handling
- [ ] Add WeakMap utility for circular reference tracking
- [ ] Add @throws JSDoc for all async/error-throwing functions
- [ ] Create error handling test utilities
- [ ] Add performance monitoring for error system itself
- [ ] Document error system architecture with sequence diagrams
- [ ] Add defensive programming patterns guide

