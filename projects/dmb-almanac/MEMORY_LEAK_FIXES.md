# Memory Leak Fixes - Error Logging System

## Overview

This document provides detailed code fixes for all 8 memory leaks identified in the error logging system.

---

## Fix 1: Add Bounds to Log Array (CRITICAL)

**File**: `app/src/lib/errors/logger.js`

**Current Code** (Lines 11-12, 307-311):
```javascript
let _logs = [];
let _maxLogs = 100;

_log(level, message, error, context) {
  const entry = { /* ... */ };
  _logs.push(entry);
  if (_logs.length > _maxLogs) {
    _logs.shift();
  }
}
```

**Issue**:
- No size limit on individual entries
- Large context objects can grow unbounded
- Old entries held in memory even after shift

**Fixed Code**:
```javascript
let _logs = [];
let _maxLogs = 100;
let _maxLogSizeBytes = 50_000; // 50KB max total

// Serialize entry to check size
function serializeEntry(entry) {
  try {
    return JSON.stringify(entry);
  } catch {
    return '';
  }
}

_log(level, message, error, context) {
  const entry = {
    level,
    message,
    error: serializeError(error),
    context: sanitizeObject(context || {}),
    timestamp: new Date().toISOString(),
    timestampMs: Date.now()
  };

  _logs.push(entry);

  // Trim by count
  if (_logs.length > _maxLogs) {
    _logs.shift();
  }

  // Trim by size - prevent unbounded growth
  let totalSize = 0;
  for (const log of _logs) {
    totalSize += serializeEntry(log).length;
  }

  while (totalSize > _maxLogSizeBytes && _logs.length > 10) {
    const removed = _logs.shift();
    totalSize -= serializeEntry(removed).length;
  }
}
```

---

## Fix 2: Add Unsubscribe Tracking (CRITICAL)

**File**: `app/src/lib/errors/logger.js`

**Current Code** (Lines 14, 268-287):
```javascript
let _handlers = [];

onError(handler) {
  if (typeof handler === 'function') {
    _handlers.push(handler);
    return () => {
      const index = _handlers.indexOf(handler);
      if (index > -1) {
        _handlers.splice(index, 1);
      }
    };
  }
  return () => {};
},

clearHandlers() {
  _handlers = [];
}
```

**Issue**:
- Handlers depend on manual unsubscribe
- No tracking of subscription lifecycle
- clearHandlers() is private

**Fixed Code**:
```javascript
let _handlers = [];
let _unsubscribedCount = 0; // Track for debugging

/**
 * Register error handler with tracking
 * @param {Function} handler - Handler function to call on errors
 * @returns {Function} Unsubscribe function
 */
onError(handler) {
  if (typeof handler !== 'function') {
    return () => {};
  }

  // Validate handler won't cause issues
  if (_handlers.length >= 100) {
    console.warn('[ErrorLogger] Handler limit reached (100). Consider unsubscribing old handlers.');
    return () => {};
  }

  _handlers.push(handler);

  // Return unsubscribe function with tracking
  return () => {
    const index = _handlers.indexOf(handler);
    if (index > -1) {
      _handlers.splice(index, 1);
      _unsubscribedCount++;
    }
  };
}

/**
 * Clear all error handlers (for testing/cleanup)
 * @private
 */
clearHandlers() {
  _handlers.length = 0; // Preserve array, clear contents
  _unsubscribedCount = 0;
}

/**
 * Get handler metrics (debugging)
 * @private
 */
getHandlerMetrics() {
  return {
    activeHandlers: _handlers.length,
    totalUnsubscribed: _unsubscribedCount
  };
}
```

---

## Fix 3: Add ErrorMonitor Lifecycle Management (CRITICAL)

**File**: `app/src/lib/monitoring/errors.js`

**Current Code** (Lines 819-821):
```javascript
export function initErrorMonitoring() {
  errorMonitor.initialize();
}
```

**Issue**:
- No prevent duplicate initialization
- No destroy export
- Singleton never cleaned up
- Event listeners accumulate

