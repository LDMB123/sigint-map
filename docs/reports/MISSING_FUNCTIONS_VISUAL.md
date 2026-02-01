# Missing Functions - Visual Reference

## Quick Lookup Table

### Missing Methods on errorLogger Object

| Method | Current | Expected | Priority | Tests Failed |
|--------|---------|----------|----------|--------------|
| `debug(msg, ctx)` | ❌ Missing | ✅ Required | 🔴 Critical | 5+ |
| `fatal(msg, err, ctx)` | ❌ Missing | ✅ Required | 🔴 Critical | 4+ |
| `clearLogs()` | ❌ Missing | ✅ Required | 🔴 Critical | 11+ |
| `getLogs(limit)` | ❌ Missing | ✅ Required | 🔴 Critical | 10+ |
| `getErrorLogs(limit)` | ❌ Missing | ✅ Required | 🔴 Critical | 3+ |
| `logAsyncError(op, err, ctx)` | ❌ Missing | ✅ Required | 🔴 Critical | 2+ |
| `logApiError(ep, method, status, err, ctx)` | ⚠️ Wrong signature | ✅ Needs fix | 🔴 Critical | 2+ |
| `exportLogs()` | ❌ Missing | ✅ Required | 🟡 High | 1+ |
| `getSessionId()` | ❌ Missing | ✅ Required | 🟡 High | 2+ |
| `onError(handler)` | ❌ Missing | ✅ Required | 🟡 High | 8+ |
| `errorHandlers` | ❌ Missing | ✅ Array property | 🟡 High | 3+ |
| `error(msg, err, ctx)` | ✅ Exists | ⚠️ Needs enhancement | 🟢 Medium | 0 |
| `warn(msg, err, ctx)` | ✅ Exists | ⚠️ Needs enhancement | 🟢 Medium | 0 |
| `info(msg, ctx)` | ✅ Exists | ⚠️ Needs enhancement | 🟢 Medium | 0 |
| `log(level, msg, ctx)` | ✅ Exists | ⚠️ Needs enhancement | 🟢 Medium | 0 |

### Missing Module Exports

| Function | Current | Expected | Priority | Tests Failed |
|----------|---------|----------|----------|--------------|
| `enableVerboseLogging()` | ❌ Missing | ✅ Required | 🔴 Critical | 1 (blocks import) |
| `getDiagnosticReport()` | ❌ Missing | ✅ Required | 🔴 Critical | 2+ (blocks import) |

---

## Visualization: Implementation Scope

```
Current errorLogger implementation:
┌─────────────────────────────────────────┐
│ errorLogger (minimal wrapper)            │
├─────────────────────────────────────────┤
│ ✅ error(message, error, context)       │
│ ✅ warn(message, error, context)        │
│ ✅ info(message, context)               │
│ ✅ log(level, message, context)         │
│ ✅ logApiError(endpoint, status, ...)   │ ⚠️ Wrong signature
├─────────────────────────────────────────┤
│ 5 methods, no state, no handlers        │
└─────────────────────────────────────────┘

Expected errorLogger implementation:
┌─────────────────────────────────────────────────────────┐
│ errorLogger (full error logging system)                 │
├─────────────────────────────────────────────────────────┤
│ LOGGING METHODS:                                        │
│   ✅ error(message, error, context)                    │
│   ✅ warn(message, error, context)                     │
│   ✅ info(message, context)                            │
│   ✅ log(level, message, context)                      │
│   ❌ debug(message, context)          ← ADD            │
│   ❌ fatal(message, error, context)   ← ADD            │
│                                                         │
│ SPECIALIZED LOGGING:                                    │
│   ❌ logAsyncError(op, error, ctx)    ← ADD            │
│   ⚠️ logApiError(endpoint, method, status, error, ctx) │
│      ↑ FIX SIGNATURE                                   │
│                                                         │
│ LOG MANAGEMENT:                                         │
│   ❌ clearLogs()                       ← ADD            │
│   ❌ getLogs(limit)                    ← ADD            │
│   ❌ getErrorLogs(limit)               ← ADD            │
│   ❌ exportLogs()                      ← ADD            │
│   ❌ getSessionId()                    ← ADD            │
│                                                         │
│ HANDLER MANAGEMENT:                                     │
│   ❌ onError(handler)                  ← ADD            │
│   ❌ errorHandlers: []                 ← ADD (property) │
│                                                         │
│ INTERNAL STATE:                                         │
│   ❌ _logs: []                         ← ADD            │
│   ❌ _maxLogs: 100                     ← ADD            │
│   ❌ _sessionId: string                ← ADD            │
│   ❌ _handlers: []                     ← ADD            │
│   ❌ _verbose: boolean                 ← ADD            │
│                                                         │
│ 15+ methods + 5+ properties, full feature set          │
└─────────────────────────────────────────────────────────┘
```

---

## Dependency Tree

