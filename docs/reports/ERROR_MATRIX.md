# Runtime Error Matrix - Detailed Failure Analysis

## Overview

**Total Test Failures**: 40
- logger.test.js: 26 failures
- error-logging-integration.test.js: 9 failures
- breadcrumb-deduplication.test.js: 5 failures (likely passing when run alone)

**Root Cause**: 2 primary missing functions + 1 incomplete module

---

## Error #1: clearLogs() Not Found

### Error Type
```
TypeError: errorLogger.clearLogs is not a function
```

### Occurrence Count
**11 failures** (possibly more as cascade)

### Test Locations

| File | Line(s) | Context | Test Block |
|------|---------|---------|-----------|
| logger.test.js | 14 | beforeEach setup | Root suite setup |
| logger.test.js | 278 | beforeEach setup | getDiagnosticReport suite |
| error-logging-integration.test.js | 19 | beforeEach setup | Root suite setup |

### Code Calling it

```javascript
// logger.test.js:13-17
beforeEach(() => {
    errorLogger.clearLogs();  // ← Line 14: FAILS HERE
    errorLogger.errorHandlers = [];
    vi.clearAllMocks();
});

// logger.test.js:192
describe('clearLogs', () => {
    it('should remove all logs', () => {
        errorLogger.debug('test');
        errorLogger.info('test');
        expect(errorLogger.getLogs().length).toBe(2);

        errorLogger.clearLogs();  // ← FAILS: method doesn't exist
        expect(errorLogger.getLogs().length).toBe(0);
    });
});

// error-logging-integration.test.js:18-22
beforeEach(() => {
    errorLogger.clearLogs();  // ← Line 19: FAILS HERE
    errorLogger.errorHandlers = [];
    vi.clearAllMocks();
});
```

### Impact

- **Blocking**: Prevents test suite setup
- **Cascade**: All tests in suites fail because beforeEach fails
- **Isolation**: Tests cannot clear state between runs
- **Data**: Log buffer grows unbounded across test suite

### Expected Implementation

```javascript
clearLogs() {
    // Clear the internal log buffer
    this._logs = [];
}
```

### Dependencies

Requires implementation of:
- Internal `_logs` array
- Log storage mechanism

---

## Error #2: enableVerboseLogging() Not Found

### Error Type
```
TypeError: enableVerboseLogging is not a function
```

### Occurrence Count
**1 failure** (+ cascade)

### Test Location

| File | Line | Context | Test Block |
|------|------|---------|-----------|
| logger.test.js | 9 | Import statement | Module import |

### Code Calling it

```javascript
// logger.test.js:8-9
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { errorLogger, enableVerboseLogging, getDiagnosticReport } from '$lib/errors/logger.js';
//                      ↑ Missing export

// logger.test.js:270-273
describe('enableVerboseLogging', () => {
    it('should not throw', () => {
        expect(() => enableVerboseLogging()).not.toThrow();
        //                ↑ Function doesn't exist
    });
});
```

### Impact

- **Blocking**: Module import fails, entire test file cannot load
- **Cascade**: Prevents all tests in logger.test.js from running
- **Scope**: Only affects when explicitly importing this function

### Expected Implementation

```javascript
export function enableVerboseLogging() {
    // Set verbose logging flag
    errorLogger._verbose = true;
    // Optionally log the state change
}
```

### Dependencies

No internal dependencies, simple flag setter

---

## Error #3: getDiagnosticReport() Not Found

### Error Type
```
TypeError: getDiagnosticReport is not a function
```

### Occurrence Count
**2+ failures** (import + usage)

### Test Locations

| File | Line | Context | Test Block |
|------|------|---------|-----------|
| logger.test.js | 9 | Import statement | Module import |
| logger.test.js | 283 | Function call | getDiagnosticReport suite |
| error-logging-integration.test.js | 9 | Import statement | Module import |
| error-logging-integration.test.js | 61, 93 | Function calls | Integration tests |

### Code Calling it