**Fixed Code** (Replace entire init section, lines 800-822):
```javascript
// ==================== SINGLETON INSTANCE ====================

/**
 * Singleton error monitor instance
 * @type {ErrorMonitor}
 * @private
 */
const errorMonitor = new ErrorMonitor();

/**
 * Track if monitoring is currently initialized
 * @type {boolean}
 * @private
 */
let _monitoringInitialized = false;

/**
 * Store cleanup function for proper teardown
 * @type {(() => void) | null}
 * @private
 */
let _monitoringCleanup = null;

// ==================== PUBLIC API ====================

/**
 * Initialize error monitoring
 * Sets up global error handlers and breadcrumb tracking
 * Safe to call multiple times - will skip if already initialized
 *
 * @returns {void}
 * @example
 * // Initialize on app startup
 * initErrorMonitoring();
 */
export function initErrorMonitoring() {
  if (_monitoringInitialized) {
    errorLogger.debug('[ErrorMonitoring] Already initialized, skipping');
    return;
  }

  errorMonitor.initialize();
  _monitoringInitialized = true;

  // Set up cleanup function
  _monitoringCleanup = () => {
    destroyErrorMonitoring();
  };

  errorLogger.debug('[ErrorMonitoring] Initialized successfully');
}

/**
 * Destroy error monitoring
 * Removes all event listeners and cleans up state
 * Called automatically on app unmount if using Svelte lifecycle
 *
 * @returns {void}
 * @example
 * // Call on app shutdown or during cleanup
 * destroyErrorMonitoring();
 */
export function destroyErrorMonitoring() {
  if (!_monitoringInitialized) {
    return;
  }

  try {
    errorMonitor.destroy();
    _monitoringInitialized = false;
    _monitoringCleanup = null;
    errorLogger.debug('[ErrorMonitoring] Destroyed successfully');
  } catch (error) {
    console.error('[ErrorMonitoring] Error during destruction:', error);
  }
}

/**
 * Get monitoring status (debugging)
 * @returns {{initialized: boolean, handlerCount: number, breadcrumbCount: number}}
 * @private
 */
export function getMonitoringStatus() {
  return {
    initialized: _monitoringInitialized,
    handlerCount: errorMonitor.breadcrumbs?.length ?? 0,
    breadcrumbCount: errorMonitor.breadcrumbs?.length ?? 0,
    errorBufferSize: errorMonitor.errorBuffer?.length ?? 0
  };
}
```

---

## Fix 4: Add Proper Init Guard in ErrorMonitor (CRITICAL)

**File**: `app/src/lib/monitoring/errors.js`

**Current Code** (Lines 166-219):
```javascript
initialize() {
  if (this.initialized) return;
  if (typeof window === 'undefined') return;

  this.abortController = new AbortController();
  const { signal } = this.abortController;

  window.addEventListener('error', (event) => {
    // ...
  }, { signal });

  // ... more setup ...

  this.initialized = true;
}
```

**Issue**:
- Returns early but doesn't clean up old listeners
- If called after destroy, doesn't reset state properly

**Fixed Code** (Replace lines 166-219):
```javascript
/**
 * Initialize error monitoring
 * Sets up global error handlers and interception
 * @returns {void}
 */
initialize() {
  if (this.initialized) {
    return; // Already initialized, nothing to do
  }

  if (typeof window === 'undefined') {
    return; // Not in browser environment
  }

  // Reset state to ensure clean initialization
  this.breadcrumbs = [];
  this.errorBuffer = [];
  this.errorGroups.clear();

  // Create AbortController for cleanup
  this.abortController = new AbortController();
  const { signal } = this.abortController;

  // Global error handler
  const handleError = (event) => {
    this.captureError(event.error || new Error(event.message), {
      tags: {
        type: 'uncaught_error',
        filename: event.filename,
        lineno: String(event.lineno),
        colno: String(event.colno)
      }
    });
  };

  // Unhandled promise rejection handler
  const handleUnhandledRejection = (event) => {
    this.captureError(
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason)),
      {
        tags: {
          type: 'unhandled_promise_rejection'
        }
      }
    );
  };

  window.addEventListener('error', handleError, { signal });
  window.addEventListener('unhandledrejection', handleUnhandledRejection, { signal });

  // Console error interception
  this.interceptConsoleErrors();

  // Track navigation breadcrumbs
  this.trackNavigationBreadcrumbs();

  // Track user interaction breadcrumbs
  this.trackUserInteractionBreadcrumbs();

  // Track XHR/fetch breadcrumbs
  this.trackNetworkBreadcrumbs();

  // Register error handler with error logger
  // IMPORTANT: Store unsubscribe function for cleanup
  const unsubscribeErrorHandler = errorLogger.onError(async (report) => {
    await this.handleErrorReport(report);
  });
  this.unsubscribeErrorHandler = unsubscribeErrorHandler;

  this.initialized = true;
  errorLogger.info('[ErrorMonitor] Error monitoring initialized');
}
```

