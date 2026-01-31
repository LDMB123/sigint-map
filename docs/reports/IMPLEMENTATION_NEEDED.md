# Implementation Needed - Code Requirements

## Source File Location
`/projects/dmb-almanac/app/src/lib/errors/logger.js`

## Current State
```javascript
// 87 lines of code - MINIMAL WRAPPER
// Only has: error(), warn(), info(), log(), logApiError()
// No storage, no handlers, no exports
```

## What Must Be Added

### 1. Internal State (Add to errorLogger object)
```javascript
_logs: [],                    // Log buffer
_maxLogs: 100,               // Max entries
_sessionId: null,            // Session ID (lazy init)
_handlers: [],               // Error handlers
_verbose: false              // Verbose logging flag
```

### 2. Exported Functions (Add to module exports)
```javascript
export function enableVerboseLogging() {
    errorLogger._verbose = true;
}

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

### 3. Missing Methods on errorLogger

#### Logging Methods
```javascript
debug(message, context) {
    if (!isDev) return;
    this._addLog('debug', message, null, null, context);
},

fatal(message, error, context) {
    const err = error instanceof Error ? error : new Error(String(error));
    this._addLog('fatal', message, err, err?.name, context);
    this._notifyHandlers('fatal', message, err, context);
},
```

#### Log Management Methods
```javascript
clearLogs() {
    this._logs = [];
},

getLogs(limit = 50) {
    return this._logs.slice(-limit);
},

getErrorLogs(limit = 50) {
    return this._logs
        .filter(l => ['error', 'fatal'].includes(l.level))
        .slice(-limit);
},

exportLogs() {
    return JSON.stringify(this._logs);
},

getSessionId() {
    if (!this._sessionId) {
        this._sessionId = `sess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    return this._sessionId;
},
```

#### Handler Management
```javascript
onError(handler) {
    this._handlers.push(handler);
},

get errorHandlers() {
    return this._handlers;
},

set errorHandlers(value) {
    this._handlers = value;
},
```

#### Specialized Logging
```javascript
logAsyncError(operationName, error, context) {
    const err = error instanceof Error ? error : new Error(String(error));
    this.error(`Async error in ${operationName}`, err, context);
},
```

### 4. Fix logApiError Signature

**BEFORE**:
```javascript
logApiError(endpoint, status, message, context) {
    console.error(`[API Error] ${endpoint} ${status}: ${message}`, context);
}
```

**AFTER**:
```javascript
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

### 5. Enhancement to Existing Methods

Update error(), warn(), info() to also store in buffer:

```javascript
// Example for error() - needs storage addition
error(message, error, context) {
    const err = error instanceof Error ? error : new Error(String(error));
    this._addLog('error', message, err, err?.name, context);
    if (error) {
        console.error(message, error, context);
    } else {
        console.error(message, context);
    }
    this._notifyHandlers('error', message, err, context);
}
```

### 6. Private Helper Methods

```javascript
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
},

_notifyHandlers(level, message, error, context) {
    const report = {
        level,
        message,
        errorName: error?.name,
        error,
        context,
        errorCode: error?.code,        // For AppError
        statusCode: error?.statusCode,  // For AppError
        timestamp: new Date()
    };

    this._handlers.forEach(handler => {
        Promise.resolve()
            .then(() => handler(report))
            .catch(err => {
                console.error('Error handler failed:', err);
            });
    });
}
```

---

## Implementation Order

1. Add internal state properties (_logs, etc.)
2. Add clearLogs(), getLogs(), getSessionId()
3. Add _addLog() and _notifyHandlers() helpers
4. Update existing methods to call _addLog()
5. Add onError() and errorHandlers property
6. Add debug(), fatal(), logAsyncError()
7. Fix logApiError() signature
8. Add getErrorLogs(), exportLogs()
9. Export enableVerboseLogging(), getDiagnosticReport()
10. Test with vitest

---

## Lines of Code to Add

| Section | LOC |
|---------|-----|
| Internal state | 5 |
| clearLogs(), getLogs(), getSessionId() | 15 |
| _addLog(), _notifyHandlers() | 40 |
| debug(), fatal(), logAsyncError() | 20 |
| onError(), errorHandlers property | 10 |
| getErrorLogs(), exportLogs() | 10 |
| Fix logApiError() signature | 10 |
| Exported functions | 20 |
| Update existing methods | 20 |
| **Total** | **~160** |

Original: 87 lines
Final: ~250 lines

---

## Testing Commands

After implementation:

```bash
# Test unit tests
npm test tests/unit/errors/logger.test.js

# Test integration tests
npm test tests/integration/error-logging-integration.test.js

# Test breadcrumb deduplication
npm test tests/unit/breadcrumb-deduplication.test.js

# Expected: 40/40 passing
```

---

## Success Criteria

- [ ] All 26 tests in logger.test.js pass
- [ ] All 9 tests in error-logging-integration.test.js pass
- [ ] All 5 tests in breadcrumb-deduplication.test.js pass
- [ ] errorLogger object has all required methods
- [ ] enableVerboseLogging and getDiagnosticReport are exported
- [ ] Log buffer stores and retrieves logs correctly
- [ ] Error handlers are called with correct report object
- [ ] Session IDs are consistent
- [ ] exportLogs() returns valid JSON
- [ ] logApiError() accepts correct parameters
