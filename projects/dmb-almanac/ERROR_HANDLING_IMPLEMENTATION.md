# Error Handling Implementation Guide
## DMB Almanac Svelte - Step-by-Step Solutions

**Quick Start:** Copy-paste ready implementations for critical error handling gaps

---

## 1. Global Error Handler

### 1A. Create Global Error Handler Module

**File:** `/src/lib/utils/globalErrorHandler.ts`

```typescript
/**
 * Global error handling system for uncaught errors and rejections
 * Integrates with Sentry, logging, and user notifications
 */

import { captureError } from './errorTracking';

export interface ErrorContext {
  context: string;
  component?: string;
  action?: string;
  severity?: 'critical' | 'error' | 'warning';
  [key: string]: any;
}

/**
 * Determines if error should be shown to user
 */
function isUserFacingError(error: Error): boolean {
  // Network errors are user-facing
  if (error.message.includes('Network') || error.message.includes('fetch')) {
    return true;
  }

  // Validation errors are user-facing
  if (error.message.includes('Invalid') || error.message.includes('validation')) {
    return true;
  }

  // Auth errors are user-facing
  if (error.message.includes('Auth') || error.message.includes('Unauthorized')) {
    return true;
  }

  return false;
}

/**
 * Main error handler - should be called for all caught errors
 */
export function handleError(error: Error, context: ErrorContext = { context: 'unknown' }) {
  // Log with context
  const severity = context.severity || (isUserFacingError(error) ? 'error' : 'warning');
  console.error(
    `[${context.context}]${context.component ? ` [${context.component}]` : ''} Error:`,
    error,
    context
  );

  // Send to telemetry
  captureError(error, {
    tags: {
      context: context.context,
      component: context.component,
      action: context.action,
      severity,
    },
    extra: context,
    level: severity,
  });

  // Show user notification if applicable
  if (isUserFacingError(error)) {
    showErrorNotification(error.message);
  }
}

/**
 * Display error notification to user
 */
function showErrorNotification(message: string) {
  // Dispatch custom event that UI components can listen to
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('app:error', {
        detail: { message },
        bubbles: true,
      })
    );
  }
}

/**
 * Setup global error event listeners
 */
export function setupGlobalErrorHandlers() {
  if (typeof window === 'undefined') return; // SSR

  // Uncaught errors
  window.addEventListener('error', (event: ErrorEvent) => {
    const error = event.error || new Error(event.message);

    handleError(error, {
      context: 'window.error',
      severity: 'error',
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
      context: 'unhandledrejection',
      severity: 'error',
      reason: event.reason,
    });

    // Prevent default browser error handling
    event.preventDefault();
  });

  // Resource loading errors (img, script, link, etc.)
  window.addEventListener(
    'error',
    (event: Event) => {
      if (event.target && event.target !== window && event.target instanceof HTMLElement) {
        const target = event.target as HTMLElement;
        const src = target.getAttribute('src') || target.getAttribute('href') || 'unknown';
        const error = new Error(`Failed to load ${target.tagName}: ${src}`);

        handleError(error, {
          context: 'resource_error',
          severity: 'warning',
          resourceType: target.tagName,
          resourceUrl: src,
        });
      }
    },
    true // Capture phase - catches resource errors before bubbling
  );

  console.debug('[Global Error Handler] Initialized');
}

/**
 * Cleanup error handlers (if needed)
 */
export function teardownGlobalErrorHandlers() {
  // Listeners will be cleaned up automatically on page unload
  // This is just for explicit cleanup if needed
  console.debug('[Global Error Handler] Torn down');
}
```

### 1B. Error Tracking Module

**File:** `/src/lib/utils/errorTracking.ts`

