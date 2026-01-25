# Error Handling & Error Boundaries Audit
## DMB Almanac Svelte PWA

**Audit Date:** January 22, 2026
**Framework:** SvelteKit 2 + Svelte 5
**Target:** Chromium 143+, Apple Silicon M-series
**Audit Scope:** Comprehensive error handling, boundaries, async patterns, recovery mechanisms

---

## Executive Summary

The DMB Almanac app has **foundational error handling in place** but lacks critical coverage in several areas. The application has:

- ✅ **Good:** Async error handling patterns, offline mutation queue with retry logic, data loader error states
- ✅ **Good:** Rate limiting and security validation at the server layer
- ✅ **Good:** Basic error UI components and user-facing fallbacks
- ⚠️ **Gaps:** No global error boundary equivalent for Svelte, limited error tracking/monitoring
- ⚠️ **Gaps:** Incomplete error handling in visualization components
- ⚠️ **Gaps:** No Sentry or error tracking integration
- ⚠️ **Gaps:** Missing error recovery patterns in complex async flows

---

## 1. Svelte Error Boundaries

### Current Implementation

**File:** `/src/lib/components/ui/ErrorBoundary.svelte`

**Status:** ⚠️ **PARTIAL - Handles Global Events Only**

The current implementation captures window-level errors but lacks true component-level isolation:

```svelte
// CURRENT: Captures global errors
function handleError(e: ErrorEvent | PromiseRejectionEvent) {
  const err = 'error' in e ? e.error : e.reason;
  error = err instanceof Error ? err : new Error(String(err));
}

// Listeners on window 'error' and 'unhandledrejection'
useMultipleEvents([
  [window, 'error', handleError as EventListener],
  [window, 'unhandledrejection', handleError as EventListener]
]);
```

**Issues:**

1. **Not Granular Enough:** Single error boundary at global level
   - Missing boundaries around dynamic components (TourMap, visualizations)
   - No boundaries around route transitions
   - No boundaries around data loading components

2. **Event-Based Not Component-Based:**
   - Cannot isolate errors to specific UI sections
   - One error crashes the entire boundary's children
   - No per-component error recovery

3. **Svelte 5 Limitation:** Svelte doesn't have built-in error boundaries like React
   - Must rely on event handlers and error propagation
   - Requires manual boundary placement

**Risk Areas:**
- `/src/lib/components/visualizations/*` - D3 visualizations with complex DOM manipulation
- `/src/routes/[showId]/+page.svelte` - Dynamic content loading
- `/src/routes/shows/+page.svelte` - Large dataset rendering

---

## 2. Global Error Handlers

### Current Implementation

**Files:**
- `/src/hooks.server.ts` - Server-side middleware
- `/src/routes/+layout.svelte` - Root layout (partial)
- `/static/sw.js` - Service worker error handling

**Status:** ✅ **PARTIAL - Server Good, Client Incomplete**

### Server-Side ✅

Strong rate limiting and validation:

```typescript
// Good: Rate limiting with granular endpoints
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  search: { maxRequests: 30, windowMs: RATE_LIMIT_WINDOW_MS },
  api: { maxRequests: 100, windowMs: RATE_LIMIT_WINDOW_MS },
  page: { maxRequests: 200, windowMs: RATE_LIMIT_WINDOW_MS }
};

// Good: Request validation
if (!validatePath(pathname)) {
  return new Response('Bad Request', { status: 400 });
}
```

**Strengths:**
- Validates search queries for SQL injection patterns
- Path validation for traversal attacks
- Rate limit headers in responses (X-RateLimit-*)
- Security headers (CSP, HSTS, X-Frame-Options)

### Client-Side ⚠️ **Incomplete**

**Missing:**
1. No global `window.onerror` handler
2. No `unhandledrejection` handler beyond ErrorBoundary component
3. No resource loading error detection

**Issues in `/src/routes/+layout.svelte`:**