---

## Fix 5: Store Unsubscribe Function (CRITICAL)

**File**: `app/src/lib/monitoring/errors.js`

**In ErrorMonitor constructor** (Lines 100-159, add new property):
```javascript
constructor() {
  this.breadcrumbs = [];
  this.maxBreadcrumbs = 50;
  this.errorBuffer = [];
  this.errorGroups = new Map();
  this.initialized = false;
  this.abortController = null;

  // NEW: Store unsubscribe functions
  /**
   * Unsubscribe function from errorLogger.onError()
   * @type {(() => void) | null}
   * @private
   */
  this.unsubscribeErrorHandler = null;

  this.originalConsoleMethods = {
    error: null,
    warn: null
  };

  this.originalFetch = null;
}
```

**In destroy method** (Lines 770-797, update to use unsubscribe):
```javascript
/**
 * Cleanup error monitoring
 * Removes all event listeners and resets state
 * @returns {void}
 */
destroy() {
  // Abort all event listeners added with signal
  if (this.abortController) {
    this.abortController.abort();
    this.abortController = null;
  }

  // Unsubscribe from error logger
  if (this.unsubscribeErrorHandler) {
    try {
      this.unsubscribeErrorHandler();
    } catch (error) {
      console.error('[ErrorMonitor] Error unsubscribing from errorLogger:', error);
    }
    this.unsubscribeErrorHandler = null;
  }

  // Restore console methods
  if (typeof console !== 'undefined') {
    if (this.originalConsoleMethods.error) {
      console.error = this.originalConsoleMethods.error;
      this.originalConsoleMethods.error = null;
    }
    if (this.originalConsoleMethods.warn) {
      console.warn = this.originalConsoleMethods.warn;
      this.originalConsoleMethods.warn = null;
    }
  }

  // Restore fetch
  if (typeof window !== 'undefined' && this.originalFetch) {
    window.fetch = this.originalFetch;
    this.originalFetch = null;
  }

  // Clear state
  this.breadcrumbs = [];
  this.errorBuffer = [];
  this.errorGroups.clear();
  this.initialized = false;

  errorLogger.debug('[ErrorMonitor] Destroyed successfully');
}
```

---

## Fix 6: Add Fetch/XHR Tracking Guards (MEDIUM-HIGH)

**File**: `app/src/lib/monitoring/errors.js`

**Current Code** (Lines 587-635, 637-694):
```javascript
trackNetworkBreadcrumbs() {
  if (typeof window === 'undefined') return;

  this.originalFetch = window.fetch;

  window.fetch = async (...args) => {
    // ... new fetch wrapper
  };

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    // ... wrapped open
  };
}
```

**Issue**:
- Fetch/XHR wrapped multiple times if init called twice
- No check for existing wrappers
- Closures not cleaned up