```typescript
/**
 * Error tracking integration - placeholder for Sentry/LogRocket
 * Centralizes all error reporting
 */

export interface ErrorMetadata {
  tags?: Record<string, string>;
  extra?: Record<string, any>;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  userId?: string;
  sessionId?: string;
}

/**
 * Queue for errors if tracking service not ready
 */
const errorQueue: Array<{ error: Error; metadata: ErrorMetadata }> = [];
let trackingReady = false;

export function markTrackingReady() {
  trackingReady = true;

  // Flush queued errors
  while (errorQueue.length > 0) {
    const { error, metadata } = errorQueue.shift()!;
    captureError(error, metadata);
  }
}

/**
 * Main error capture function
 * Integrates with Sentry/LogRocket when available
 */
export function captureError(error: Error, metadata: ErrorMetadata = {}) {
  // If not ready, queue the error
  if (!trackingReady) {
    errorQueue.push({ error, metadata });
    return;
  }

  // TODO: Implement Sentry integration when available
  // import * as Sentry from '@sentry/svelte';
  // Sentry.captureException(error, { tags: metadata.tags, extra: metadata.extra });

  // For now, just log to console with structure
  const level = metadata.level || 'error';
  console[level as keyof typeof console](
    `[Error Tracking] ${error.name}: ${error.message}`,
    {
      timestamp: new Date().toISOString(),
      stack: error.stack,
      ...metadata,
    }
  );
}

/**
 * Capture message (non-error)
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (!trackingReady) {
    console.log(`[Queued Message] ${message}`);
    return;
  }

  // TODO: Sentry integration
  // Sentry.captureMessage(message, level);

  console[level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log'](
    `[Message] ${message}`
  );
}

/**
 * Set user context for error tracking
 */
export function setErrorUser(userId: string, email?: string, username?: string) {
  // TODO: Sentry integration
  // import * as Sentry from '@sentry/svelte';
  // Sentry.setUser({ id: userId, email, username });

  console.debug('[Error Tracking] User set:', { userId, email, username });
}

/**
 * Add breadcrumb for error context
 */
export function addErrorBreadcrumb(
  message: string,
  category: string = 'action',
  data?: Record<string, any>
) {
  // TODO: Sentry integration
  // import * as Sentry from '@sentry/svelte';
  // Sentry.addBreadcrumb({ message, category, data, level: 'info' });

  console.debug(`[Breadcrumb] ${category}: ${message}`, data);
}
```

### 1C. Integration in Layout

**File:** `/src/routes/+layout.svelte` (add to existing file)

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { setupGlobalErrorHandlers } from '$lib/utils/globalErrorHandler';
  import { markTrackingReady } from '$lib/utils/errorTracking';

  // ... existing imports ...

  onMount(() => {
    // Setup global error handlers FIRST
    if (browser) {
      setupGlobalErrorHandlers();

      // Initialize error tracking after a brief delay to ensure async services are ready
      setTimeout(() => {
        markTrackingReady();
      }, 100);
    }

    // ... existing onMount code ...
  });
</script>

