# Runtime Error Analysis: Missing Function Implementations

## Error Summary

**Status**: 40 total test failures across 3 test files
- `logger.test.js`: 26 failures
- `error-logging-integration.test.js`: 9 failures
- `breadcrumb-deduplication.test.js`: 5 failures

**Root Cause**: Tests import functions and call methods that do not exist in the source modules.

---

## Critical Findings

### 1. errorLogger.clearLogs() - NOT IMPLEMENTED

**Error**: `TypeError: errorLogger.clearLogs is not a function`

**Files Affected**:
- `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/tests/unit/errors/logger.test.js` (line 14, 278)
- `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/tests/integration/error-logging-integration.test.js` (line 19)

**Source Module**: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/errors/logger.js`

**Current Implementation**: Simple pass-through wrapper with only these methods:
- `error(message, error, context)`
- `warn(message, error, context)`
- `info(message, context)`
- `logApiError(endpoint, status, message, context)`
- `log(level, message, context)`

**Missing Methods Expected by Tests**:
```typescript
// Lines 14, 19, 278 call this:
errorLogger.clearLogs();

// Lines 28, 44, 65, etc. call this:
const logs = errorLogger.getLogs();
const logs = errorLogger.getLogs(5);

// Line 173 calls:
const errorLogs = errorLogger.getErrorLogs();

// Line 192 calls:
errorLogger.clearLogs();

// Line 200 calls:
const json = errorLogger.exportLogs();

// Line 209 calls:
const sessionId = errorLogger.getSessionId();

// Line 15, 279, 304 access:
errorLogger.errorHandlers = [];

// Line 72 calls:
errorLogger.onError(handler);
```

---

### 2. enableVerboseLogging() - NOT EXPORTED

**Error**: `TypeError: enableVerboseLogging is not a function`

**File Affected**:
- `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/tests/unit/errors/logger.test.js` (lines 9, 270-273)

**Source Module**: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/errors/logger.js`

**Current**: No export statement, function doesn't exist

**Test Expectation** (line 270-273):
```javascript
describe('enableVerboseLogging', () => {
	it('should not throw', () => {
		expect(() => enableVerboseLogging()).not.toThrow();
	});
});
```

---

### 3. getDiagnosticReport() - NOT EXPORTED

**Error**: `TypeError: getDiagnosticReport is not a function`

**File Affected**:
- `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/tests/unit/errors/logger.test.js` (lines 9, 283)
- `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/tests/integration/error-logging-integration.test.js` (line 9, 61)

**Source Module**: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/errors/logger.js`

**Current**: No export statement, function doesn't exist

**Test Expectation** (lines 283-303):
```javascript
describe('getDiagnosticReport', () => {
	it('should return a diagnostic object', () => {
		const report = getDiagnosticReport();
		expect(report).toHaveProperty('sessionId');
		expect(report).toHaveProperty('timestamp');
		expect(report).toHaveProperty('errorCount');
		expect(report).toHaveProperty('warningCount');
		expect(report).toHaveProperty('recentErrors');
		expect(report).toHaveProperty('userAgent');
		expect(report).toHaveProperty('url');
	});
});
```

---

## Missing Implementation Details

### errorLogger Object Methods Required

Based on test analysis, the `errorLogger` export needs:

```typescript
interface ErrorLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  error?: Error;
  errorName?: string;
  context?: Record<string, unknown>;
}

interface DiagnosticReport {
  sessionId: string;
  timestamp: Date;
  errorCount: number;
  warningCount: number;
  recentErrors: ErrorLog[];
  userAgent: string;
  url: string;
}

interface ErrorHandlerReport {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  errorName?: string;
  error?: Error;
  context?: Record<string, unknown>;
  errorCode?: string;        // For AppError
  statusCode?: number;       // For AppError
  timestamp: Date;
}