**Fixed Code** (Replace entire trackNetworkBreadcrumbs):
```javascript
/**
 * Track network breadcrumbs
 * Intercepts fetch and XHR requests
 * Safe to call multiple times - checks for existing interception
 * @returns {void}
 * @private
 */
trackNetworkBreadcrumbs() {
  if (typeof window === 'undefined') return;

  // Guard: Check if fetch already wrapped by this monitor
  // Use a marker to detect if we've already wrapped it
  if (window.__ERROR_MONITOR_FETCH_WRAPPED__) {
    errorLogger.debug('[ErrorMonitor] Fetch already intercepted, skipping');
    return;
  }

  // Save original fetch only once
  if (!this.originalFetch) {
    this.originalFetch = window.fetch;
  }

  // Intercept fetch with marker
  const originalFetch = this.originalFetch;
  const monitor = this; // Capture for closure

  window.fetch = async (...args) => {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    const method = args[1]?.method || 'GET';

    const startTime = Date.now();

    try {
      const response = await originalFetch(...args);
      const duration = Date.now() - startTime;

      monitor.addBreadcrumb({
        category: 'xhr',
        level: response.ok ? 'info' : 'error',
        message: `Fetch ${method} ${url}`,
        data: {
          url,
          method,
          status: response.status,
          duration
        }
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      monitor.addBreadcrumb({
        category: 'xhr',
        level: 'error',
        message: `Fetch ${method} ${url} failed`,
        data: {
          url,
          method,
          error: error instanceof Error ? error.message : String(error),
          duration
        }
      });

      throw error;
    }
  };

  // Mark fetch as wrapped
  window.__ERROR_MONITOR_FETCH_WRAPPED__ = true;

  // Guard: Check if XHR already wrapped
  if (window.__ERROR_MONITOR_XHR_WRAPPED__) {
    errorLogger.debug('[ErrorMonitor] XHR already intercepted, skipping');
    return;
  }

  // Intercept XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    // Mark this XHR as tracked
    this.__XHR_METHOD__ = method;
    this.__XHR_URL__ = url;
    return originalXHROpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    const xhr = this;
    const startTime = Date.now();

    // Use { once: true } to auto-remove listeners after firing
    // This prevents memory leaks from accumulating event listener closures
    const addListener = (eventType, handler) => {
      try {
        xhr.addEventListener(eventType, handler, { once: true });
      } catch (error) {
        errorLogger.debug(`[ErrorMonitor] Failed to add ${eventType} listener:`, error);
      }
    };

    addListener('load', () => {
      const duration = Date.now() - startTime;

      monitor.addBreadcrumb({
        category: 'xhr',
        level: xhr.status >= 200 && xhr.status < 300 ? 'info' : 'error',
        message: `XHR ${xhr.__XHR_METHOD__} ${xhr.__XHR_URL__}`,
        data: {
          url: xhr.__XHR_URL__,
          method: xhr.__XHR_METHOD__,
          status: xhr.status,
          duration
        }
      });
    });

    addListener('error', () => {
      const duration = Date.now() - startTime;

      monitor.addBreadcrumb({
        category: 'xhr',
        level: 'error',
        message: `XHR ${xhr.__XHR_METHOD__} ${xhr.__XHR_URL__} failed`,
        data: {
          url: xhr.__XHR_URL__,
          method: xhr.__XHR_METHOD__,
          duration
        }
      });
    });

    return originalXHRSend.apply(xhr, args);
  };

  // Mark XHR as wrapped
  window.__ERROR_MONITOR_XHR_WRAPPED__ = true;
}
```

---

## Fix 7: Clear Global State on Destroy (MEDIUM)

**File**: `app/src/lib/monitoring/errors.js`

**In destroy method** (add after existing code, lines 770-797):
```javascript
destroy() {
  // ... existing cleanup ...

  // NEW: Clear global state on destroy
  if (typeof window !== 'undefined') {
    // Clear custom properties we added
    delete window.__ERROR_MONITOR_USER__;
    delete window.__ERROR_MONITOR_TAGS__;
    delete window.__ERROR_MONITOR_FETCH_WRAPPED__;
    delete window.__ERROR_MONITOR_XHR_WRAPPED__;
  }

  errorLogger.debug('[ErrorMonitor] Destroyed successfully');
}
```

---

## Fix 8: Add SetTags Accumulation Guard (MEDIUM)

**File**: `app/src/lib/monitoring/errors.js`

**Current Code** (Lines 367-374):
```javascript
setTags(tags) {
  if (typeof window !== 'undefined') {
    window.__ERROR_MONITOR_TAGS__ = {
      ...window.__ERROR_MONITOR_TAGS__,
      ...tags
    };
  }
}
```

**Issue**:
- Spreads old tags every call (O(n) memory)
- Tags can accumulate indefinitely
- No way to clear/reset