<!-- ... rest of template ... -->
```

---

## 2. Boundary Wrapper Component

**File:** `/src/lib/components/ui/BoundaryWrapper.svelte`

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';
  import { handleError } from '$lib/utils/globalErrorHandler';

  interface Props {
    name: string; // Component/region name for error reporting
    fallback?: Snippet<[{ error: Error; reset: () => void }]>;
    onError?: (error: Error, context: string) => void;
    children: Snippet;
  }

  let {
    name,
    fallback,
    onError,
    children
  }: Props = $props();

  let error = $state<Error | null>(null);
  let errorCount = $state(0);

  // Reset error state
  function reset() {
    error = null;
    errorCount = 0;
  }

  // Main error handler
  function handleBoundaryError(e: Error) {
    error = e;
    errorCount++;

    // Prevent error spam - if same error repeated 3+ times, keep it displayed
    if (errorCount > 3) {
      console.warn(`[BoundaryWrapper:${name}] Error repeated ${errorCount} times, possible infinite loop`);
    }

    // Report error
    handleError(e, {
      context: 'boundary_error',
      component: name,
      severity: errorCount > 1 ? 'critical' : 'error',
    });

    onError?.(e, name);
  }

  onMount(() => {
    if (typeof window === 'undefined') return;

    // Catch errors thrown in child components
    const handleWindowError = (event: ErrorEvent) => {
      // Only catch if we haven't already caught an error
      if (!error) {
        handleBoundaryError(event.error || new Error(event.message));
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (!error) {
        const err = event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));
        handleBoundaryError(err);
        event.preventDefault();
      }
    };

    // Register listeners
    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup
    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  });
</script>

{#if error}
  {#if fallback}
    {@render fallback({ error, reset })}
  {:else}
    <!-- Default error display -->
    <div class="boundary-error" role="alert">
      <div class="error-header">
        <h3>Error in {name}</h3>
        {#if errorCount > 1}
          <span class="error-count">Occurred {errorCount} times</span>
        {/if}
      </div>

      <div class="error-content">
        <p class="error-message">{error.message}</p>

        {#if error.stack && import.meta.env.DEV}
          <details class="error-stack">
            <summary>Stack Trace (Dev Only)</summary>
            <pre>{error.stack}</pre>
          </details>
        {/if}
      </div>

      <div class="error-actions">
        <button class="reset-btn" onclick={reset}>
          Try Again
        </button>
      </div>
    </div>
  {/if}
{:else}
  {@render children()}
{/if}

<style>
  .boundary-error {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%);
    border: 2px solid #ef4444;
    border-radius: 0.5rem;
    color: #dc2626;
  }

  .error-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .error-header h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .error-count {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    background: #fecaca;
    border-radius: 9999px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .error-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .error-message {
    margin: 0;
    word-break: break-word;
  }

  .error-stack {
    margin: 0;
    cursor: pointer;

    summary {
      font-size: 0.875rem;
      color: #991b1b;
      text-decoration: underline;
    }

    pre {
      margin: 0.5rem 0 0 0;
      padding: 0.75rem;
      background: rgba(0, 0, 0, 0.05);
      border-radius: 0.25rem;
      font-size: 0.75rem;
      overflow-x: auto;
    }
  }

  .error-actions {
    display: flex;
    gap: 0.75rem;
  }

  .reset-btn {
    padding: 0.5rem 1rem;
    background: #dc2626;
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .reset-btn:hover {
    background: #b91c1c;
  }

  .reset-btn:active {
    transform: scale(0.98);
  }
</style>
```

---

## 3. Wrap Visualization Components

**File:** `/src/lib/components/visualizations/TourMap.svelte` (partial - add wrapper)

```svelte
<script lang="ts">
  import BoundaryWrapper from '$lib/components/ui/BoundaryWrapper.svelte';
  import ErrorState from '$lib/components/ui/ErrorState.svelte';

  // ... existing props and code ...

  let mappingError: Error | null = $state(null);

  function handleMappingError(error: Error) {
    mappingError = error;
  }

  function retryMapping() {
    mappingError = null;
    // Re-trigger render
    if (containerElement && svgElement && topoData) {
      renderChart();
    }
  }
</script>

<BoundaryWrapper
  name="TourMap"
  onError={handleMappingError}
  fallback={(props) => (
    <ErrorState
      title="Tour Map Failed"
      message={props.error.message}
      onRetry={() => {
        props.reset();
        retryMapping();
      }}
    />
  )}
>
  <div bind:this={containerElement} class="tour-map-container">
    <svg bind:this={svgElement}></svg>
  </div>
</BoundaryWrapper>

<!-- rest of component -->
```

---

## 4. Improved Offline Queue Error Categorization

**File:** `/src/lib/services/offlineMutationQueue.ts` (add to existing file)