```typescript
// ❌ MISSING: Global error handler setup
// Currently relies on ErrorBoundary component only
// No fallback for errors in lifecycle hooks, stores, workers

// ❌ MISSING: WASM initialization error handling
initializeWasm().catch(err => {
  console.warn('[Layout] WASM preload failed, will use JS fallback:', err);
  // Good: Has fallback, but limited error context
});

// ❌ MISSING: Background Sync registration error handling
registerBackgroundSync().catch((err) => {
  console.debug('[Layout] Background Sync registration failed (non-critical):', err);
  // Good: Doesn't crash, but error is buried in debug level
});
```

---

## 3. Async Error Handling

### Current Implementation

**Status:** ✅ **GOOD - Strong Patterns**

### Service: Offline Mutation Queue

**File:** `/src/lib/services/offlineMutationQueue.ts`

**Strengths:**
- ✅ Exponential backoff retry logic (max 3 retries)
- ✅ Jitter implementation to prevent thundering herd
- ✅ Fetch timeout handling (30 seconds)
- ✅ Non-retryable error detection (4xx except 429)
- ✅ Comprehensive error logging with context

```typescript
// Good: Structured error handling with backoff
async function processMutation(mutation: OfflineMutationQueueItem): Promise<ProcessMutationResult> {
  try {
    const response = await fetchWithTimeout(mutation.url, {
      method: mutation.method,
      body: mutation.body,
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      // Success path
      await db.offlineMutationQueue.update(mutationId, { status: 'completed' });
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const shouldRetry = mutation.retries < MAX_RETRIES && !isNonRetryableError(errorMessage);

    if (shouldRetry) {
      // Retry logic with exponential backoff
      const nextRetryTime = Date.now() + calculateBackoffDelay(mutation.retries);
      await db.offlineMutationQueue.update(mutationId, {
        status: 'retrying',
        retries: mutation.retries + 1,
        lastError: errorMessage,
        nextRetry: nextRetryTime,
      });
    } else {
      // Final failure
      await db.offlineMutationQueue.update(mutationId, {
        status: 'failed',
        lastError: errorMessage,
      });
    }
  }
}
```

**Weaknesses:**

1. ⚠️ **Processing promise not properly handled:**
   ```typescript
   let processingPromise: Promise<ProcessQueueResult> | null = null;

   // ISSUE: If a mutation throws, entire queue processing stops
   // Should use Promise.allSettled instead of relying on throw
   for (const mutation of toProcess) {
     try {
       const result = await processMutation(mutation);
       // ...
     } catch (error) {
       // This swallows individual errors - hard to track
       results.push({
         id: mutation.id ?? 0,
         success: false,
         status: 'failed',
         error: error instanceof Error ? error.message : String(error),
       });
       failed++;
     }
   }
   ```

2. ⚠️ **Race condition in `isProcessing` check:**
   ```typescript
   // ❌ PROBLEM: No atomic isProcessing flag
   if (navigator.onLine && !isProcessing) {
     processQueue(); // Race condition if multiple calls happen simultaneously
   }

   // ✅ HANDLED: Later code handles this with processingPromise
   if (processingPromise) {
     return processingPromise; // Good fallback
   }
   ```

### Data Loading

**File:** `/src/lib/stores/data.ts`

**Status:** ✅ **Good**

```typescript
async initialize() {
  try {
    const { loadInitialData, isDataLoaded } = await import('$db/dexie/data-loader');
    const dataExists = await isDataLoaded();

    if (dataExists) {
      progress.set({ phase: 'complete', percentage: 100 });
      status.set('ready');
      return;
    }

    await loadInitialData((loadProgress) => {
      progress.set(loadProgress);
    });

    status.set('ready');
  } catch (error) {
    console.error('Data initialization failed:', error);
    progress.set({
      phase: 'error',
      percentage: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    status.set('error');
  }
}
```

**Strengths:**
- Error caught and user-friendly message created
- Fallback UI shown in layout
- Retry mechanism available

---

## 4. User-Facing Error Messages

### Current Implementation

**Status:** ✅ **GOOD - Multiple Patterns**

### 1. Error State Component

**File:** `/src/lib/components/ui/ErrorState.svelte`