**Fixed Code** (Replace lines 367-374):
```javascript
/**
 * Set tags with bounded accumulation
 * Replaces existing tags instead of accumulating
 * @param {Object.<string, string>} tags - Tags to set
 * @returns {void}
 */
setTags(tags) {
  if (typeof window === 'undefined') return;

  // Validate tags object
  if (!tags || typeof tags !== 'object') {
    return;
  }

  // NEW: Set tags as replacement, not accumulation
  // This prevents unbounded growth
  const MAX_TAGS = 50;
  const tagKeys = Object.keys(tags);

  if (tagKeys.length > MAX_TAGS) {
    errorLogger.warn(
      `[ErrorMonitor] Too many tags (${tagKeys.length}), limiting to ${MAX_TAGS}`
    );
    // Keep only first 50 tags
    const limited = {};
    for (let i = 0; i < Math.min(tagKeys.length, MAX_TAGS); i++) {
      limited[tagKeys[i]] = tags[tagKeys[i]];
    }
    window.__ERROR_MONITOR_TAGS__ = limited;
  } else {
    window.__ERROR_MONITOR_TAGS__ = tags;
  }
}

/**
 * Merge tags instead of replacing (use with caution)
 * Only merge if you're confident tags won't grow unbounded
 * @param {Object.<string, string>} tags - Tags to merge
 * @returns {void}
 * @private
 */
mergeTags(tags) {
  if (typeof window === 'undefined') return;

  const current = window.__ERROR_MONITOR_TAGS__ || {};
  const merged = { ...current, ...tags };

  // Enforce hard limit
  const MAX_TOTAL_TAGS = 50;
  const entries = Object.entries(merged);

  if (entries.length > MAX_TOTAL_TAGS) {
    errorLogger.warn(
      `[ErrorMonitor] Tag limit exceeded (${entries.length}), truncating to ${MAX_TOTAL_TAGS}`
    );
    window.__ERROR_MONITOR_TAGS__ = Object.fromEntries(entries.slice(0, MAX_TOTAL_TAGS));
  } else {
    window.__ERROR_MONITOR_TAGS__ = merged;
  }
}
```

---

## Fix 9: Setup Global Handlers Cleanup (LOW-MEDIUM)

**File**: `app/src/lib/errors/handler.js`

**Current Code** (Lines 389-519):
```javascript
export function setupGlobalErrorHandlers() {
  // ... handler setup ...
  const recentErrors = new Map();

  return () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleRejection);
    window.removeEventListener('error', handleResourceError, true);
    recentErrors.clear();
  };
}
```

**Issue**:
- Return value (cleanup) rarely called
- Need app-level integration