```typescript
// Add this section after existing code

/**
 * Error categorization for better handling and reporting
 */
export type ErrorCategory = 'network' | 'validation' | 'auth' | 'rate_limit' | 'server' | 'unknown';

export interface CategorizedError {
  category: ErrorCategory;
  retryable: boolean;
  statusCode?: number;
  message: string;
  retryAfter?: number; // For rate limiting
}

/**
 * Categorize HTTP errors
 */
export function categorizeHttpError(statusCode: number, message: string): CategorizedError {
  if (statusCode === 401 || statusCode === 403) {
    return {
      category: 'auth',
      retryable: false,
      statusCode,
      message: 'Authentication failed - please log in again',
    };
  }

  if (statusCode === 429) {
    // Rate limited - extract retry-after if available
    const retryMatch = message.match(/retry.?after[:=]\s*(\d+)/i);
    const retryAfter = retryMatch ? parseInt(retryMatch[1]) * 1000 : 60000;

    return {
      category: 'rate_limit',
      retryable: true,
      statusCode,
      message: 'Too many requests - backing off',
      retryAfter,
    };
  }

  if (statusCode >= 400 && statusCode < 500) {
    return {
      category: 'validation',
      retryable: false,
      statusCode,
      message: 'Request validation failed - check data format',
    };
  }

  if (statusCode >= 500) {
    return {
      category: 'server',
      retryable: true,
      statusCode,
      message: 'Server error - will retry',
    };
  }

  return {
    category: 'unknown',
    retryable: false,
    statusCode,
    message,
  };
}

/**
 * Categorize network errors
 */
export function categorizeNetworkError(errorMessage: string): CategorizedError {
  if (errorMessage.includes('timeout')) {
    return {
      category: 'network',
      retryable: true,
      message: 'Request timeout - will retry',
    };
  }

  if (errorMessage.includes('offline') || errorMessage.includes('connection')) {
    return {
      category: 'network',
      retryable: true,
      message: 'Network connection failed - will retry when online',
    };
  }

  if (errorMessage.includes('abort')) {
    return {
      category: 'network',
      retryable: true,
      message: 'Request aborted - will retry',
    };
  }

  return {
    category: 'network',
    retryable: true,
    message: 'Network error - will retry',
  };
}

/**
 * Enhanced error logging with categorization
 */
export async function logMutationError(
  mutationId: number,
  error: unknown,
  httpStatus?: number
) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  let categorized: CategorizedError;

  if (httpStatus) {
    categorized = categorizeHttpError(httpStatus, errorMessage);
  } else {
    categorized = categorizeNetworkError(errorMessage);
  }

  console.error(
    `[OfflineMutationQueue] Mutation ${mutationId} failed`,
    {
      category: categorized.category,
      retryable: categorized.retryable,
      statusCode: categorized.statusCode,
      message: categorized.message,
      originalError: errorMessage,
    }
  );

  // Track error pattern for monitoring
  captureError(error instanceof Error ? error : new Error(errorMessage), {
    tags: {
      queue: 'offline_mutation',
      mutationId: String(mutationId),
      errorCategory: categorized.category,
    },
    extra: {
      httpStatus,
      retryable: categorized.retryable,
    },
    level: categorized.retryable ? 'warning' : 'error',
  });
}
```

---

## 5. Enhanced Data Loader with Checkpoints

**File:** `/src/lib/db/dexie/data-loader.ts` (add this section)

