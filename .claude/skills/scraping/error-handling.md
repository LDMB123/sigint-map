---
name: error-handling
version: 1.0.0
description: This guide documents the comprehensive error handling system implemented across the DMB Almanac PWA. The system provides
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: scraping
complexity: advanced
tags:
  - scraping
  - chromium-143
  - apple-silicon

target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2

philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."

prerequisites: []
related_skills: []
see_also: []

minimum_example_count: 3
requires_testing: true
performance_critical: false

# Migration metadata
migrated_from: projects/dmb-almanac/app/docs/analysis/uncategorized/ERROR_HANDLING_GUIDE.md
migration_date: 2026-01-25
---

# DMB Almanac Error Handling Implementation Guide

## Overview

This guide documents the comprehensive error handling system implemented across the DMB Almanac PWA. The system provides robust error catching, user-friendly messaging, and structured logging for zero unhandled runtime errors in production.

## Architecture

### Error System Layers

```
┌─────────────────────────────────────────┐
│  Global Error Handlers (setup on init)  │
│  - window.onerror                        │
│  - window.onunhandledrejection           │
│  - Resource load errors                  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Component-Level Error Boundaries       │
│  - LazyVisualization                    │
│  - ErrorFallback UI                     │
│  - ErrorBoundary.svelte                 │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  API Error Handling                     │
│  - Validation errors                    │
│  - Request/response handling            │
│  - Error responses with correct codes   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Centralized Logger & Reporter          │
│  - Error categorization                 │
│  - Structured logging                   │
│  - External service integration         │
└─────────────────────────────────────────┘
```

## Core Components

### 1. Error Types (`src/lib/errors/types.ts`)

Defines custom error classes for different scenarios:

- **AppError** - Base application error with metadata
- **ComponentLoadError** - Dynamic import failures
- **AsyncError** - Async operation failures
- **ApiError** - HTTP request errors
- **ValidationError** - Input validation failures
- **NetworkError** - Connectivity issues
- **TimeoutError** - Operation timeouts
- **DatabaseError** - Database operation failures
- **StoreError** - Svelte store subscription errors

### 2. Error Logger (`src/lib/errors/logger.ts`)

Centralized logging service:

```typescript
// Log at different levels
errorLogger.debug('debug message');
errorLogger.info('info message');
errorLogger.warn('warning message', error);
errorLogger.error('error message', error);
errorLogger.fatal('critical error', error);

// Log specific error types
errorLogger.logAsyncError('operation name', error);
errorLogger.logApiError('/endpoint', 'POST', 500, error);

// Get diagnostic information
const report = getDiagnosticReport();
const logs = errorLogger.getLogs(50);
const errorLogs = errorLogger.getErrorLogs(20);
```

### 3. Error Handler (`src/lib/errors/handler.ts`)

Routes errors to appropriate handlers:

```typescript
// Handle errors generically
const result = handleError(error, {
  showUserMessage: true,
  retry: true,
  context: { userId: '123' }
});

// Retry operations with exponential backoff
const data = await retryOperation(
  () => fetch('/api/data'),
  maxRetries = 3,
  initialDelayMs = 1000
);

// Wrap async functions
const safeFunc = withErrorHandling(asyncFunction, context);

// Setup global handlers (call once on app init)
setupGlobalErrorHandlers();
```

## Component Integration

### Fixed Components

#### 1. LazyVisualization.svelte

Dynamic visualization loading with error recovery:

```svelte
<LazyVisualization
  componentPath="TransitionFlow"
  data={showData}
  onError={(error) => console.error(error)}
  maxRetries={2}
/>
```

Features:
- Timeout protection (10s per component)
- Automatic retry with exponential backoff
- User-friendly error messages
- Expandable error details panel
- Manual retry button

#### 2. Shows Page (`src/routes/shows/[showId]/+page.svelte`)

Safe store subscription handling:

```svelte
<script lang="ts">
  import { errorLogger } from '$lib/errors/logger';
  import { StoreError } from '$lib/errors/types';

  let showError: Error | null = $state(null);

  let show: any = $derived.by(() => {
    try {
      return $showStore;
    } catch (err) {
      showError = new StoreError('showStore', 'Failed to load', err);
      errorLogger.error('Store error', showError);
      return null;
    }
  });
</script>

{#if showError}
  <ErrorFallback
    error={showError}
    onRetry={() => { showError = null; }}
  />
{/if}
```

Features:
- Try-catch wrapped store subscriptions
- Error fallback UI component
- Retry mechanism
- Structured error logging

#### 3. ErrorFallback Component

Reusable error display and recovery UI:

```svelte
<ErrorFallback
  error={error}
  onRetry={retryFunction}
  title="Custom Error Title"
  showDetails={true}
/>
```

Features:
- User-friendly error messages
- HTTP status code mapping
- Technical details panel
- Retry button
- Home button fallback
- Dark mode support

### API Endpoints

#### 1. Push Subscribe (`/api/push-subscribe`)

```typescript
POST /api/push-subscribe
Content-Type: application/json

{
  "endpoint": "https://push.service.com/...",
  "keys": {
    "auth": "base64url_auth_key",
    "p256dh": "base64url_public_key"
  },
  "userAgent": "Mozilla/5.0...",
  "timestamp": 1234567890
}

Response (201):
{
  "success": true,
  "message": "Subscription saved successfully",
  "subscriptionId": "sub-1234567890-abc123"
}

Error Response (400):
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid request fields",
  "fields": {
    "endpoint": ["Endpoint must be a valid URL"],
    "keys.auth": ["keys.auth must be valid base64url"]
  }
}
```

Validation includes:
- Required field presence
- URL format validation
- Base64url key format
- Timestamp validation

#### 2. Push Unsubscribe (`/api/push-unsubscribe`)

```typescript
POST /api/push-unsubscribe
Content-Type: application/json

{
  "endpoint": "https://push.service.com/..."
}

Response (200):
{
  "success": true,
  "message": "Subscription removed successfully"
}
```

#### 3. Push Send (`/api/push-send`)

```typescript
POST /api/push-send
Content-Type: application/json

{
  "title": "New Show Announced!",
  "body": "Dave Matthews Band tickets on sale",
  "icon": "https://...",
  "targetUsers": ["user-123"]
}

Response (200):
{
  "success": true,
  "message": "Push notifications sent",
  "stats": {
    "attempted": 100,
    "success": 98,
    "failed": 2,
    "invalid": 0
  }
}
```

Security features:
- Authentication check (commented, ready to enable)
- Request validation
- Detailed error responses
- Audit logging

#### 4. Performance Telemetry (`/api/telemetry/performance`)

```typescript
POST /api/telemetry/performance
Content-Type: application/json

{
  "sessionId": "session-123-abc",
  "metrics": [
    {
      "name": "LCP",
      "value": 1200,
      "rating": "good",
      "url": "/shows/123"
    }
  ],
  "timestamp": 1234567890,
  "device": {
    "userAgent": "Mozilla/5.0..."
  }
}

Response (200):
{
  "success": true,
  "received": 5,
  "skipped": 0
}
```

Validation:
- Session ID presence
- Metrics array validation
- Per-metric validation
- Rating enum validation

#### 5. Analytics (`/api/analytics`)

```typescript
POST /api/analytics
Content-Type: application/json

{
  "name": "CLS",
  "value": 0.05,
  "rating": "good",
  "id": "metric-123",
  "delta": 0.01,
  "navigationType": "navigation"
}

Response (200):
{
  "success": true
}

Error Response (400):
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid payload structure"
}
```

Features:
- Payload type validation
- Web Vitals and LoAF support
- CORS same-origin enforcement
- Health check endpoint (GET /api/analytics)

## Global Error Setup

Initialize error handling on app startup:

```typescript
// In +layout.svelte or main.ts
import { setupGlobalErrorHandlers } from '$lib/errors/handler';
import { errorLogger } from '$lib/errors/logger';

// Setup global handlers
setupGlobalErrorHandlers();

// Optional: Setup error reporting to external service
errorLogger.onError(async (report) => {
  await fetch('/api/errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report)
  });
});

// Optional: Enable verbose logging in development
if (import.meta.env.DEV) {
  enableVerboseLogging();
}
```