```
Module: logger.js
├── EXPORTS (missing)
│   ├── errorLogger object
│   │   ├── ✅ error()
│   │   ├── ✅ warn()
│   │   ├── ✅ info()
│   │   ├── ✅ log()
│   │   ├── ✅ logApiError() [signature wrong]
│   │   ├── ❌ debug()          [MUST ADD]
│   │   ├── ❌ fatal()          [MUST ADD]
│   │   ├── ❌ clearLogs()      [MUST ADD - BLOCKS 11+ TESTS]
│   │   ├── ❌ getLogs()        [MUST ADD - BLOCKS 10+ TESTS]
│   │   ├── ❌ getErrorLogs()   [MUST ADD]
│   │   ├── ❌ logAsyncError()  [MUST ADD]
│   │   ├── ❌ exportLogs()     [MUST ADD]
│   │   ├── ❌ getSessionId()   [MUST ADD]
│   │   ├── ❌ onError()        [MUST ADD - BLOCKS 8+ TESTS]
│   │   └── ❌ errorHandlers    [MUST ADD - BLOCKS 3+ TESTS]
│   ├── ❌ enableVerboseLogging() [MUST ADD - BLOCKS IMPORT]
│   └── ❌ getDiagnosticReport()  [MUST ADD - BLOCKS IMPORT]
│
├── IMPORTS (used internally)
│   ├── ✅ import.meta.env.DEV [already using]
│   └── (may need to add for monitoring)
│
└── INTEGRATION POINTS
    ├── Used by: monitoring/errors.js
    │   └── errorLogger.onError() called during initialization
    │   └── errorLogger methods used for tracking
    └── Used by: tests
        ├── All 26 tests in logger.test.js
        ├── All 9 tests in error-logging-integration.test.js
        └── Indirectly: breadcrumb-deduplication.test.js
```

---

## Test Failure Cascade Map

```
logger.test.js (26 tests)
│
├─ Import Phase: "enableVerboseLogging is not a function"
│  └─ FAIL: Cannot load module
│
├─ Import Phase: "getDiagnosticReport is not a function"
│  └─ FAIL: Cannot load module
│
└─ [IF imports succeed]
   │
   ├─ beforeEach: errorLogger.clearLogs()
   │  └─ TypeError: clearLogs is not a function
   │     └─ FAIL: All 26 tests
   │
   └─ [IF clearLogs exists]
      │
      ├─ Test: debug() - "debug is not a function"
      ├─ Test: getLogs() - "getLogs is not a function"
      ├─ Test: fatal() - "fatal is not a function"
      ├─ Test: getErrorLogs() - "getErrorLogs is not a function"
      ├─ Test: logAsyncError() - "logAsyncError is not a function"
      ├─ Test: logApiError() - signature mismatch
      ├─ Test: exportLogs() - "exportLogs is not a function"
      ├─ Test: getSessionId() - "getSessionId is not a function"
      ├─ Test: onError() - "onError is not a function"
      └─ Test: enableVerboseLogging() - "not a function"

error-logging-integration.test.js (9 tests)
│
├─ Import Phase: "getDiagnosticReport is not a function"
│  └─ FAIL: Cannot load module
│
└─ [IF import succeeds]
   │
   ├─ beforeEach: errorLogger.clearLogs()
   │  └─ TypeError: clearLogs is not a function
   │     └─ FAIL: All 9 tests
   │
   └─ [IF clearLogs exists]
      └─ All tests that call getDiagnosticReport() still fail
```

---

## Implementation Checklist (Ordered by Impact)

### Phase 1: Unblock Imports (Blocking: 26 + 9 = 35 tests)

```javascript
// [ ] Add export
export function enableVerboseLogging() {
    errorLogger._verbose = true;
}

// [ ] Add export
export function getDiagnosticReport() {
    const logs = errorLogger.getLogs();
    return {
        sessionId: errorLogger.getSessionId(),
        timestamp: new Date(),
        errorCount: logs.filter(l => l.level === 'error').length,
        warningCount: logs.filter(l => l.level === 'warn').length,
        recentErrors: logs.filter(l => ['error', 'fatal'].includes(l.level)),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR',
        url: typeof window !== 'undefined' ? window.location.href : 'SSR'
    };
}
```

### Phase 2: Unblock beforeEach (Blocking: 26 + 9 = 35 tests)

```javascript
// [ ] Add to errorLogger object
clearLogs() {
    this._logs = [];
},

// [ ] Initialize internal state
const errorLogger = {
    _logs: [],
    _maxLogs: 100,
    _sessionId: null,
    _handlers: [],
    _verbose: false,

    // ... existing methods ...

    // [ ] Add missing method
    getLogs(limit = 50) {
        return this._logs.slice(-limit);
    },

    // [ ] Add missing method
    getSessionId() {
        if (!this._sessionId) {
            this._sessionId = `sess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        return this._sessionId;
    },

    // [ ] Make array accessible
    get errorHandlers() {
        return this._handlers;
    },
    set errorHandlers(value) {
        this._handlers = value;
    }
};
```

### Phase 3: Implement Logging Methods (Blocking: ~15 individual tests)

```javascript
// [ ] Add to errorLogger
debug(message, context) {
    if (!isDev) return;
    this._addLog('debug', message, null, null, context);
},