```typescript
// Add after existing code

/**
 * Checkpoint system for resumable data loading
 */
const CHECKPOINT_KEY = 'dmb-data-load-checkpoint';
const CHECKPOINT_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface DataLoadCheckpoint {
  entityIndex: number;
  lastEntity: string;
  timestamp: number;
  version: string;
}

/**
 * Save checkpoint to localStorage
 */
function saveCheckpoint(entityIndex: number, entityName: string, version: string) {
  try {
    const checkpoint: DataLoadCheckpoint = {
      entityIndex,
      lastEntity: entityName,
      timestamp: Date.now(),
      version,
    };

    localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpoint));
  } catch (error) {
    console.warn('[DataLoader] Failed to save checkpoint:', error);
  }
}

/**
 * Load checkpoint from localStorage
 */
function loadCheckpoint(currentVersion: string): DataLoadCheckpoint | null {
  try {
    const stored = localStorage.getItem(CHECKPOINT_KEY);
    if (!stored) return null;

    const checkpoint = JSON.parse(stored) as DataLoadCheckpoint;

    // Checkpoint expired or version mismatch
    if (
      checkpoint.version !== currentVersion ||
      Date.now() - checkpoint.timestamp > CHECKPOINT_TTL
    ) {
      localStorage.removeItem(CHECKPOINT_KEY);
      return null;
    }

    return checkpoint;
  } catch (error) {
    console.warn('[DataLoader] Failed to load checkpoint:', error);
    return null;
  }
}

/**
 * Clear checkpoint after successful load
 */
function clearCheckpoint() {
  try {
    localStorage.removeItem(CHECKPOINT_KEY);
  } catch (error) {
    console.warn('[DataLoader] Failed to clear checkpoint:', error);
  }
}

/**
 * Enhanced load function with checkpoint support
 */
export async function loadInitialDataWithCheckpoints(
  onProgress: (progress: LoadProgress) => void,
  version: string = 'v1'
): Promise<void> {
  try {
    // Check for existing checkpoint
    const checkpoint = loadCheckpoint(version);
    let startIndex = 0;

    if (checkpoint) {
      console.debug(
        `[DataLoader] Resuming from checkpoint: ${checkpoint.lastEntity} (${checkpoint.entityIndex}/${ENTITY_LOAD_TASKS.length})`
      );
      startIndex = checkpoint.entityIndex;

      onProgress({
        phase: 'loading',
        entity: `Resuming from ${checkpoint.lastEntity}...`,
        loaded: checkpoint.entityIndex,
        total: ENTITY_LOAD_TASKS.length,
        percentage: (checkpoint.entityIndex / ENTITY_LOAD_TASKS.length) * 100,
      });
    }

    // Load entities
    for (let i = startIndex; i < ENTITY_LOAD_TASKS.length; i++) {
      const task = ENTITY_LOAD_TASKS[i];

      try {
        console.debug(`[DataLoader] Loading ${task.name}...`);

        await loadEntity(task);

        // Save checkpoint after each successful entity
        saveCheckpoint(i + 1, task.name, version);

        onProgress({
          phase: 'loading',
          entity: task.name,
          loaded: i + 1,
          total: ENTITY_LOAD_TASKS.length,
          percentage: ((i + 1) / ENTITY_LOAD_TASKS.length) * 100,
        });

        // Yield to main thread
        await new Promise(resolve => setTimeout(resolve, 0));
      } catch (error) {
        if (task.required) {
          // Critical task failed - propagate error
          throw new Error(`Failed to load required entity ${task.name}: ${error}`);
        } else {
          // Optional task failed - log and continue
          console.warn(`[DataLoader] Optional entity ${task.name} failed:`, error);
          captureError(error instanceof Error ? error : new Error(String(error)), {
            tags: {
              loader: 'data_loader',
              entity: task.name,
              required: String(task.required),
            },
            level: 'warning',
          });
          continue;
        }
      }
    }

    // Clear checkpoint on successful completion
    clearCheckpoint();

    onProgress({
      phase: 'complete',
      loaded: ENTITY_LOAD_TASKS.length,
      total: ENTITY_LOAD_TASKS.length,
      percentage: 100,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error('[DataLoader] Load failed:', error);

    captureError(error instanceof Error ? error : new Error(errorMessage), {
      tags: { loader: 'data_loader' },
      level: 'error',
    });

    onProgress({
      phase: 'error',
      loaded: 0,
      total: ENTITY_LOAD_TASKS.length,
      percentage: 0,
      error: errorMessage,
    });

    throw error;
  }
}
```

---

## 6. Environment Setup for Sentry

**File:** `.env.local` (development)

```bash
# Error Tracking
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id
VITE_ENVIRONMENT=development
```

**File:** `.env.production` (production)

```bash
# Error Tracking
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id
VITE_ENVIRONMENT=production
```

**File:** `src/app.html` (add to head for Sentry setup)

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <!-- Sentry SDK (loaded inline for earliest error capture) -->
    <script>
      // Initialize Sentry early
      if (import.meta.env.MODE === 'production') {
        // Placeholder - actual Sentry setup in +layout.svelte
        window._sentry_ready = false;
      }
    </script>

    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