```javascript
// logger.test.js:8-9
import { errorLogger, enableVerboseLogging, getDiagnosticReport } from '$lib/errors/logger.js';
//                                          ↑ Missing export

// logger.test.js:276-303
describe('getDiagnosticReport', () => {
    beforeEach(() => {
        errorLogger.clearLogs();
        errorLogger.errorHandlers = [];
    });

    it('should return a diagnostic object', () => {
        const report = getDiagnosticReport();  // ← Line 283: FAILS
        expect(report).toHaveProperty('sessionId');
        expect(report).toHaveProperty('timestamp');
        expect(report).toHaveProperty('errorCount');
        expect(report).toHaveProperty('warningCount');
        expect(report).toHaveProperty('recentErrors');
        expect(report).toHaveProperty('userAgent');
        expect(report).toHaveProperty('url');
    });

    it('should count errors and warnings correctly', () => {
        errorLogger.error('err', new Error('e'));
        errorLogger.warn('w');
        errorLogger.info('i');
        errorLogger.error('err2', new Error('e2'));

        const report = getDiagnosticReport();  // ← FAILS
        expect(report.errorCount).toBe(2);  // Only 'error' level
        expect(report.warningCount).toBe(1);
    });
});

// error-logging-integration.test.js:53-66
it('should capture multiple error types and aggregate in diagnostics', () => {
    errorLogger.info('App started');
    errorLogger.warn('Slow query detected');
    errorLogger.error('Network timeout', new NetworkError('Fetch failed'));
    errorLogger.error('Database error', new AppError('Index missing', 'DB_ERROR', 500));
    errorLogger.debug('Retrying...');

    const report = getDiagnosticReport();  // ← Line 61: FAILS
    expect(report.errorCount).toBe(2);
    expect(report.warningCount).toBe(1);
    expect(report.recentErrors.length).toBe(2);
    expect(report.recentErrors[0].level).toBe('error');
});
```

### Impact

- **Blocking**: Module import fails
- **Cascade**: Prevents all tests in affected files
- **Scope**: Needed for diagnostic reporting in 2 test files

### Expected Implementation