## Error Handling Patterns

### Pattern 1: Store Subscriptions

```svelte
<script lang="ts">
  import { StoreError } from '$lib/errors/types';

  let data = $derived.by(() => {
    try {
      return $someStore;
    } catch (err) {
      errorLogger.error('Store error', new StoreError('store', 'message', err));
      return null;
    }
  });
</script>
```

### Pattern 2: API Calls

```typescript
try {
  const response = await fetch('/api/endpoint', {
    method: 'POST',
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new ApiError('/api/endpoint', 'POST', 'Failed request', response.status);
  }

  return await response.json();
} catch (err) {
  errorLogger.logApiError('/api/endpoint', 'POST', 500, err);
  throw err;
}
```

### Pattern 3: Async Operations

```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (err) {
  errorLogger.logAsyncError('riskyOperation', err);
  throw new AsyncError('riskyOperation', err);
}
```

### Pattern 4: Validation

```typescript
function validateInput(data: unknown) {
  const errors: Record<string, string[]> = {};

  if (!data.name) {
    errors.name = ['Name is required'];
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors, 'Validation failed');
  }
}
```

### Pattern 5: Component Loading

```svelte
<script lang="ts">
  const LOAD_TIMEOUT_MS = 10000;

  async function loadComponent(path: string) {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new TimeoutError(path, LOAD_TIMEOUT_MS)), LOAD_TIMEOUT_MS)
    );

    try {
      const module = await Promise.race([
        import(`./${path}.svelte`),
        timeoutPromise
      ]);
      return module.default;
    } catch (err) {
      throw new ComponentLoadError(path, err);
    }
  }
</script>
```

## Recovery Strategies

### Automatic Retry

```typescript
const result = await retryOperation(
  async () => await fetch('/api/data'),
  maxRetries = 3,
  initialDelayMs = 1000
);
// Retries with delays: 1s, 2s, 4s
```

### Graceful Degradation

```svelte
{#if error && retryCount < maxRetries}
  <button onclick={retry}>Try Again</button>
{:else if error}
  <SimpleChart data={data} />
{:else}
  <ComplexChart data={data} />
{/if}
```

### Fallback UI

```svelte
{#if error}
  <ErrorFallback error={error} onRetry={handleRetry} />
{:else}
  <MainContent />
{/if}
```

## Monitoring & Debugging

### Get Diagnostic Report

```typescript
import { getDiagnosticReport } from '$lib/errors/logger';

const report = getDiagnosticReport();
console.log(report);
// {
//   sessionId: "1234567890-abc123",
//   timestamp: 2024-01-22T...,
//   errorCount: 3,
//   warningCount: 5,
//   recentErrors: [...],
//   userAgent: "Mozilla/5.0...",
//   url: "https://..."
// }
```

### Export Logs

```typescript
const logsJson = errorLogger.exportLogs();
console.log(logsJson);
// Download or send to server
```

### View Recent Logs

```typescript
const logs = errorLogger.getLogs(50); // Last 50 logs
const errorLogs = errorLogger.getErrorLogs(20); // Last 20 errors

logs.forEach(log => {
  console.log(`[${log.level}] ${log.message}`);
  if (log.error) console.log(log.error);
  if (log.context) console.log(log.context);
});
```

## Production Deployment

### Environment Configuration

```bash
# .env.production
VITE_ENABLE_ERROR_REPORTING=true
VITE_ERROR_REPORT_ENDPOINT=/api/errors
VITE_LOG_LEVEL=warn
```

### Error Reporting Service

Set up in `+layout.svelte`:

```typescript
if (!dev && import.meta.env.VITE_ENABLE_ERROR_REPORTING) {
  errorLogger.onError(async (report) => {
    try {
      await fetch(import.meta.env.VITE_ERROR_REPORT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });
    } catch (err) {
      console.error('Failed to report error:', err);
    }
  });
}
```

### Monitoring Integration