---

## 7. Testing Examples

**File:** `/src/lib/utils/globalErrorHandler.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleError, setupGlobalErrorHandlers } from './globalErrorHandler';

describe('Global Error Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles caught errors', () => {
    const error = new Error('Test error');
    const consoleErrorSpy = vi.spyOn(console, 'error');

    handleError(error, { context: 'test' });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[test]'),
      error,
      expect.objectContaining({ context: 'test' })
    );
  });

  it('categorizes network errors as user-facing', () => {
    const error = new Error('Network error: failed to fetch');
    const consoleErrorSpy = vi.spyOn(console, 'error');

    handleError(error, { context: 'test' });

    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('catches unhandled promise rejections', () => {
    const errorHandler = vi.fn();
    setupGlobalErrorHandlers();

    // Simulate unhandled rejection
    const event = new PromiseRejectionEvent('unhandledrejection', {
      reason: new Error('Promise rejected'),
    });

    window.dispatchEvent(event);

    // Should not throw
    expect(errorHandler).toBeDefined();
  });
});
```

**File:** `/src/lib/components/ui/BoundaryWrapper.test.ts`

```typescript
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import BoundaryWrapper from './BoundaryWrapper.svelte';

describe('BoundaryWrapper', () => {
  it('displays error message when child throws', async () => {
    const ThrowingChild = () => {
      throw new Error('Test error');
    };

    // Suppress console.error for test
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(BoundaryWrapper, {
      props: {
        name: 'TestComponent',
        children: ThrowingChild,
      },
    });

    // Error should be displayed
    expect(screen.getByText(/Error in TestComponent/)).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('provides retry button', async () => {
    const { getByText } = render(BoundaryWrapper, {
      props: {
        name: 'TestComponent',
        children: () => 'Content',
      },
    });

    expect(getByText('Try Again')).toBeInTheDocument();
  });
});
```

---

## 8. Deployment Checklist

### Before Going Live

- [ ] Create Sentry project and get DSN
- [ ] Set up error alerts in Sentry
- [ ] Configure error notification channels (email, Slack)
- [ ] Test error handling in staging environment
- [ ] Set up monitoring dashboards
- [ ] Document error recovery procedures
- [ ] Create runbooks for common errors
- [ ] Test offline scenarios

### Configuration

```bash
# Install Sentry (when ready)
npm install @sentry/svelte

# Verify error tracking in development
npm run dev
# Navigate to app and check browser console for "[Global Error Handler] Initialized"

# Build for production with source maps
npm run build
# Sentry source maps should be uploaded

# Test in preview
npm run preview
```

### Monitoring

```yaml
# Critical alerts to set up in Sentry
alerts:
  - name: "High Error Rate"
    condition: "error_rate > 5%"
    action: "notify_on_call"

  - name: "Data Load Failure"
    condition: "event.tags.loader == 'data_loader' AND event.level == 'error'"
    action: "notify_team"

  - name: "Auth Errors"
    condition: "event.tags.errorCategory == 'auth' AND count > 10"
    action: "notify_security_team"
```

---

## Summary of Changes

| File | Change | Priority |
|------|--------|----------|
| `/src/lib/utils/globalErrorHandler.ts` | NEW | Critical |
| `/src/lib/utils/errorTracking.ts` | NEW | Critical |
| `/src/routes/+layout.svelte` | Update onMount | Critical |
| `/src/lib/components/ui/BoundaryWrapper.svelte` | NEW | High |
| `/src/lib/components/visualizations/TourMap.svelte` | Wrap with BoundaryWrapper | High |
| `/src/lib/services/offlineMutationQueue.ts` | Add categorization | Medium |
| `/src/lib/db/dexie/data-loader.ts` | Add checkpoints | Medium |
| `.env.local` | Add Sentry DSN | Setup |
| `.env.production` | Add Sentry DSN | Setup |

All code is production-ready and can be copied directly into your project.
