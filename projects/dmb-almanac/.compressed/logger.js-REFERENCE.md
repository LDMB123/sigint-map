# logger.js - Code Reference

**File:** app/src/lib/errors/logger.js
**Original:** 913 lines, ~24KB, ~6,000 tokens | **Compressed:** ~200 tokens | **Ratio:** 97% reduction
**Type:** Code Reference | **Access:** Read full file if implementation details needed
**Last Modified:** 2026-01-30

## Exports

### Main Export: `errorLogger`
- `debug(message, context)` - Log debug (lazy eval)
- `info(message, context)` - Log info
- `warn(message, error, context)` - Log warning
- `error(message, error, context)` - Log error
- `fatal(message, error)` - Log fatal (immediate flush)
- `logAsyncError(operation, error, context)` - Async error wrapper
- `logApiError(endpoint, method, status, error)` - API error helper
- `log(level, message, context)` - Generic log method
- `getLogs(limit=50)` - Get recent logs
- `getErrorLogs(limit=50)` - Get errors/fatals only
- `clearLogs()` - Clear log buffer
- `exportLogs()` - Export as JSON
- `getSessionId()` - Get session identifier
- `onError(handler)` - Register handler (returns unsubscribe)
- `clearHandlers()` - Clear all handlers
- `flushNotifications()` - Manually flush batch (testing)
- `initialize()` - Setup cleanup handlers (MEM-002)
- `destroy()` - Cleanup all resources
- `getMemoryStats()` - Memory usage stats

### Named Exports
- `enableVerboseLogging()` - Enable verbose mode
- `getDiagnosticReport()` - Full diagnostic report
- `getPerformanceMetrics()` - Performance metrics
- `resetPerformanceMetrics()` - Reset perf tracking

## Key Implementation Details

### Performance Features
- **Memoization Cache**: WeakMap-based, auto-GC
- **Fast Path**: Simple objects (≤5 keys, no nesting) → 90% faster
- **Batched Notifications**: 16ms debounce (~60fps)
- **Lazy Evaluation**: Debug logs defer expensive ops
- **Target**: <0.5ms per log entry

### Security Features
- **PII Sanitization**: 23-key sensitive data redaction
- **Circular Reference Detection**: WeakSet tracking
- **Error Context Sanitization**: Prevents PII in error.context
- **Depth Limit**: Max recursion depth = 3

### Memory Management
- **Time-based TTL**: 5min log expiration
- **Cleanup Interval**: 60s automatic cleanup
- **Memory Pressure Monitor**: 85% threshold
- **Page Unload Handlers**: beforeunload + pagehide
- **Handler Deduplication**: Prevents duplicate registration
- **Bounded Buffer**: Max 100 entries

## Critical Constants

```javascript
const SENSITIVE_KEYS = [/* 23 terms */];
const LOG_TTL_MS = 5 * 60 * 1000; // 5 minutes
const LOG_CLEANUP_INTERVAL_MS = 60 * 1000; // 60 seconds
const NOTIFICATION_DEBOUNCE_MS = 16; // ~60fps
const MAX_SIMPLE_OBJECT_KEYS = 5;
const _maxLogs = 100;
```

## Data Structures

**Log Entry:**
```typescript
{
  level: 'debug'|'info'|'warn'|'error'|'fatal',
  message: string,
  error?: SerializedError,
  context: SanitizedObject,
  timestamp: string (ISO),
  timestampMs: number
}
```

**Serialized Error:**
```typescript
{
  name: string,
  message: string,
  stack: string (lazy getter),
  code?: string,
  statusCode?: number,
  cause?: SerializedError,
  context?: SanitizedObject
}
```

## Performance Metrics

```javascript
perfMetrics = {
  totalLogs: number,
  totalTimeMs: number,
  cacheHits: number,
  cacheMisses: number,
  fastPathCount: number,
  slowPathCount: number
}
```

## Memory Stats

```javascript
{
  logCount: number,
  handlerCount: number,
  estimatedSizeKB: number,
  oldestLogAge: number|null
}
```

## Implementation Sections

- Lines 1-56: Constants, state, metrics
- Lines 58-198: Memory leak fixes (MEM-001, MEM-002)
- Lines 200-253: Session ID generation (crypto fallback)
- Lines 255-323: Sanitization (PII, circular refs)
- Lines 325-390: Error serialization
- Lines 392-454: Notification batching
- Lines 456-586: errorLogger interface
- Lines 588-653: Exported helper functions

## Dependencies

**Internal:** None (pure module)
**External:** None
**Runtime:** Browser (window, performance.memory)
**Build:** Vite, SvelteKit

## Testing

**Unit Tests:** tests/unit/errors/logger.test.js (72 tests)
**Integration:** tests/integration/error-logging-integration.test.js (35 tests)
**Coverage:** 98.8% overall

## Full Implementation

**Read full file:** projects/dmb-almanac/app/src/lib/errors/logger.js
**Git history:** `git log --follow app/src/lib/errors/logger.js`
**Related docs:** IMPLEMENTATION_COMPLETE.md, PARALLEL_SWARM_VALIDATION_COMPLETE.md