#### Sentry Integration

```typescript
import * as Sentry from "@sentry/sveltekit";
import { errorLogger } from '$lib/errors/logger';

Sentry.init({ dsn: "..." });

errorLogger.onError(async (report) => {
  Sentry.captureException(new Error(report.message), {
    tags: { code: report.errorCode },
    contexts: { report }
  });
});
```

#### Datadog Integration

```typescript
errorLogger.onError(async (report) => {
  await fetch('/api/logs', {
    method: 'POST',
    body: JSON.stringify({
      message: report.message,
      status: 'error',
      error: {
        kind: report.errorName,
        message: report.message,
        stack: report.stack
      },
      service: 'dmb-almanac',
      session_id: report.sessionId,
      timestamp: report.timestamp
    })
  });
});
```

## Testing Error Handling

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { handleError } from '$lib/errors/handler';
import { ApiError, ValidationError } from '$lib/errors/types';

describe('Error Handler', () => {
  it('handles API errors correctly', () => {
    const error = new ApiError('/test', 'POST', 'Not found', 404);
    const result = handleError(error);

    expect(result.handled).toBe(true);
    expect(result.canRetry).toBe(false);
    expect(result.userMessage).toContain('not found');
  });

  it('handles validation errors', () => {
    const error = new ValidationError(
      { email: ['Invalid email format'] },
      'Validation failed'
    );
    const result = handleError(error);

    expect(result.handled).toBe(true);
    expect(result.userMessage).toContain('email');
  });
});
```

### Integration Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { retryOperation } from '$lib/errors/handler';

describe('Retry Mechanism', () => {
  it('retries failed operations with backoff', async () => {
    let attempts = 0;

    const result = await retryOperation(
      async () => {
        attempts++;
        if (attempts < 3) throw new Error('Failed');
        return 'success';
      },
      maxRetries = 3
    );

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });
});
```

## Troubleshooting

### Issue: Errors Not Being Logged

1. Check if `setupGlobalErrorHandlers()` is called on app init
2. Verify error logger is imported correctly
3. Check browser console for setup errors
4. Verify log level in development vs production

### Issue: API Validation Failing

1. Log the request payload: `console.log(JSON.stringify(body))`
2. Check field names match API schema
3. Verify data types (string vs number vs array)
4. Check for required fields

### Issue: Components Not Recovering from Errors

1. Verify `onError` callback is defined
2. Check component has error state management
3. Verify retry mechanism is triggered
4. Check console for retry errors

### Issue: High Error Volume in Logs

1. Review `errorLogger.log` level settings
2. Implement error rate limiting
3. Filter out expected errors (404s in search, etc)
4. Implement error deduplication

## Future Improvements

1. **Error Replay**: Store session replay data for error context
2. **Error Aggregation**: Group similar errors for pattern detection
3. **Smart Retries**: ML-based retry strategy optimization
4. **Performance Monitoring**: Track error impact on metrics
5. **User Impact Analysis**: Understand how errors affect UX
6. **Automated Recovery**: Self-healing error scenarios

## Files Modified

- `src/lib/errors/types.ts` - Error type definitions
- `src/lib/errors/logger.ts` - Error logging service
- `src/lib/errors/handler.ts` - Error handling & recovery
- `src/lib/components/visualizations/LazyVisualization.svelte` - Component loading
- `src/lib/components/ui/ErrorFallback.svelte` - Error display component
- `src/routes/shows/[showId]/+page.svelte` - Store error handling
- `src/routes/api/push-send/+server.ts` - API error handling
- `src/routes/api/push-subscribe/+server.ts` - API error handling
- `src/routes/api/push-unsubscribe/+server.ts` - API error handling
- `src/routes/api/telemetry/performance/+server.ts` - API error handling
- `src/routes/api/analytics/+server.ts` - API error handling

## Support

For questions or issues, refer to:
1. `.claude/AGENT_ROSTER.md` - Agent coordination
2. `.claude/SKILLS_LIBRARY.md` - Reusable skills
3. Inline code comments and JSDoc blocks
4. Error messages in user-facing UI