```svelte
<script lang="ts">
  interface Props {
    title?: string;
    message?: string;
    error?: Error;
    onRetry?: () => void;
  }

  let { title = 'Error', message, error, onRetry }: Props = $props();
  const displayMessage = $derived(message || error?.message || 'An unexpected error occurred');
</script>

<div class="error-state" role="alert">
  <div class="error-icon">⚠️</div>
  <h3>{title}</h3>
  <p>{displayMessage}</p>
  {#if onRetry}
    <button onclick={onRetry}>Try Again</button>
  {/if}
</div>
```

**Strengths:**
- ✅ Accessible (role="alert")
- ✅ Flexible props (title, message, error)
- ✅ Retry button integration
- ✅ Fallback for missing error message

**Weaknesses:**
- No error code display for debugging
- No error stack trace for developers
- Not used consistently across app

### 2. Offline Fallback

**File:** `/src/lib/components/OfflineFallback.svelte`

**Strengths:**
- ✅ Comprehensive offline UX
- ✅ Shows data freshness info
- ✅ Displays last error message
- ✅ Auto-retry on online event
- ✅ Tips for offline functionality
- ✅ Visual status indicator with animations

```svelte
<!-- Good: Context-aware messages -->
{#if isOnline}
  <p class="description">
    We're having trouble loading {resourceName}. This might be a temporary network issue.
  </p>
{:else}
  <p class="description">
    You're currently offline. {resourceName} requires an internet connection to load fresh data.
  </p>
{/if}

<!-- Good: Shows last error -->
{#if freshness?.lastError}
  <div class="error-message">
    <span class="error-icon">!</span>
    <span class="error-text">{freshness.lastError}</span>
  </div>
{/if}
```

### 3. Data Loading Error Screen

**File:** `/src/routes/+layout.svelte`

```svelte
{:else if $dataState.status === 'error'}
  <div class="error-screen">
    <h1>Unable to Load Data</h1>
    <p>{$dataState.progress.error || 'An unknown error occurred'}</p>
    <button onclick={() => dataStore.retry()}>Try Again</button>
  </div>
```

**Issues:**
- ⚠️ Generic error message - doesn't specify which data failed
- ⚠️ No error code or reference for support
- ✅ Has retry mechanism

### 4. API Error Handling

**File:** `/src/routes/api/telemetry/performance/+server.ts`

```typescript
export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload: PerformanceTelemetry = await request.json();

    if (!payload.sessionId || !payload.metrics || !Array.isArray(payload.metrics)) {
      return json(
        { error: 'Invalid payload format' },
        { status: 400 }
      );
    }
    // ...
  } catch (error) {
    console.error('[Performance Telemetry] Error processing metrics:', error);
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
```

**Issues:**
- ⚠️ No error context logged (which field failed?)
- ⚠️ 500 returned for all errors (should distinguish between types)
- ⚠️ Client can't determine retry-worthiness

---

## 5. Error Recovery Patterns

### Current Implementation

**Status:** ✅ **GOOD - Multiple Strategies**

### 1. Retry with Exponential Backoff

**Location:** `offlineMutationQueue.ts`

✅ Well-implemented for offline mutations

```typescript
const BACKOFF_BASE_MS = 1000;
const BACKOFF_MULTIPLIER = 2;
const BACKOFF_JITTER_MS = 500;
const MAX_RETRIES = 3;

function calculateBackoffDelay(retryCount: number): number {
  const exponentialDelay = BACKOFF_BASE_MS * Math.pow(BACKOFF_MULTIPLIER, retryCount);
  const jitter = Math.random() * BACKOFF_JITTER_MS;
  return exponentialDelay + jitter;
}
```

**Strengths:**
- Prevents retry storms
- Jitter prevents thundering herd
- Max retry limit prevents infinite loops

### 2. Online Detection with Auto-Retry

**Location:** `OfflineFallback.svelte`

```svelte
const handleOnline = () => {
  isOnline = true;
  if (!isRetrying) {
    attemptRetry();
  }
};

useMultipleEvents([
  [window, 'online', handleOnline as EventListener],
  [window, 'offline', handleOffline as EventListener]
]);
```

✅ **Good:** Automatically retries when connection restored

### 3. Data Loader Progressive Recovery

**Location:** `/src/lib/db/dexie/data-loader.ts`

