# Error Handling - Quick Start Guide
## DMB Almanac Svelte - 4-Hour Implementation

**Goal:** Get production error visibility and component error boundaries working in one day

---

## Phase 1: Global Error Handler (30 minutes)

### Step 1: Create Global Handler Module

**File:** Create `/src/lib/utils/globalErrorHandler.ts`

Copy from: `ERROR_HANDLING_IMPLEMENTATION.md` → Section 1A

**What it does:**
- Catches window errors
- Catches unhandled promise rejections
- Catches resource loading errors
- Routes to error tracking

### Step 2: Create Error Tracking Module

**File:** Create `/src/lib/utils/errorTracking.ts`

Copy from: `ERROR_HANDLING_IMPLEMENTATION.md` → Section 1B

**What it does:**
- Queues errors before tracking service ready
- Provides interface for Sentry/LogRocket integration
- Adds breadcrumbs for context

### Step 3: Initialize in Layout

**File:** Edit `/src/routes/+layout.svelte`

Add to existing `onMount()`:

```svelte
<script lang="ts">
  import { setupGlobalErrorHandlers, markTrackingReady } from '$lib/utils/globalErrorHandler';
  import { browser } from '$app/environment';

  onMount(() => {
    if (browser) {
      setupGlobalErrorHandlers();
      setTimeout(() => markTrackingReady(), 100);
    }

    // ... existing code ...
  });
</script>
```

**Result:** All uncaught errors now logged with context

---

## Phase 2: Error Boundary Component (30 minutes)

### Step 1: Create BoundaryWrapper Component

**File:** Create `/src/lib/components/ui/BoundaryWrapper.svelte`

Copy from: `ERROR_HANDLING_IMPLEMENTATION.md` → Section 2

**What it does:**
- Wraps components
- Catches errors from children
- Shows error UI with retry button
- Logs to error tracking

### Step 2: Test It

Add to any page:

```svelte
<script lang="ts">
  import BoundaryWrapper from '$lib/components/ui/BoundaryWrapper.svelte';
  import MyComponent from './MyComponent.svelte';
</script>

<BoundaryWrapper name="MyComponent">
  <MyComponent />
</BoundaryWrapper>
```

Now if `MyComponent` throws an error, it's caught and displayed instead of crashing the page.

---

## Phase 3: Wrap Critical Components (1 hour)

### Components to Wrap (Priority Order)

**File:** `/src/lib/components/visualizations/TourMap.svelte`

```svelte
<BoundaryWrapper name="TourMap">
  <!-- existing content -->
</BoundaryWrapper>
```

**File:** `/src/lib/components/visualizations/GuestNetwork.svelte`

```svelte
<BoundaryWrapper name="GuestNetwork">
  <!-- existing content -->
</BoundaryWrapper>
```

**File:** `/src/lib/components/visualizations/GapTimeline.svelte`

```svelte
<BoundaryWrapper name="GapTimeline">
  <!-- existing content -->
</BoundaryWrapper>
```

**File:** `/src/lib/components/visualizations/TransitionFlow.svelte`

```svelte
<BoundaryWrapper name="TransitionFlow">
  <!-- existing content -->
</BoundaryWrapper>
```

---

## Phase 4: Sentry Integration (1 hour 30 minutes)

### Step 1: Install Sentry

```bash
npm install @sentry/svelte
```

### Step 2: Create Sentry DSN

1. Go to https://sentry.io (free account)
2. Create new project (select "Svelte")
3. Copy DSN

### Step 3: Environment Setup

**File:** `.env.local` (development)

```bash
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id
VITE_ENVIRONMENT=development
```

**File:** `.env.production` (production)

```bash
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id
VITE_ENVIRONMENT=production
```

### Step 4: Enhanced Error Tracking

**File:** Update `/src/lib/utils/errorTracking.ts`

Replace the TODO comments with:

```typescript
import * as Sentry from '@sentry/svelte';

let sentryReady = false;

export function initSentry() {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.VITE_ENVIRONMENT,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      integrations: [
        new Sentry.BrowserTracing(),
        new Sentry.Replay(),
      ],
    });
    sentryReady = true;
    console.debug('[Error Tracking] Sentry initialized');
  }
}

export function captureError(error: Error, metadata?: ErrorMetadata) {
  if (sentryReady) {
    Sentry.captureException(error, {
      tags: metadata?.tags,
      extra: metadata?.extra,
      level: metadata?.level,
    });
  } else {
    console.error('[Error Queue]', error, metadata);
  }
}
```

### Step 5: Initialize Sentry in Layout

**File:** Edit `/src/routes/+layout.svelte`

```svelte
<script lang="ts">
  import { initSentry } from '$lib/utils/errorTracking';
  import { browser } from '$app/environment';

  onMount(() => {
    if (browser) {
      setupGlobalErrorHandlers();

      // Initialize Sentry after a brief delay
      setTimeout(() => {
        initSentry();
        markTrackingReady();
      }, 100);
    }
  });
</script>
```

---

## Verification Checklist

After implementing all phases:

### ✅ Test Global Error Handler

1. Open browser console
2. Paste: `throw new Error('Test error')`
3. Should see:
   - Error logged to console with `[window.error]` prefix
   - No page crash
   - Error appears in Sentry dashboard

### ✅ Test Component Boundary

1. Add boundary around any component
2. Intentionally break component (e.g., `undefined.map()`)
3. Should see:
   - Error message displayed
   - "Try Again" button available
   - Error in Sentry
   - Rest of page still works

### ✅ Test Offline Scenario

1. Open DevTools → Network → set to "Offline"
2. Try to load new data
3. Should see:
   - Offline indicator
   - Fallback UI
   - Errors queued (not lost)
