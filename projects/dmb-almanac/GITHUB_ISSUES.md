# GitHub Issues - Converted from TODO Comments

Generated: 2026-01-28
Source: Codebase TODO audit (Agent 7 findings, Agent fullstack-developer resolution)

---

## Issue #1: Implement ShowFavoriteButton and ShowShareButton components

**Priority:** Medium
**Labels:** `feature`, `frontend`, `ui`

**File:** `app/src/routes/shows/[showId]/+page.svelte` (line ~225)

**Context:**
The show detail page has placeholder markup for Favorite and Share action buttons. Currently, users see the text "Favorite & Share buttons coming soon" with no functionality. This is a visible UI gap that affects user engagement.

**Current state:**
```html
<div class="actions">
    <p class="text-muted">Favorite & Share buttons coming soon</p>
</div>
```

**Proposed solution:**
1. Create `ShowFavoriteButton.svelte` component:
   - Toggle favorite state in IndexedDB (offline-capable via Dexie)
   - Sync favorite status when online
   - Heart icon with filled/outline states
   - Accessible toggle button with aria-pressed

2. Create `ShowShareButton.svelte` component:
   - Use Web Share API where available (`navigator.share`)
   - Fallback to copy-to-clipboard for unsupported browsers
   - Share show date, venue, and URL

3. Replace the placeholder `<p>` tag with the two components

**Acceptance criteria:**
- [ ] Users can favorite/unfavorite a show
- [ ] Favorite state persists across sessions (IndexedDB)
- [ ] Share button uses native share sheet on mobile
- [ ] Share button copies link on desktop
- [ ] Both buttons are keyboard accessible

---

## Issue #2: Integrate analytics endpoint with a persistent backend

**Priority:** High
**Labels:** `backend`, `telemetry`, `data-loss`

**File:** `app/src/routes/api/analytics/+server.js` (line ~236)

**Context:**
The analytics API endpoint receives Web Vitals metrics, page views, and user interaction data, validates the payload, and logs it to the server console -- but never persists or forwards the data anywhere. In production, all analytics data is silently lost on every request. The endpoint returns `{ success: true }` even though no data is actually stored.

**Current state:**
The endpoint does:
1. Validates and sanitizes the incoming payload
2. Logs to `console.log` in development mode
3. Returns success -- data is discarded

**Proposed solution:**
Choose one or more analytics backends and integrate:

- **Option A (Recommended for MVP):** Write metrics to a PostgreSQL table via the existing database connection. Simple, no new dependencies.
- **Option B:** Forward to Google Analytics 4 Measurement Protocol. Good for dashboarding.
- **Option C:** Send to Vercel Analytics (if deployed on Vercel). Zero config.
- **Option D:** Push to Datadog, Sentry, or CloudWatch for production-grade observability.

Implementation steps:
1. Add `ANALYTICS_BACKEND` env var to select the backend
2. Create an analytics service module with a pluggable interface
3. Wire the service into the POST handler after validation
4. Add integration tests for the persistence layer

**Acceptance criteria:**
- [ ] Analytics data is persisted beyond the request lifecycle
- [ ] Backend selection is configurable via environment variable
- [ ] Failed persistence does not break the client-facing response (fire-and-forget)
- [ ] At least one backend is fully implemented and tested

---

## Issue #3: Integrate error telemetry endpoint with an error tracking service

**Priority:** High
**Labels:** `backend`, `telemetry`, `observability`, `data-loss`

**File:** `app/src/routes/api/telemetry/errors/+server.js` (lines ~210-221)

**Context:**
The error telemetry endpoint receives client-side errors (with severity levels, stack traces, breadcrumbs, and context), processes them, and logs to the server console -- but never forwards them to an error tracking service. In production, all client-side errors are silently lost. This is the most critical of the telemetry gaps because untracked errors mean bugs go undetected.

**Current state:**
The endpoint does:
1. Validates the error payload (severity, message, stack, breadcrumbs)
2. Counts errors by severity (fatal, error, warning)
3. Logs grouped output to console in development
4. Returns success with counts -- errors are discarded

**Proposed solution:**

- **Option A (Recommended):** Integrate Sentry via `@sentry/node`. Industry standard, free tier covers most projects, excellent stack trace deobfuscation.
- **Option B:** Write errors to a PostgreSQL `error_logs` table for self-hosted tracking.
- **Option C:** Forward to Rollbar or Bugsnag.

Implementation steps:
1. Add `ERROR_TRACKING_SERVICE` and `ERROR_TRACKING_DSN` env vars
2. Create an error tracking service module (e.g., `$lib/server/errorTracking.js`)
3. Map the incoming payload format to the service's expected format
4. Wire into the POST handler after console logging
5. For critical/fatal errors, add alerting hooks (Slack, PagerDuty) as a follow-up

**Acceptance criteria:**
- [ ] Client-side errors are forwarded to an external error tracking service
- [ ] Stack traces and breadcrumbs are preserved in the external service
- [ ] Fatal errors are distinguishable from warnings in the tracking UI
- [ ] Service selection is configurable via environment variable
- [ ] Failed forwarding does not break the client-facing response

---

## Summary of All TODO Comments in Codebase

| # | File | Line | TODO Text | Category | Action |
|---|------|------|-----------|----------|--------|
| 1 | `shows/[showId]/+page.svelte` | 227 | ShowFavoriteButton and ShowShareButton components | Actionable feature gap | Converted to Issue #1 |
| 2 | `api/analytics/+server.js` | 236 | Send to analytics backend | Actionable data loss | Converted to Issue #2 |
| 3 | `api/telemetry/errors/+server.js` | 210 | Send to error tracking service | Actionable data loss | Converted to Issue #3 |
| 4 | `api/telemetry/errors/+server.js` | 217 | Trigger alerts for critical errors | Valid future enhancement | Kept as inline comment |
| 5 | `api/telemetry/business/+server.js` | 169 | Send to analytics backend | Valid future enhancement | Kept as inline comment |
| 6 | `api/telemetry/business/+server.js` | 176 | Check for anomalies and trigger alerts | Valid future enhancement | Kept as inline comment |