**Fixed Code** (Add tracking at module level):
```javascript
/**
 * Global error handlers cleanup function
 * @type {(() => void) | null}
 * @private
 */
let _globalErrorHandlersCleanup = null;

/**
 * Initialize global error handlers
 * Safe to call multiple times - cleans up previous handlers before re-init
 * @returns {() => void} Cleanup function to remove listeners
 */
export function setupGlobalErrorHandlers() {
  // Clean up previous handlers if they exist
  if (_globalErrorHandlersCleanup) {
    try {
      _globalErrorHandlersCleanup();
    } catch (error) {
      console.error('[ErrorHandlers] Error cleaning up previous handlers:', error);
    }
    _globalErrorHandlersCleanup = null;
  }

  if (typeof window === 'undefined') {
    return () => {};
  }

  // Rest of existing setupGlobalErrorHandlers code...
  const recentErrors = new Map();
  const DEDUP_WINDOW_MS = 5000;
  const MAX_TRACKED_ERRORS = 50;

  function getErrorFingerprint(message, source) {
    return `${message}::${source || 'unknown'}`;
  }

  function isDuplicateError(fingerprint) {
    const now = Date.now();
    const lastSeen = recentErrors.get(fingerprint);
    if (lastSeen && (now - lastSeen) < DEDUP_WINDOW_MS) {
      return true;
    }
    if (recentErrors.size >= MAX_TRACKED_ERRORS) {
      const oldestKey = recentErrors.keys().next().value;
      if (oldestKey !== undefined) {
        recentErrors.delete(oldestKey);
      }
    }
    recentErrors.set(fingerprint, now);
    return false;
  }

  const handleError = (event) => {
    const fingerprint = getErrorFingerprint(
      event.error?.message || event.message || 'Unknown error',
      event.filename
    );

    if (isDuplicateError(fingerprint)) return;

    errorLogger.error('Uncaught error', event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      type: 'uncaught'
    });
  };

  const handleRejection = (event) => {
    const reason = event.reason;
    const message = reason instanceof Error
      ? reason.message
      : String(reason);

    const fingerprint = getErrorFingerprint(message, 'promise');
    if (isDuplicateError(fingerprint)) {
      event.preventDefault();
      return;
    }

    const isNetworkError = message.includes('fetch') ||
      message.includes('network') ||
      message.includes('Failed to fetch') ||
      message.includes('NetworkError');

    const isAbortError = message.includes('AbortError') ||
      message.includes('aborted');

    if (isAbortError) {
      errorLogger.debug('Promise aborted (user cancellation)', { message });
    } else {
      errorLogger.error('Unhandled promise rejection', reason instanceof Error ? reason : new Error(message), {
        promise: 'PromiseRejectionEvent',
        isNetworkError,
        type: 'unhandled_rejection'
      });
    }

    event.preventDefault();
  };

  const handleResourceError = (event) => {
    if (event.target && event.target !== window) {
      const target = event.target;
      const src = target.src || target.href;

      const fingerprint = getErrorFingerprint(`resource:${target.nodeName}`, src);
      if (isDuplicateError(fingerprint)) return;

      errorLogger.warn(
        `Resource load failed: ${target.nodeName}`,
        undefined,
        {
          tag: target.nodeName,
          src,
          type: 'resource_error'
        }
      );
    }
  };

  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleRejection);
  window.addEventListener('error', handleResourceError, true);

  // NEW: Store cleanup for module-level access
  _globalErrorHandlersCleanup = () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleRejection);
    window.removeEventListener('error', handleResourceError, true);
    recentErrors.clear();
    errorLogger.debug('[ErrorHandlers] Global error handlers removed');
  };

  return _globalErrorHandlersCleanup;
}

/**
 * Cleanup global error handlers
 * Call this on app shutdown
 * @returns {void}
 */
export function teardownGlobalErrorHandlers() {
  if (_globalErrorHandlersCleanup) {
    _globalErrorHandlersCleanup();
    _globalErrorHandlersCleanup = null;
  }
}
```

---

## App-Level Integration (SvelteKit)

**File**: `app/src/app.svelte` or `app/src/routes/+layout.svelte`

**Add lifecycle hooks to initialize/destroy**:
```svelte
<script>
  import { onMount, onDestroy } from 'svelte';
  import {
    initErrorMonitoring,
    destroyErrorMonitoring
  } from '$lib/monitoring/errors';
  import {
    setupGlobalErrorHandlers,
    teardownGlobalErrorHandlers
  } from '$lib/errors/handler';

  onMount(() => {
    // Initialize error monitoring
    initErrorMonitoring();

    // Setup global error handlers
    setupGlobalErrorHandlers();

    // Return cleanup function
    return () => {
      destroyErrorMonitoring();
      teardownGlobalErrorHandlers();
    };
  });

  onDestroy(() => {
    // Fallback cleanup if return from onMount not called
    destroyErrorMonitoring();
    teardownGlobalErrorHandlers();
  });
</script>
```

Or in `+layout.server.js` for better SSR handling:
```javascript
export async function load({ event }) {
  // No-op - just ensure the lifecycle hook in component runs
  return {};
}
```

---

## Testing Verification

**Create test file**: `app/src/lib/errors/__tests__/memory-leaks.test.js`