export const errorLogger = {
  // === EXISTING (INCOMPLETE) ===
  error(message: string, error?: Error, context?: Record<string, unknown>): void;
  warn(message: string, error?: Error, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  log(level: string, message: string, context?: Record<string, unknown>): void;
  logApiError(endpoint: string, status: number, message: string, context?: Record<string, unknown>): void;

  // === MISSING - REQUIRED METHODS ===
  debug(message: string, context?: Record<string, unknown>): void;
  fatal(message: string, error?: Error, context?: Record<string, unknown>): void;

  // === MISSING - SPECIALIZED LOGGING ===
  logAsyncError(operationName: string, error: unknown, context?: Record<string, unknown>): void;
  logApiError(endpoint: string, method: string, status: number, error: unknown, context?: Record<string, unknown>): void;

  // === MISSING - LOG MANAGEMENT ===
  getLogs(limit?: number): ErrorLog[];
  getErrorLogs(limit?: number): ErrorLog[];
  clearLogs(): void;
  exportLogs(): string; // JSON string
  getSessionId(): string;

  // === MISSING - ERROR HANDLERS ===
  onError(handler: (report: ErrorHandlerReport) => Promise<void>): void;
  errorHandlers: Array<(report: ErrorHandlerReport) => Promise<void>>;
};
```

### Helper Functions Required

```typescript
export function enableVerboseLogging(): void {
  // Enable verbose/debug logging mode
  // Currently just needs to exist and not throw
}

export function getDiagnosticReport(): DiagnosticReport {
  // Return object with:
  // - sessionId: string
  // - timestamp: Date
  // - errorCount: number (count of 'error' level logs)
  // - warningCount: number (count of 'warn' level logs)
  // - recentErrors: ErrorLog[] (last N errors)
  // - userAgent: string (navigator.userAgent or 'SSR')
  // - url: string (window.location.href or 'SSR')
}
```

---

## Impact Analysis

### Test Coverage Breakdown

| File | Tests | Failures | Root Cause |
|------|-------|----------|-----------|
| `logger.test.js` | 26 | 26 | Missing `clearLogs()`, `enableVerboseLogging()`, `getDiagnosticReport()`, and ErrorLogger full implementation |
| `error-logging-integration.test.js` | 9 | 9 | Missing `clearLogs()` and `getDiagnosticReport()` |
| `breadcrumb-deduplication.test.js` | 5 | 0 | Working (uses `addBreadcrumb()` from `monitoring/errors.js` which IS implemented) |

---

## Architecture Mismatch

### Current State

**File**: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/errors/logger.js`

Contains a **minimal wrapper** around `console` methods:
- Only wraps console calls
- No log storage/buffering
- No error handlers
- No diagnostic capabilities
- No session management

### Expected State (from tests)

Tests expect a **full-featured error logging system** with:
- In-memory log buffer (capped at maxLogs=100)
- Error categorization (debug, info, warn, error, fatal)
- Error handler callbacks
- Diagnostic report generation
- Session ID tracking
- Async error handling
- AppError integration with error codes and status codes

### Architecture Diagram

```
Current Implementation:
┌──────────────────┐
│ errorLogger      │
│ (simple wrapper) │
└──────────────────┘
         │
         └─→ console.error/warn/info

Expected Implementation:
┌──────────────────┐
│ errorLogger      │
│ (full system)    │
└──────────────────┘
    ├─→ Memory Buffer (log storage)
    ├─→ Error Handlers (callbacks)
    ├─→ Session Manager (sessionId)
    ├─→ Diagnostics (reports)
    └─→ AppError Integration

Also Expected (as exports):
├─ enableVerboseLogging()
└─ getDiagnosticReport()
```

---

## Stack Trace Patterns

### Pattern 1: clearLogs() failures

```
TypeError: errorLogger.clearLogs is not a function
    at beforeEach (logger.test.js:14:17)
    at async runTest (vitest)
```

**Locations**:
- Setup phase (beforeEach hooks)
- Teardown phase (afterEach hooks)

**Impact**: Prevents test isolation - logs from previous tests contaminate new tests

### Pattern 2: enableVerboseLogging() failures

```
TypeError: enableVerboseLogging is not a function
    at Object.<anonymous> (logger.test.js:270:3)
    at async runTest (vitest)
```

**Locations**:
- Direct function call in test suite
- Import fails at module load time

### Pattern 3: getDiagnosticReport() failures

```
TypeError: getDiagnosticReport is not a function
    at it (logger.test.js:283:5)
    at async runTest (vitest)
```

**Locations**:
- Called inside test cases
- Used in integration tests for diagnostics validation

---

## Reproduction Steps

1. Open test file: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/tests/unit/errors/logger.test.js`
2. Note imports (line 9): `errorLogger, enableVerboseLogging, getDiagnosticReport`
3. Run tests: `npm test tests/unit/errors/logger.test.js`
4. Observe failures at line 14 (beforeEach): `errorLogger.clearLogs is not a function`
5. Observe failures at line 270: `enableVerboseLogging is not a function`
6. Observe failures at line 283: `getDiagnosticReport is not a function`

---

## Prevention Recommendations

### Immediate (Fix Missing Functions)

1. **Implement full ErrorLogger class** with:
   - Log buffer (in-memory array, max 100 entries)
   - Log level categorization
   - Error handler management
   - Session ID generation

2. **Export missing functions**:
   - `enableVerboseLogging()` - Set a verbose flag
   - `getDiagnosticReport()` - Aggregate log statistics

3. **Implement ErrorLog.addBreadcrumb()** integration with monitoring/errors.js

### Long-term (Architecture)

1. **Create comprehensive documentation** mapping test expectations to implementation
2. **Add TypeScript or JSDoc type definitions** for ErrorLog interface
3. **Implement error reporting pipeline** integration (Sentry/Bugsnag)
4. **Add source map support** for better stack traces in production

### Testing Strategy

1. **Unit tests first** - Test errorLogger methods in isolation
2. **Integration tests** - Test error flow through handlers
3. **E2E tests** - Test error reporting to backend service
4. **Mock modules** - When testing breadcrumb-deduplication.test.js separately

---

## Related Files Reference

| Path | Purpose | Status |
|------|---------|--------|
| `/projects/dmb-almanac/app/src/lib/errors/logger.js` | Main error logger | Incomplete (26 missing methods) |
| `/projects/dmb-almanac/app/src/lib/monitoring/errors.js` | Error monitoring system | Complete (addBreadcrumb works) |
| `/projects/dmb-almanac/app/src/lib/errors/types.js` | Error type definitions | Needed for integration |
| `/projects/dmb-almanac/app/tests/unit/errors/logger.test.js` | Logger tests | 26/26 failing |
| `/projects/dmb-almanac/app/tests/integration/error-logging-integration.test.js` | Integration tests | 9/9 failing |
| `/projects/dmb-almanac/app/tests/unit/breadcrumb-deduplication.test.js` | Breadcrumb tests | Working (5/5 passing) |

---

## Summary

The test failures are caused by a **fundamental implementation gap**: the source module provides only a minimal console wrapper, while the tests expect a complete error logging system with log buffering, handler callbacks, diagnostics, and session management.

This is not an environmental issue or a subtle bug—it's a **missing feature implementation** that needs the full ErrorLogger system to be built out.

**Critical Path Forward**:
1. Implement ErrorLogger with log buffer and methods
2. Export `enableVerboseLogging` and `getDiagnosticReport`
3. Wire error handlers and diagnostic reports
4. Ensure AppError integration for error codes/status codes
5. Test end-to-end flow with monitoring/errors.js integration