4. Go "Online" again
5. Should see:
   - Auto-retry
   - Data loads successfully

### ✅ Test Sentry Dashboard

1. Go to Sentry.io
2. Your project dashboard should show recent errors
3. Click on error to see full context
4. Should show:
   - Error message and stack trace
   - Breadcrumbs (user actions)
   - Device info
   - Source maps (for production)

---

## What You Get

### Immediate (After Implementation)

✅ **Global Error Visibility**
- All uncaught errors captured
- Console always shows context
- Production errors visible in Sentry

✅ **Component Error Isolation**
- Single component error doesn't crash app
- Users see error message, not blank page
- Automatic error recovery option

✅ **Better Debugging**
- Error context tracked
- Breadcrumbs show what led to error
- Source maps on production

### Short-term (Week 1-2)

✅ **Error Trends**
- See which errors most common
- Track error rate over time
- Identify patterns

✅ **Performance Correlation**
- Link errors to performance degradation
- See if error spike causes more errors
- Optimize based on data

✅ **User Impact Analysis**
- How many users affected by error
- Which features broken most
- Prioritize fixes

---

## Troubleshooting

### Q: Errors not appearing in Sentry?

**Check 1:** DSN is correct
```typescript
console.log(import.meta.env.VITE_SENTRY_DSN);
```

**Check 2:** Sentry initialized before errors
```typescript
// In browser console
window._sentry // Should be defined
```

**Check 3:** Not in development with sample rate
```typescript
// Lower sample rate for dev
tracesSampleRate: 1.0, // 100% in dev
```

### Q: Too many errors from development?

**Solution 1:** Only initialize Sentry in production
```typescript
if (import.meta.env.PROD) {
  initSentry();
}
```

**Solution 2:** Set lower sample rate
```typescript
const sampleRate = import.meta.env.PROD ? 0.1 : 0.01;
Sentry.init({ tracesSampleRate: sampleRate });
```

### Q: Boundary component not catching errors?

**Check 1:** Boundary is wrapping the component
```svelte
<!-- WRONG - boundary outside -->
<MyComponent />
<BoundaryWrapper><!-- empty --></BoundaryWrapper>

<!-- RIGHT - boundary wraps component -->
<BoundaryWrapper name="MyComponent">
  <MyComponent />
</BoundaryWrapper>
```

**Check 2:** Error happens during render, not mount
```svelte
<!-- Will be caught -->
{#if data.value}
  {data.value.doesNotExist}
{/if}

<!-- May not be caught -->
onMount(() => {
  throw new Error('oops');
});
```

---

## Performance Impact

### Bundle Size Impact
- Global Error Handler: ~2KB
- BoundaryWrapper: ~1KB
- Sentry SDK: ~30KB (gzipped)
- **Total: ~33KB** (loaded from CDN)

### Runtime Impact
- Error handlers: <1ms overhead
- Boundary components: <1ms overhead
- Sentry initialization: ~100ms (one time)
- **Total: Negligible**

---

## Rollback Plan

If something goes wrong:

**Quick Rollback:**

```bash
# Remove Sentry
npm uninstall @sentry/svelte

# Remove error handling files
rm src/lib/utils/globalErrorHandler.ts
rm src/lib/utils/errorTracking.ts
rm src/lib/components/ui/BoundaryWrapper.svelte

# Revert layout.svelte changes
git checkout src/routes/+layout.svelte
```

---

## Next Steps

After 4-hour implementation:

### Week 2: Polish
- [ ] Add error categorization (see ERROR_HANDLING_IMPLEMENTATION.md Section 4)
- [ ] Improve data loader resilience (see Section 5)
- [ ] Create monitoring dashboard (see ERROR_HANDLING_AUDIT.md Phase 3)

### Week 3: Optimization
- [ ] Set up error alerts
- [ ] Analyze error patterns
- [ ] Implement advanced recovery

### Week 4: Documentation
- [ ] Create error recovery runbook
- [ ] Document error codes
- [ ] Train team on monitoring

---

## File Locations Summary

```
New files created:
├── /src/lib/utils/globalErrorHandler.ts
├── /src/lib/utils/errorTracking.ts
└── /src/lib/components/ui/BoundaryWrapper.svelte

Files modified:
├── /src/routes/+layout.svelte
├── /src/lib/components/visualizations/TourMap.svelte
├── /src/lib/components/visualizations/GuestNetwork.svelte
├── .env.local (add VITE_SENTRY_DSN)
└── .env.production (add VITE_SENTRY_DSN)
```

---

## Success Criteria

You'll know it's working when:

1. ✅ Error in console appears in Sentry dashboard within 5 seconds
2. ✅ Boundary-wrapped component errors show fallback UI
3. ✅ "Try Again" button works and recovers component
4. ✅ No console errors about missing event listeners
5. ✅ Sentry dashboard shows your app name and errors

---

## Support Resources

- **Full Audit:** `ERROR_HANDLING_AUDIT.md`
- **Code Solutions:** `ERROR_HANDLING_IMPLEMENTATION.md`
- **Sentry Docs:** https://docs.sentry.io/platforms/javascript/guides/svelte/
- **Svelte 5 Error Handling:** https://svelte.dev/docs/error-handling

---

## Time Estimate

| Phase | Task | Time | Cumulative |
|-------|------|------|-----------|
| 1 | Global Handler | 30 min | 30 min |
| 2 | Error Boundary | 30 min | 1 hr |
| 3 | Wrap Components | 1 hr | 2 hr |
| 4 | Sentry Setup | 1.5 hr | 3.5 hr |
| - | Testing & Tuning | 30 min | 4 hr |

**Total: 4 hours for production-grade error handling**

---

**Ready? Start with Phase 1 above and follow the steps!**