// [ ] Add to errorLogger
fatal(message, error, context) {
    this._addLog('fatal', message, error, error?.name, context);
    this._notifyHandlers('fatal', message, error, context);
},

// [ ] Add to errorLogger
logAsyncError(operationName, error, context) {
    const err = error instanceof Error ? error : new Error(String(error));
    this.error(`Async error in ${operationName}`, err, context);
},

// [ ] Fix signature in errorLogger
logApiError(endpoint, method, status, error, context) {
    const err = error instanceof Error ? error : new Error(String(error));
    const message = `[API Error] ${endpoint} ${method} ${status}`;
    this.error(message, err, {
        ...context,
        endpoint,
        method,
        status
    });
}
```

### Phase 4: Implement Handler System (Blocking: 8+ tests)

```javascript
// [ ] Add to errorLogger
onError(handler) {
    this._handlers.push(handler);
},

// [ ] Add to errorLogger (private)
_notifyHandlers(level, message, error, context) {
    const report = {
        level,
        message,
        errorName: error?.name,
        error,
        context,
        errorCode: error?.code,
        statusCode: error?.statusCode,
        timestamp: new Date()
    };

    this._handlers.forEach(handler => {
        Promise.resolve().then(() => handler(report)).catch(err => {
            console.error('Error handler failed:', err);
        });
    });
}
```

### Phase 5: Complete Implementation (Nice to have)

```javascript
// [ ] Add to errorLogger
getErrorLogs(limit = 50) {
    return this._logs
        .filter(l => ['error', 'fatal'].includes(l.level))
        .slice(-limit);
},

// [ ] Add to errorLogger
exportLogs() {
    return JSON.stringify(this._logs);
},

// [ ] Add to errorLogger (private)
_addLog(level, message, error, errorName, context) {
    const log = {
        timestamp: new Date(),
        level,
        message,
        error,
        errorName: errorName || error?.name,
        context
    };

    this._logs.push(log);

    // Keep buffer under maxLogs
    if (this._logs.length > this._maxLogs) {
        this._logs.shift();
    }

    if (['error', 'fatal'].includes(level)) {
        this._notifyHandlers(level, message, error, context);
    }
}
```

---

## Test Run Predictions

### BEFORE fixes:
```
$ npm test
✖ logger.test.js (import error)
  Cannot import enableVerboseLogging, getDiagnosticReport

✖ error-logging-integration.test.js (import error)
  Cannot import getDiagnosticReport

✖ breadcrumb-deduplication.test.js (import error - cascades from logger.js)
  Cannot resolve imports

FAIL: 40 tests (all fail due to setup/import errors)
```

### AFTER Phase 1 & 2:
```
$ npm test
✓ logger.test.js (35/26 tests still fail individually)
✓ error-logging-integration.test.js (0/9 tests still fail individually)
✓ breadcrumb-deduplication.test.js (0/5 tests - should pass)

FAIL: 26 tests (individual method missing errors)
```

### AFTER Phase 3 & 4:
```
$ npm test
✓ logger.test.js (26/26 pass)
✓ error-logging-integration.test.js (9/9 pass)
✓ breadcrumb-deduplication.test.js (5/5 pass)

PASS: 40 tests
```

---

## Size Impact

| Component | LOC Added | Complexity |
|-----------|-----------|-----------|
| Log buffer storage | ~20 | Simple |
| Missing methods (7) | ~80 | Medium |
| Handler system | ~30 | Medium |
| Helper exports (2) | ~20 | Simple |
| Internal state | ~10 | Simple |
| **Total** | **~160** | **Medium** |

Original file: 87 lines
Expanded file: ~250 lines (188% growth, still reasonable)

---

## Reference: Where Each Function is Used

### clearLogs()
- logger.test.js:14 (beforeEach)
- logger.test.js:192 (test)
- logger.test.js:278 (getDiagnosticReport beforeEach)
- error-logging-integration.test.js:19 (beforeEach)

### enableVerboseLogging()
- logger.test.js:9 (import)
- logger.test.js:271 (test call)

### getDiagnosticReport()
- logger.test.js:9 (import)
- logger.test.js:283 (test call)
- error-logging-integration.test.js:9 (import)
- error-logging-integration.test.js:61 (test call)
- error-logging-integration.test.js:93 (test call)

### getLogs()
- logger.test.js:28, 44, 48, 64, 114, 117, 121, 154, 160, 190, 227
- error-logging-integration.test.js:48, 75, 117

### Other methods: Similar high frequency usage in tests