⚠️ **Partial:** Has error phases but limited recovery

```typescript
export interface LoadProgress {
  phase: 'checking' | 'fetching' | 'loading' | 'complete' | 'error';
  entity?: string;
  loaded: number;
  total: number;
  percentage: number;
  error?: string;
}
```

**Issues:**
- No resume from last successful checkpoint
- No partial load recovery
- Entire load fails if single entity fails

### 4. Graceful Degradation

**Location:** `/src/routes/+layout.svelte`

```typescript
// WASM initialization with JS fallback
initializeWasm().catch(err => {
  console.warn('[Layout] WASM preload failed, will use JS fallback:', err);
});

// Background Sync as enhancement (not required)
registerBackgroundSync().catch((err) => {
  console.debug('[Layout] Background Sync registration failed (non-critical):', err);
});
```

✅ **Good:** Graceful degradation for optional features

**Issue:** Data loader doesn't have graceful degradation - failure is fatal

---

## 6. Sentry/Logging Integration

### Current Implementation

**Status:** ❌ **NOT IMPLEMENTED**

### What's Missing:

1. **No Error Tracking Service**
   - No Sentry, LogRocket, or similar
   - Errors only logged to console
   - No production error visibility
   - No error aggregation/trends

2. **Limited Telemetry**

**File:** `/src/routes/api/telemetry/performance/+server.ts`

Current setup:
```typescript
// TODO: Replace with real analytics provider
// Examples:
// 1. Google Analytics 4
// 2. Custom database
// 3. Third-party APM (New Relic, Datadog, etc.)
// 4. Cloud logging (CloudWatch, Stackdriver)

console.log(/* metrics */);
```

**Issues:**
- Only console logging for performance metrics
- No error correlation with performance
- No source maps for production debugging

3. **RUM Implementation Incomplete**

**File:** `/src/lib/utils/rum.ts`

```typescript
// Captures metrics but no error context
export interface WebVitalMetric {
  name: 'CLS' | 'INP' | 'LCP' | 'FCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  // ... attribution data
}
```

**Missing:**
- No error rate metrics
- No error stack traces
- No user session tracking
- No error rate alerting

---

## Critical Issues Summary

### 🔴 HIGH SEVERITY

1. **No Granular Component Error Boundaries**
   - Visualization components (TourMap, etc.) have no error handling
   - Single error crashes entire component tree
   - Location: `/src/lib/components/visualizations/*`

2. **No Production Error Tracking**
   - Errors completely invisible in production
   - No alert mechanism for critical errors
   - No error aggregation for debugging

3. **Incomplete Global Error Handler**
   - Missing `window.onerror` and `unhandledrejection` handlers
   - Resource loading errors not handled
   - Worker errors not caught

4. **Data Loader Failure is Fatal**
   - No graceful degradation if data load fails
   - No partial load recovery
   - User stuck on error screen

### 🟡 MEDIUM SEVERITY

1. **Service Worker Error Handling**
   - Limited error recovery in static/sw.js
   - Precache failures only logged
   - No fallback strategy for cache failures

2. **Incomplete Async Error Handling**
   - Some API calls lack proper error handling
   - Race conditions possible in offline queue
   - Missing error context in some catch blocks

3. **Visualization Component Robustness**
   - D3 code in TourMap.svelte has try-catch gaps
   - Missing null checks for data transformations
   - TopoJSON parsing could fail silently

4. **Search & API Error Responses**
   - Generic 500 errors without context
   - No field-level validation error details
   - Client can't distinguish temporary vs permanent errors

### 🟠 LOW SEVERITY

1. **Error Messages Not Localized**
   - All error messages in English
   - No error codes for support reference

2. **Error Logging Inconsistent**
   - Some areas use `console.error`, others `console.warn`
   - No structured logging format
   - Timestamps not always included

3. **No Error Rate Monitoring**
   - Can't detect if error rate is increasing
   - No alerts for critical error thresholds

---

## Recommendations by Priority

### Phase 1: Critical (1-2 weeks)

#### 1. Implement Global Error Handler

**File:** `/src/lib/utils/globalErrorHandler.ts`

