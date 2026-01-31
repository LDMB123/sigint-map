# Missing Implementations - Quick Reference

## Files with Issues

### 1. `/projects/dmb-almanac/app/src/lib/errors/logger.js`

**Problem**: Incomplete implementation - only has console wrappers

**What's Missing** (26 failing tests):

#### Core Methods

```javascript
// MISSING: Logging methods
debug(message, context)
fatal(message, error, context)

// MISSING: Specialized logging
logAsyncError(operationName, error, context)
logApiError(endpoint, method, status, error, context)  // Signature mismatch

// MISSING: State management
clearLogs()
getLogs(limit = 50)
getErrorLogs(limit = 50)
exportLogs()
getSessionId()

// MISSING: Handler management
onError(handler)
errorHandlers = []  // Array property
```

#### Required Exports

```javascript
// MISSING: Helper functions
export function enableVerboseLogging() { }
export function getDiagnosticReport() { }
```

---

## Test File Analysis

### logger.test.js (26 failures)

**Lines that fail**:
- **Line 9**: Import error - missing `enableVerboseLogging, getDiagnosticReport`
- **Line 14**: `errorLogger.clearLogs()` - method doesn't exist
- **Line 27**: `errorLogger.debug()` - method doesn't exist
- **Line 28**: `errorLogger.getLogs()` - method doesn't exist
- **Line 43**: `errorLogger.info()` - method exists but doesn't store logs
- **Line 72**: `errorLogger.onError()` - method doesn't exist
- **Line 113**: `errorLogger.logAsyncError()` - method doesn't exist
- **Line 129**: `errorLogger.logApiError()` - signature mismatch (missing method param)
- **Line 173**: `errorLogger.getErrorLogs()` - method doesn't exist
- **Line 200**: `errorLogger.exportLogs()` - method doesn't exist
- **Line 209**: `errorLogger.getSessionId()` - method doesn't exist
- **Line 271**: `enableVerboseLogging()` - function not exported
- **Line 283**: `getDiagnosticReport()` - function not exported
- **Line 279**: `errorLogger.errorHandlers` - property doesn't exist

### error-logging-integration.test.js (9 failures)

**Lines that fail**:
- **Line 9**: Import error - missing `getDiagnosticReport`
- **Line 19**: `errorLogger.clearLogs()` - method doesn't exist
- **Line 61**: `getDiagnosticReport()` - function not exported

### breadcrumb-deduplication.test.js (5 failures → 0 if other modules working)

**Status**: Actually PASSING because it uses `addBreadcrumb()` from `monitoring/errors.js` which IS implemented

---

## Call Signature Mismatch

### logApiError() Signature Problem

**Current Implementation** (line 60 in logger.js):
```javascript
logApiError(endpoint, status, message, context) { }
```

**Test Call** (line 129 in logger.test.js):
```javascript
errorLogger.logApiError('/api/songs', 'GET', 500, new Error('Server Error'));
```

**Expected Signature**:
```javascript
logApiError(endpoint, method, status, error, context) { }
```

---

## Data Structures Needed

### ErrorLog
```typescript
{
  timestamp: Date,
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal',
  message: string,
  error?: Error,
  errorName?: string,  // error.name if error exists
  context?: Record<string, unknown>,
  stack?: string       // error.stack if error exists
}
```

### DiagnosticReport
```typescript
{
  sessionId: string,
  timestamp: Date,
  errorCount: number,    // Count of 'error' level logs only
  warningCount: number,  // Count of 'warn' level logs
  recentErrors: ErrorLog[],
  userAgent: string,     // navigator.userAgent or 'SSR'
  url: string           // window.location.href or 'SSR'
}
```

### ErrorHandlerReport
```typescript
{
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal',
  message: string,
  errorName?: string,
  error?: Error,
  context?: Record<string, unknown>,
  errorCode?: string,    // From AppError if present
  statusCode?: number,   // From AppError if present
  timestamp: Date
}
```

---

## Expected Behavior from Tests

### Log Buffer Behavior
- Max 100 logs stored in memory
- `getLogs()` returns last 50 by default
- `getLogs(n)` returns last n logs
- `clearLogs()` empties the buffer
- `exportLogs()` returns valid JSON string

### Handler Behavior
- `onError(handler)` registers async callback
- Called with ErrorHandlerReport when error/fatal logged
- Multiple handlers supported
- One handler failure doesn't prevent others firing
- `errorHandlers` array can be directly accessed/cleared

### Session Behavior
- `getSessionId()` returns consistent string across calls
- Same for each app instance lifetime
- Can be cleared by `errorLogger.errorHandlers = []` pattern

### Level Categorization
- `debug`: Only logged in dev mode, included in logs
- `info`: Logged in dev mode, included in logs
- `warn`: Always logged, included in logs
- `error`: Always logged, included in logs, fires handlers
- `fatal`: Always logged, included in logs, fires handlers

---

## Integration Points

### With monitoring/errors.js
- errorLogger.onError() called by ErrorMonitor.initialize()
- errorLogger methods used throughout ErrorMonitor class
- Compatible with addBreadcrumb() from monitoring/errors.js

### With errors/types.js (AppError)
- errorLogger accepts AppError instances
- Extracts error.code → errorCode in report
- Extracts error.statusCode → statusCode in report

---

## Priority Order for Implementation

1. **Critical** (blocking 26+ tests):
   - Implement log buffer storage
   - Implement `clearLogs()`, `getLogs()`, `getErrorLogs()`
   - Implement `onError()` and error handlers
   - Export `enableVerboseLogging()` and `getDiagnosticReport()`

2. **High** (needed for proper operation):
   - Implement `debug()`, `fatal()`
   - Implement `logAsyncError()`, fix `logApiError()` signature
   - Implement `exportLogs()`, `getSessionId()`
   - Make errorHandlers array accessible

3. **Medium** (quality/integration):
   - AppError integration for error codes
   - Verbose logging flag
   - Diagnostic aggregation