```javascript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { errorLogger } from '../logger';
import { initErrorMonitoring, destroyErrorMonitoring } from '../../monitoring/errors';
import { setupGlobalErrorHandlers, teardownGlobalErrorHandlers } from '../handler';

describe('Memory Leak Prevention', () => {
  beforeEach(() => {
    errorLogger.clearLogs();
    errorLogger.clearHandlers();
  });

  afterEach(() => {
    destroyErrorMonitoring();
    teardownGlobalErrorHandlers();
  });

  describe('Logger Bounds', () => {
    it('should limit log entries to max', () => {
      // Add 150 logs
      for (let i = 0; i < 150; i++) {
        errorLogger.info(`Test log ${i}`);
      }

      const logs = errorLogger.getLogs(200);
      expect(logs.length).toBeLessThanOrEqual(100);
    });

    it('should not grow unbounded with large context', () => {
      const largeContext = { data: new Array(10000).fill('x') };

      for (let i = 0; i < 50; i++) {
        errorLogger.error('Large context error', new Error('test'), largeContext);
      }

      const logs = errorLogger.getLogs(100);
      const exported = errorLogger.exportLogs();
      const sizeBytes = new TextEncoder().encode(exported).length;

      expect(sizeBytes).toBeLessThan(100_000); // Should be under 100KB
    });
  });

  describe('Handler Management', () => {
    it('should allow subscribing and unsubscribing handlers', () => {
      let callCount = 0;

      const unsubscribe = errorLogger.onError(() => {
        callCount++;
      });

      errorLogger.error('test', new Error('test'));
      expect(callCount).toBe(1);

      unsubscribe();

      errorLogger.error('test', new Error('test'));
      expect(callCount).toBe(1); // Should not increment after unsubscribe
    });

    it('should warn when handler limit exceeded', () => {
      const warnSpy = vi.spyOn(console, 'warn');

      // Add 101 handlers (over limit)
      for (let i = 0; i < 101; i++) {
        errorLogger.onError(() => {});
      }

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Handler limit reached')
      );

      warnSpy.mockRestore();
    });
  });

  describe('Error Monitor Lifecycle', () => {
    it('should not duplicate listeners on multiple init', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      initErrorMonitoring();
      const firstCallCount = addEventListenerSpy.mock.calls.length;

      initErrorMonitoring(); // Should skip
      const secondCallCount = addEventListenerSpy.mock.calls.length;

      expect(firstCallCount).toBe(secondCallCount); // No new listeners added
      addEventListenerSpy.mockRestore();
    });

    it('should clean up state on destroy', () => {
      initErrorMonitoring();

      destroyErrorMonitoring();

      // Global state should be cleared
      expect(window.__ERROR_MONITOR_USER__).toBeUndefined();
      expect(window.__ERROR_MONITOR_TAGS__).toBeUndefined();
    });
  });

  describe('Global Error Handlers', () => {
    it('should cleanup on teardown', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const cleanup = setupGlobalErrorHandlers();
      cleanup();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });

    it('should prevent duplicate error listeners', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      setupGlobalErrorHandlers();
      const firstCallCount = addEventListenerSpy.mock.calls.length;

      setupGlobalErrorHandlers(); // Should cleanup previous first
      const secondCallCount = addEventListenerSpy.mock.calls.length;

      // Second setup should remove old + add new, roughly same count
      expect(Math.abs(secondCallCount - firstCallCount)).toBeLessThan(5);

      addEventListenerSpy.mockRestore();
    });
  });
});
```

---

## Summary of Changes

| File | Fix | Lines | Impact |
|------|-----|-------|--------|
| logger.js | Add size limits, tracking | 11-12, 307-311 | CRITICAL |
| logger.js | Add unsubscribe tracking | 268-287 | CRITICAL |
| errors.js | Add destroy export | 800-822 | CRITICAL |
| errors.js | Guard init, store unsubscribe | 166-219 | CRITICAL |
| errors.js | Guard fetch/XHR wrapping | 587-695 | MEDIUM-HIGH |
| errors.js | Clear global state | 770-797 | MEDIUM |
| errors.js | Bound setTags | 367-374 | MEDIUM |
| handler.js | Module-level cleanup | 389-519 | LOW-MEDIUM |
| app.svelte | Add lifecycle hooks | NEW | CRITICAL |

---

## Rollout Plan

1. **Apply Fix 1-3** (Logger bounds, handler tracking, destroy export)
2. **Test with DevTools** - verify log/handler size stable
3. **Apply Fix 4-5** (Init guards, unsubscribe storage)
4. **Test re-init** - verify no listener duplication
5. **Apply Fix 6-9** (Fetch/XHR guards, global state cleanup)
6. **Add app.svelte lifecycle** - integrate cleanup
7. **Run test suite** - verify all tests pass
8. **DevTools verification** - heap snapshots show no growth
9. **Deploy**

Estimated implementation time: 2-4 hours