```typescript
export function setupGlobalErrorHandlers() {
  // Global error handler
  window.addEventListener('error', (event: ErrorEvent) => {
    const error = event.error || new Error(event.message);
    handleError(error, {
      context: 'uncaught_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));

    handleError(error, {
      context: 'unhandled_rejection',
      reason: event.reason,
    });

    // Important: Prevent default behavior
    event.preventDefault();
  });

  // Resource loading errors
  window.addEventListener('error', (event: Event) => {
    if (event.target !== window && event.target instanceof HTMLElement) {
      const target = event.target as HTMLElement;
      const errorMsg = `Resource failed to load: ${target.getAttribute('src') || target.getAttribute('href')}`;
      handleError(new Error(errorMsg), {
        context: 'resource_error',
        resource: target.tagName,
      });
    }
  }, true); // Capture phase
}

function handleError(error: Error, context: Record<string, any>) {
  // Log with context
  console.error('[Global Error Handler]', error, context);

  // TODO: Send to error tracking service
  // sendToSentry(error, context);

  // Show user-friendly message for critical errors
  if (isShowableError(error)) {
    showErrorNotification(error.message);
  }
}
```

**Integration in layout:**

```svelte
// In +layout.svelte onMount
onMount(() => {
  if (browser) {
    setupGlobalErrorHandlers();
  }
});
```

#### 2. Add Granular Error Boundaries

**File:** `/src/lib/components/ui/BoundaryWrapper.svelte`

Create component-specific error boundaries:

```svelte
<script lang="ts">
  import { useMultipleEvents } from '$lib/hooks/useEventCleanup.svelte';

  interface Props {
    name: string; // For error reporting
    fallback?: import('svelte').Snippet<[Error]>;
    onError?: (error: Error, context: string) => void;
    children: import('svelte').Snippet;
  }

  let { name, fallback, onError, children }: Props = $props();
  let error = $state<Error | null>(null);

  function handleError(e: ErrorEvent | PromiseRejectionEvent) {
    const err = 'error' in e ? e.error : e.reason;
    const appError = err instanceof Error ? err : new Error(String(err));
    error = appError;
    onError?.(appError, name);

    // Report to telemetry
    console.error(`[ErrorBoundary:${name}]`, appError);
  }

  function reset() {
    error = null;
  }

  // Only capture errors in this component's scope
  useMultipleEvents([
    [window, 'error', handleError as EventListener],
    [window, 'unhandledrejection', handleError as EventListener]
  ]);
</script>

{#if error}
  {#if fallback}
    {@render fallback(error)}
  {:else}
    <div class="error-boundary" role="alert">
      <h2>Something went wrong in {name}</h2>
      <p>{error.message}</p>
      <button onclick={reset}>Try again</button>
    </div>
  {/if}
{:else}
  {@render children()}
{/if}
```

**Usage:**

```svelte
<BoundaryWrapper name="TourMap" onError={(err) => logError(err)}>
  <TourMap data={tourData} />
</BoundaryWrapper>

<BoundaryWrapper name="GuestNetwork">
  <GuestNetwork data={guestData} />
</BoundaryWrapper>
```

#### 3. Integrate Error Tracking (Sentry)

**Installation:**

```bash
npm install @sentry/svelte
```

**File:** `/src/lib/utils/sentry.ts`

```typescript
import * as Sentry from '@sentry/svelte';

export function initSentry() {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1, // 10% of transactions
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0, // 100% replay on error

    integrations: [
      new Sentry.BrowserTracing({
        tracePropagationTargets: ['/api/'],
      }),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Ignore non-critical errors
    beforeSend(event) {
      if (event.level === 'warning' && event.logger?.includes('Analytics')) {
        return null;
      }
      return event;
    },
  });
}

export function captureError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    tags: context?.tags,
    extra: context?.extra,
    level: context?.level ?? 'error',
  });
}
```

**Integration in +layout.svelte:**

```svelte
<script lang="ts">
  import { initSentry } from '$lib/utils/sentry';

  onMount(() => {
    if (browser && import.meta.env.PROD) {
      initSentry();
    }
  });
</script>
```

