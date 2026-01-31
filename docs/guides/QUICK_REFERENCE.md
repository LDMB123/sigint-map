# Quick Reference - Missing Functions

## TL;DR

**40 tests failing** because `/projects/dmb-almanac/app/src/lib/errors/logger.js` is missing:
1. Two exported functions
2. Eleven methods on errorLogger object
3. One property (errorHandlers)
4. One fixed signature

---

## Missing Exports

```javascript
// ADD TO logger.js
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

---

## Missing Methods on errorLogger

```javascript
// Each method needs to be added to the errorLogger object

debug(message, context) {
	// Log debug message, store in buffer
}

fatal(message, error, context) {
	// Log fatal error, store in buffer, call handlers
}

clearLogs() {
	// Clear log buffer
}

getLogs(limit = 50) {
	// Return last N logs
}

getErrorLogs(limit = 50) {
	// Return only 'error' and 'fatal' level logs
}

logAsyncError(operationName, error, context) {
	// Log async error with operation name
}

exportLogs() {
	// Return JSON string of all logs
}

getSessionId() {
	// Return unique session ID
}

onError(handler) {
	// Register handler: (report) => Promise<void>
}

logApiError(endpoint, method, status, error, context) {
	// FIX SIGNATURE: Add 'method' parameter!
	// Currently: logApiError(endpoint, status, message, context)
	// Needs:    logApiError(endpoint, method, status, error, context)
}

get errorHandlers() {
	return this._handlers;
}

set errorHandlers(value) {
	this._handlers = value;
}
```

---

## Test Impact

| Missing | Tests Blocked | Severity |
|---------|---------------|----------|
| enableVerboseLogging | 26 (import fails) | CRITICAL |
| getDiagnosticReport | 35 (import fails) | CRITICAL |
| clearLogs | 35 (setup fails) | CRITICAL |
| getLogs | 10 | HIGH |
| onError | 8 | HIGH |
| All others | 40 (collectively) | HIGH |

---

## Test Files

```
/projects/dmb-almanac/app/tests/unit/errors/logger.test.js
  ├─ 26 tests
  ├─ Lines 14, 278: Call errorLogger.clearLogs()
  ├─ Line 9: Import enableVerboseLogging, getDiagnosticReport
  └─ All tests need: debug, fatal, getLogs, getErrorLogs, etc.

/projects/dmb-almanac/app/tests/integration/error-logging-integration.test.js
  ├─ 9 tests
  ├─ Line 19: Call errorLogger.clearLogs()
  ├─ Line 9: Import getDiagnosticReport
  └─ Lines 61, 93: Call getDiagnosticReport()

/projects/dmb-almanac/app/tests/unit/breadcrumb-deduplication.test.js
  ├─ 5 tests
  └─ Uses addBreadcrumb() from monitoring/errors.js (works fine)
```

---

## Implementation Checklist

```
Core Storage:
  [ ] Add _logs: [] array
  [ ] Add _maxLogs: 100
  [ ] Add _sessionId: string
  [ ] Add _handlers: []
  [ ] Add _verbose: boolean

Exports:
  [ ] enableVerboseLogging()
  [ ] getDiagnosticReport()

Methods:
  [ ] clearLogs()
  [ ] getLogs(limit)
  [ ] getErrorLogs(limit)
  [ ] getSessionId()
  [ ] onError(handler)
  [ ] debug(message, context)
  [ ] fatal(message, error, context)
  [ ] logAsyncError(operationName, error, context)
  [ ] exportLogs()
  [ ] Fix logApiError signature

Properties:
  [ ] errorHandlers (getter/setter for _handlers)

Internal Helpers:
  [ ] _addLog(level, message, error, context)
  [ ] _notifyHandlers(level, message, error, context)
```

---

## Key Data Types

**ErrorLog** (stored in buffer):
```typescript
{
  timestamp: Date,
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal',
  message: string,
  error?: Error,
  errorName?: string,
  context?: Record<string, unknown>
}
```

**DiagnosticReport** (returned by getDiagnosticReport):
```typescript
{
  sessionId: string,
  timestamp: Date,
  errorCount: number,
  warningCount: number,
  recentErrors: ErrorLog[],
  userAgent: string,
  url: string
}
```

---

## Source File

**Location**: `/projects/dmb-almanac/app/src/lib/errors/logger.js`

**Current**: 87 lines (minimal wrapper)
**Required**: ~250 lines (full implementation)
**Gap**: ~160 lines to add

---

## Run Tests

```bash
cd /projects/dmb-almanac/app
npm test tests/unit/errors/logger.test.js
npm test tests/integration/error-logging-integration.test.js
npm test tests/unit/breadcrumb-deduplication.test.js
npm test  # Run all tests
```

---

## Priority Order

1. **First**: Add the 2 exports (unblocks imports)
2. **Second**: Add clearLogs(), getLogs(), getSessionId() + _logs array (unblocks setup)
3. **Third**: Add debug(), fatal(), onError() (fixes major test groups)
4. **Fourth**: Add remaining methods (fixes individual tests)

---

## Common Test Patterns

```javascript
// Before each test
beforeEach(() => {
	errorLogger.clearLogs();  // ← MUST EXIST
	errorLogger.errorHandlers = [];  // ← MUST BE ACCESSIBLE
});

// Logging
errorLogger.debug('message', { context });
errorLogger.info('message', { context });
errorLogger.warn('message', error, { context });
errorLogger.error('message', error, { context });
errorLogger.fatal('message', error, { context });

// Getting logs
const logs = errorLogger.getLogs();  // Last 50
const logs = errorLogger.getLogs(5);  // Last 5
const errorLogs = errorLogger.getErrorLogs();  // Only error/fatal

// Handlers
const handler = vi.fn();
errorLogger.onError(handler);
errorLogger.error('test', new Error('fail'));
// handler called after brief delay

// Diagnostic
const report = getDiagnosticReport();
console.log(report.errorCount, report.warningCount);

// Export
const json = errorLogger.exportLogs();
const parsed = JSON.parse(json);
```

---

## Notes

- All methods must support async handler execution
- Log buffer limited to 100 entries max
- Session ID must be consistent within instance
- errorHandlers array must be directly readable/writable
- `debug()` only logs in dev mode but stores in buffer anyway
- getDiagnosticReport counts 'error' level only (not 'fatal')
- Tests run in jsdom environment (@vitest-environment jsdom)