```javascript
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

### Dependencies

Requires:
- `errorLogger.getLogs()`
- `errorLogger.getSessionId()`
- Log buffer with level tracking

---

## Secondary Errors: Incomplete errorLogger

### Missing Method: debug()

**Error**: `TypeError: errorLogger.debug is not a function`

**Locations**: Lines 27, 167, 224, 378 in logger.test.js

**Expected Signature**:
```javascript
debug(message, context) {
    // Log to console.debug in dev mode
    // Store in log buffer with level: 'debug'
}
```

---

### Missing Method: fatal()

**Error**: `TypeError: errorLogger.fatal is not a function`

**Locations**: Lines 90, 99, 171 in logger.test.js

**Expected Signature**:
```javascript
fatal(message, error, context) {
    // Log fatal error
    // Store in log buffer with level: 'fatal'
    // Fire error handlers
}
```

---

### Missing Method: getLogs()

**Error**: `TypeError: errorLogger.getLogs is not a function`

**Locations**: Lines 28, 44, 48, 114, 154, etc. in logger.test.js

**Expected Signature**:
```javascript
getLogs(limit = 50) {
    // Return last N logs (most recent first)
    // Default limit is 50
}
```

---

### Missing Method: getErrorLogs()

**Error**: `TypeError: errorLogger.getErrorLogs is not a function`

**Locations**: Lines 173, 182 in logger.test.js

**Expected Signature**:
```javascript
getErrorLogs(limit = 50) {
    // Return only 'error' and 'fatal' level logs
    // Default limit is 50
}
```

---

### Missing Method: logAsyncError()

**Error**: `TypeError: errorLogger.logAsyncError is not a function`

**Locations**: Lines 113, 85 in logger.test.js

**Expected Signature**:
```javascript
logAsyncError(operationName, error, context) {
    // Log async operation failure
    // Wrap non-Error objects in Error
    // Message should include operation name
}
```

---

### Missing Method: exportLogs()

**Error**: `TypeError: errorLogger.exportLogs is not a function`

**Locations**: Line 200 in logger.test.js

**Expected Signature**:
```javascript
exportLogs() {
    // Return valid JSON string of all logs
    // Must be parseable: JSON.parse(exportLogs())
}
```

---

### Missing Method: getSessionId()

**Error**: `TypeError: errorLogger.getSessionId is not a function`

**Locations**: Lines 209, 215 in logger.test.js

**Expected Signature**:
```javascript
getSessionId() {
    // Return consistent session ID for this instance
    // Generated once at initialization
    // Same across multiple calls
}
```

---

### Missing Method: onError()

**Error**: `TypeError: errorLogger.onError is not a function`

**Locations**: Lines 72, 97, 237, 252, etc. in logger.test.js

**Expected Signature**:
```javascript
onError(handler) {
    // Register async error handler callback
    // Called when error() or fatal() is invoked
    // Receives ErrorHandlerReport object
    // handler: (report) => Promise<void>
}
```

---

### Missing Property: errorHandlers

**Error**: `TypeError: Cannot set property errorHandlers of [object Object]`

**Locations**: Lines 15, 20, 279, 304 in logger.test.js

**Expected**:
```javascript
errorHandlers: []  // Array of handler functions
// Must be readable and assignable
```

---

### Signature Mismatch: logApiError()

**Error**: `TypeError: log is not a function` (in call to errorLogger.logApiError)

**Current Signature** (line 60 logger.js):
```javascript
logApiError(endpoint, status, message, context) { }
```

**Test Call** (line 129 logger.test.js):
```javascript
errorLogger.logApiError('/api/songs', 'GET', 500, new Error('Server Error'));
```

**Expected Signature**:
```javascript
logApiError(endpoint, method, status, error, context) {
    // Log with format: "/api/songs GET 500: Server Error"
    // Store context with { endpoint, method, status }
}
```

---

## Cascade Effect Analysis

### Import-Time Failures
Files that fail at import:
1. logger.test.js - Missing `enableVerboseLogging`, `getDiagnosticReport`
2. error-logging-integration.test.js - Missing `getDiagnosticReport`

### Suite Setup Failures
Tests that fail in beforeEach:
1. logger.test.js - All beforeEach blocks call `errorLogger.clearLogs()`
2. error-logging-integration.test.js - All beforeEach blocks call `errorLogger.clearLogs()`

**Impact**: Once beforeEach fails, entire test suite fails:
- 26 tests in logger.test.js
- 9 tests in error-logging-integration.test.js

### Individual Test Failures
Tests that would fail if setup passed:
- Any test calling missing methods (debug, fatal, getLogs, etc.)
- Most tests in logger.test.js if setup issues were fixed

---

## Vitest Test Execution Flow

```
Test Suite Load
    ↓
[FAIL] Import errorLogger, enableVerboseLogging, getDiagnosticReport
    ↓ (if getDiagnosticReport not found)
[FAIL] Cannot load logger.test.js
    ↓ (if module loads)
Run beforeEach()
    ↓
[FAIL] errorLogger.clearLogs() not found
    ↓
[SKIP] All tests in suite (cascade)
    ↓
Run afterEach()
    ↓
[SKIP] Cleanup
```

---

## Error Prevention Checklist

- [ ] Implement `clearLogs()` method
- [ ] Implement `getLogs(limit)` method
- [ ] Implement `getErrorLogs(limit)` method
- [ ] Implement `debug()` method
- [ ] Implement `fatal()` method
- [ ] Implement `logAsyncError()` method
- [ ] Fix `logApiError()` signature
- [ ] Implement `exportLogs()` method
- [ ] Implement `getSessionId()` method
- [ ] Implement `onError()` method
- [ ] Make `errorHandlers` array accessible
- [ ] Export `enableVerboseLogging` function
- [ ] Export `getDiagnosticReport` function
- [ ] Create log buffer storage (max 100)
- [ ] Implement error handler notification
- [ ] Implement AppError integration
- [ ] Test with vitest in jsdom environment
- [ ] Validate JSON export format
- [ ] Verify session ID consistency
- [ ] Test async handler execution