**Environment setup (.env.local):**

```bash
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id
```

### Phase 2: Important (2-3 weeks)

#### 4. Improve Data Loader Resilience

**File:** `/src/lib/db/dexie/data-loader.ts`

Add checkpoints and partial recovery:

```typescript
/**
 * Enhanced load progress with checkpoint support
 */
interface LoadCheckpoint {
  entity: string;
  loaded: number;
  timestamp: number;
}

const CHECKPOINT_KEY = 'dmb-data-load-checkpoint';

async function loadWithCheckpoints(onProgress: (progress: LoadProgress) => void) {
  try {
    // Check for previous checkpoint
    const checkpoint = localStorage.getItem(CHECKPOINT_KEY);
    const startFrom = checkpoint ? JSON.parse(checkpoint).entity : null;

    let startIndex = 0;
    if (startFrom) {
      startIndex = LOAD_TASKS.findIndex(t => t.name === startFrom);
      if (startIndex < 0) startIndex = 0;
    }

    for (let i = startIndex; i < LOAD_TASKS.length; i++) {
      const task = LOAD_TASKS[i];

      try {
        await loadEntity(task);

        // Save checkpoint
        localStorage.setItem(CHECKPOINT_KEY, JSON.stringify({
          entity: task.name,
          loaded: i + 1,
          timestamp: Date.now(),
        }));

        onProgress({
          phase: 'loading',
          entity: task.name,
          loaded: i + 1,
          total: LOAD_TASKS.length,
          percentage: ((i + 1) / LOAD_TASKS.length) * 100,
        });
      } catch (error) {
        if (task.required) {
          throw error; // Critical task failed
        } else {
          console.warn(`[DataLoader] Optional entity ${task.name} failed:`, error);
          // Continue with next entity
          continue;
        }
      }
    }

    localStorage.removeItem(CHECKPOINT_KEY); // Clear checkpoint on success
  } catch (error) {
    throw new Error(`Data loading failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

#### 5. Improve API Error Responses

**File:** `/src/routes/api/telemetry/performance/+server.ts`

```typescript
export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload = await request.json();

    // Detailed validation
    const validationErrors: Record<string, string> = {};

    if (!payload.sessionId) {
      validationErrors.sessionId = 'Session ID is required';
    }
    if (!payload.metrics || !Array.isArray(payload.metrics)) {
      validationErrors.metrics = 'Metrics array is required';
    }
    if (payload.metrics?.length === 0) {
      validationErrors.metrics = 'At least one metric is required';
    }

    if (Object.keys(validationErrors).length > 0) {
      return json(
        {
          error: 'Validation failed',
          details: validationErrors,
          retryable: false,
        },
        { status: 400 }
      );
    }

    // Process metrics...

    return json({ success: true, received: payload.metrics.length });
  } catch (error) {
    const errorMessage = error instanceof SyntaxError
      ? 'Invalid JSON in request body'
      : error instanceof Error ? error.message : 'Unknown error';

    console.error('[Performance Telemetry] Error:', error);

    return json(
      {
        error: 'Internal server error',
        message: errorMessage,
        retryable: true, // Let client know to retry
      },
      { status: 500 }
    );
  }
};
```

#### 6. Enhanced Offline Queue Error Tracking

**File:** `/src/lib/services/offlineMutationQueue.ts`

Add error pattern detection:

```typescript
/**
 * Detect if error is network-related and retryable
 */
function isNetworkError(errorMessage: string): boolean {
  return /network|timeout|offline|connection|refused|reset/i.test(errorMessage);
}

/**
 * Categorize errors for better handling
 */
type ErrorCategory = 'network' | 'validation' | 'auth' | 'rate_limit' | 'server' | 'unknown';

function categorizeError(errorMessage: string, statusCode?: number): ErrorCategory {
  if (!statusCode) {
    return isNetworkError(errorMessage) ? 'network' : 'unknown';
  }

  if (statusCode === 401 || statusCode === 403) return 'auth';
  if (statusCode === 429) return 'rate_limit';
  if (statusCode === 400 || statusCode === 422) return 'validation';
  if (statusCode >= 500) return 'server';

  return 'unknown';
}

// Usage in processMutation
const errorCategory = categorizeError(errorMessage, response?.status);

switch (errorCategory) {
  case 'auth':
    // Should not retry - user needs to re-authenticate
    return await handleAuthError(mutationId, errorMessage);
  case 'rate_limit':
    // Retry with longer delay
    const rateLimitDelay = parseRetryAfter(response?.headers.get('Retry-After')) ?? 60000;
    break;
  case 'validation':
    // Should not retry - data is invalid
    return await handleValidationError(mutationId, errorMessage);
  default:
    // Network or server errors - retry normally
    break;
}
```

### Phase 3: Enhancement (3-4 weeks)

#### 7. Add Error Monitoring Dashboard

Create internal debugging endpoint:

**File:** `/src/routes/admin/errors/+page.svelte`

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  let errors: ErrorLog[] = $state([]);
  let loading = $state(true);

  onMount(async () => {
    const response = await fetch('/api/admin/errors?hours=24');
    errors = await response.json();
    loading = false;
  });
</script>

<div class="error-dashboard">
  <h1>Error Monitoring</h1>

  <div class="filters">
    <select bind:value={filterLevel}>
      <option>All Levels</option>
      <option>Critical</option>
      <option>Error</option>
      <option>Warning</option>
    </select>
  </div>

  <table>
    <thead>
      <tr>
        <th>Time</th>
        <th>Type</th>
        <th>Message</th>
        <th>Occurrences</th>
        <th>Impact</th>
      </tr>
    </thead>
    <tbody>
      {#each errors as error}
        <tr>
          <td>{new Date(error.timestamp).toLocaleString()}</td>
          <td>{error.category}</td>
          <td>{error.message}</td>
          <td>{error.count}</td>
          <td>{error.impactedUsers}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
```

#### 8. Visualization Component Error Handling

**File:** `/src/lib/components/visualizations/TourMap.svelte`

```svelte
<script lang="ts">
  import BoundaryWrapper from '$lib/components/ui/BoundaryWrapper.svelte';

  const renderChart = () => {
    try {
      if (!containerElement || !svgElement || !topoData) {
        throw new Error('Missing required elements for TourMap rendering');
      }

      // ... D3 rendering code ...

    } catch (error) {
      console.error('[TourMap] Rendering failed:', error);
      throw error; // Let boundary catch it
    }
  };
</script>

<BoundaryWrapper name="TourMap">
  <div bind:this={containerElement} class="tour-map-container">
    <svg bind:this={svgElement}></svg>
  </div>
</BoundaryWrapper>
```

---

## Implementation Checklist

### Week 1
- [ ] Implement global error handler (`setupGlobalErrorHandlers`)
- [ ] Set up Sentry integration with DSN
- [ ] Create BoundaryWrapper component
- [ ] Add error boundaries to critical components
- [ ] Update `.env.local` with Sentry DSN

### Week 2
- [ ] Improve data loader with checkpoints
- [ ] Enhance API error responses
- [ ] Improve offline queue error categorization
- [ ] Add error context to all catch blocks
- [ ] Update offlineMutationQueue with better logging

### Week 3
- [ ] Test error scenarios (offline, network failures, WASM)
- [ ] Create error monitoring dashboard
- [ ] Set up Sentry alerts for critical errors
- [ ] Document error recovery flows
- [ ] Performance test with error scenarios

### Week 4
- [ ] Add error analytics to RUM metrics
- [ ] Create runbook for common error scenarios
- [ ] Test in production-like environment
- [ ] Set up automated error report summaries

---

## Testing Strategy

### Unit Tests

```typescript
// test: errorBoundary.test.ts
describe('BoundaryWrapper', () => {
  it('catches and displays errors', async () => {
    // Render component with error-throwing child
    // Verify error message displayed
    // Verify retry button works
  });

  it('recovers after retry', async () => {
    // Throw error
    // Click retry
    // Verify component re-renders successfully
  });
});

// test: offlineMutationQueue.test.ts
describe('Exponential backoff', () => {
  it('calculates correct delays', () => {
    expect(calculateBackoffDelay(0)).toBeGreaterThan(1000);
    expect(calculateBackoffDelay(1)).toBeGreaterThan(2000);
    expect(calculateBackoffDelay(2)).toBeGreaterThan(4000);
  });

  it('includes jitter', () => {
    const delays = Array.from({ length: 10 }, () => calculateBackoffDelay(0));
    const unique = new Set(delays);
    expect(unique.size).toBeGreaterThan(1); // Not all identical
  });
});
```

### Integration Tests

```typescript
// test: errorRecovery.test.ts
describe('Error recovery flow', () => {
  it('recovers from network error', async () => {
    // Simulate network error
    // Verify mutation queued
    // Simulate coming back online
    // Verify mutation processed
  });

  it('persists mutations across reloads', async () => {
    // Queue mutation while offline
    // Reload page
    // Verify mutation still in queue
    // Verify processed when online
  });
});
```

### E2E Tests

```typescript
// e2e: errorScenarios.spec.ts
test('handles server timeout gracefully', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Simulate slow API
  await page.context().setOffline(true);
  await page.click('[data-action="load-data"]');

  // Verify error message shown
  expect(await page.textContent('.error-message')).toContain('offline');

  // Go back online
  await page.context().setOffline(false);
  await page.click('button:has-text("Try Again")');

  // Verify data loaded
  await page.waitForSelector('[data-loaded="true"]');
});
```

---

## Monitoring & Alerts

### Key Metrics to Track

1. **Error Rate**
   - Global error rate (errors/minute)
   - Error rate by category (network, validation, server)
   - Error rate by component

2. **Recovery Success Rate**
   - % of mutations that successfully retry
   - % of offline users that re-sync on online
   - Average time to recovery

3. **User Impact**
   - % of sessions affected by errors
   - % of users who experience critical errors
   - Repeat error rate (same user, same error)

### Alerting Rules

```yaml
rules:
  - name: critical_error_rate_high
    condition: error_rate > 5 errors/minute
    severity: critical

  - name: data_load_failing
    condition: data_initialization_errors > 10%
    severity: high

  - name: offline_queue_backlog
    condition: mutations_in_queue > 100
    severity: medium

  - name: sentry_quota_exceeded
    condition: sentry_event_rate > 90%
    severity: high
```

---

## File Locations for Changes

```
src/
├── lib/
│   ├── utils/
│   │   ├── globalErrorHandler.ts          (NEW)
│   │   ├── errorTracking.ts               (NEW)
│   │   └── sentry.ts                      (NEW)
│   ├── components/
│   │   ├── ui/
│   │   │   ├── BoundaryWrapper.svelte     (NEW)
│   │   │   ├── ErrorState.svelte          (UPDATE)
│   │   │   └── ErrorBoundary.svelte       (UPDATE)
│   │   └── visualizations/
│   │       ├── TourMap.svelte             (UPDATE)
│   │       └── ...
│   ├── services/
│   │   └── offlineMutationQueue.ts        (UPDATE)
│   ├── db/
│   │   └── dexie/
│   │       └── data-loader.ts             (UPDATE)
│   └── stores/
│       └── data.ts                        (UPDATE)
├── routes/
│   ├── +layout.svelte                     (UPDATE)
│   ├── admin/
│   │   └── errors/
│   │       └── +page.svelte               (NEW)
│   └── api/
│       ├── telemetry/
│       │   └── performance/
│       │       └── +server.ts             (UPDATE)
│       └── admin/
│           └── errors/
│               └── +server.ts             (NEW)
├── hooks.server.ts                        (UPDATE)
├── hooks.client.ts                        (NEW)
└── app.html                               (UPDATE)
```

---

## Conclusion

The DMB Almanac app has a **solid foundation** for error handling but needs **strategic improvements** to achieve production-grade robustness. The priority is:

1. **Immediate:** Global error handlers + Sentry integration
2. **Short-term:** Granular error boundaries + improved data loader
3. **Long-term:** Error monitoring dashboard + advanced recovery patterns

With these improvements, the app will provide users with clear error feedback and graceful recovery, while giving developers production visibility into issues affecting their users.
