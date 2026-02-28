# Wave 4: Code Hardening Design

> **Date:** 2026-02-19
> **Focus:** Bug fixes, error recovery, edge cases, performance
> **Approach:** Critical Path First — fix issues that crash the app or lose data before polish

## Audit Summary

Three audits were conducted against the codebase (62 Rust modules, 15 CSS files, 3 JS files):

| Audit | CRITICAL | HIGH | MEDIUM | LOW |
|-------|----------|------|--------|-----|
| Rust error handling | 5 | 5 | 5 | 3 |
| CSS/DOM | 0 | 0 | 3 | 2 |
| PWA/offline/SW | 1 | 4 | 5 | 0 |

**Top 3 findings:**
1. `.unwrap()`/`.expect()` in WASM hot paths = app crash (blank screen for Blaire)
2. `offline_queue` table missing from db-worker.js schema = all offline writes silently fail
3. No DB worker crash recovery = single worker failure kills all persistence

## Architecture Decision

**Selected: Approach A — "Critical Path First"**

Prioritize by real user impact: WASM panic prevention first (crash = blank screen), offline queue fix second (data loss), DB resilience third, then SW hardening, then polish.

**Rejected alternatives:**
- Layer-by-layer (bottom-up systematic) — slower to reach critical fixes
- Minimal viable hardening (6 tasks) — leaves HIGH-severity issues unaddressed

## Tier 1: WASM Panic Prevention (Tasks 1-4)

**Problem:** Any `.unwrap()` or `.expect()` on `None`/`Err` in WASM = immediate abort. No recovery.

### Task 1: Expand `rust/errors.rs` Hardened Helpers

**Files:** `rust/errors.rs`

The `errors.rs` module already exists (init_schema for error logging). Expand with:
- `safe_create_element(doc, tag) -> Element` — returns fallback `<div>` if creation fails
- `spawn_safe(name, future)` — wraps `spawn_local` with panic-safe error logging
- `log_error(context, err)` — structured error logging to console + `errors` DB table

### Task 2: Eliminate Critical `.unwrap()`/`.expect()` in browser_apis.rs

**Files:** `rust/browser_apis.rs`

- `promise_resolve().unwrap()` → `.ok()` fallback to no-op
- `AbortController::new().unwrap()` → return `Option`, callers handle `None`
- `window().unwrap()` → cache at boot in thread_local, use cached reference
- `document().unwrap()` → same caching pattern

### Task 3: Eliminate Critical `.unwrap()`/`.expect()` in render.rs + dom.rs

**Files:** `rust/render.rs`, `rust/dom.rs`

- `document.create_element(tag).expect("create el")` → `safe_create_element()`
- `set_attribute().unwrap()` → `.ok()` (attribute failures are non-fatal)
- All `append_child().unwrap()` → `.ok()`
- `query_selector().unwrap()` → proper `Option` chaining

### Task 4: Fix NaN Sort Crash in safari_apis.rs

**Files:** `rust/safari_apis.rs`

- `partial_cmp().unwrap()` on f64 → `unwrap_or(std::cmp::Ordering::Equal)`
- Debug-only module but still a crash vector during development

## Tier 2: Offline Queue & DB Schema (Tasks 5-7)

**Problem:** `offline_queue` table not in db-worker.js SCHEMA. All queued offline writes silently fail.

### Task 5: Add Missing `offline_queue` Table to db-worker.js

**Files:** `public/db-worker.js`

Add to SCHEMA array:
```sql
CREATE TABLE IF NOT EXISTS offline_queue (
  id TEXT PRIMARY KEY,
  operation TEXT NOT NULL,
  params TEXT,
  created_at INTEGER NOT NULL,
  retry_count INTEGER DEFAULT 0
)
```

### Task 6: Bound Offline Queue Size

**Files:** `rust/offline_queue.rs`

- Max queue size: 500 entries
- TTL cleanup: discard entries older than 7 days
- Check size before insert, drop oldest if at limit
- Prevents unbounded storage growth during long offline sessions

### Task 7: Offline Queue Flush Error Handling

**Files:** `rust/offline_queue.rs`

- Add retry logic: 3 attempts with exponential backoff (1s, 2s, 4s)
- After max retries: log error, keep in queue for next session
- Add `flush_stats()` for diagnostics in mom-mode
- Never silently discard failed operations

## Tier 3: DB Worker Resilience (Tasks 8-10)

### Task 8: DB Worker Heartbeat & Crash Recovery

**Files:** `rust/db_client.rs`, `rust/db_worker.rs`

- Periodic heartbeat ping to worker (every 30s)
- If heartbeat timeout (5s): attempt worker restart via `navigator.serviceWorker`
- Track consecutive failures — after 3: show "Saving paused" toast
- On recovery: flush offline queue immediately

### Task 9: DB Ready Timeout Graceful Degradation

**Files:** `rust/db_client.rs`

- Current: `wait_for_ready()` gives up after 5s, boot continues with broken DB
- Fix: Set `DB_DEGRADED` thread_local flag on timeout
- All writes route through offline queue when degraded
- Background retry every 10s to reconnect
- Subtle indicator in mom-mode panel

### Task 10: spawn_local Error Boundary Wrapper

**Files:** `rust/errors.rs`, multiple callers

- `spawn_safe(name: &str, future)` wraps async block with:
  - Console error logging with context name
  - Error row insert into `errors` table (if DB available)
  - Graceful continuation (no panic propagation)
- Replace `spawn_local` in critical paths:
  - `tracker.rs` — kind act logging, achievement checks
  - `games.rs` — score saving
  - `quests.rs` — quest completion
  - `streaks.rs` — streak recording
- Non-critical paths (animations, companion idle) keep bare `spawn_local`

## Tier 4: Service Worker Hardening (Tasks 11-13)

### Task 11: Fix Precache Manifest

**Files:** `public/sw.js`

- Add all WebP illustration files to precache list
- Ensure `asset-manifest.json` is consumed by SW install handler
- Verify every offline-required resource is in cache
- Add version-based cache busting

### Task 12: Graceful SW Updates

**Files:** `public/sw.js`, `rust/pwa.rs`

- Replace immediate `location.reload()` with toast: "Update ready!"
- Add "Update now" button on toast
- If ignored: apply update on next natural navigation or page visibility change
- Never interrupt mid-game or mid-story (check `state.active_game`)

### Task 13: Storage Pressure Proactive Cleanup

**Files:** `rust/storage_pressure.rs`

- Proactive cleanup triggers at 60% quota (currently 80%)
- Cleanup order: old game scores (>30 days), old offline queue entries, old error logs
- Clear stale SW caches on version bump
- Log cleanup actions to console for debugging

## Tier 5: CSS & Accessibility Polish (Tasks 14-16)

### Task 14: Fix Gradient Text Rendering

**Files:** `src/styles/home.css`, `src/styles/games.css`

- Add `-webkit-text-fill-color: transparent` on all elements using `background-clip: text`
- Affects: companion bubble titles, game end screen titles, achievement announcements
- Without fix: gradient background shows but text renders opaque on top

### Task 15: Add Missing aria-labels

**Files:** `src/styles/home.css` (via Rust render code)

- Emotion selection buttons in `rust/reflection.rs`
- Game card buttons in `rust/games.rs`
- Companion conversation menu buttons in `rust/companion.rs`
- Daily kindness card in `rust/tracker.rs`
- Add via `set_attribute("aria-label", ...)` in Rust render functions

### Task 16: Z-Index Token System

**Files:** `src/styles/tokens.css`, multiple CSS files

- Define CSS custom properties:
  ```css
  --z-loading: 1000;
  --z-toast: 900;
  --z-modal: 800;
  --z-popover: 700;
  --z-companion-bubble: 600;
  --z-ripple: 500;
  ```
- Replace all hardcoded z-index values (9000, 9001, 9002, etc.)
- Prevents future z-fighting bugs

## Tier 6: Edge Case Fixes (Tasks 17-18)

### Task 17: Companion Render Race Condition Guard

**Files:** `rust/companion.rs`

- Multiple async tasks can trigger expression changes simultaneously
- Add `RENDERING` boolean in thread_local — skip render if already in progress
- Prevents flickering/tearing on companion WebP image swaps
- Clear flag on render complete (via requestAnimationFrame callback)

### Task 18: Speech Synthesis Error Recovery

**Files:** `rust/speech.rs`

- `speechSynthesis.speak()` can fail silently (voice not loaded, interrupted by other utterance)
- Add `onend`/`onerror` event handlers via wasm_bindgen Closure
- On error: cancel current, retry once after 500ms
- If still fails: skip gracefully (don't block UI flow)
- Track speech failures in session for mom-mode diagnostics

## Verification Checklist

1. `trunk build --release` — 0 errors
2. `trunk serve --address 0.0.0.0` — load on iPad mini 6 Safari 26.2
3. **No panics:** Deliberately break DOM (remove elements) — app recovers gracefully
4. **Offline queue works:** Airplane mode → log kind acts → come back online → data persists
5. **DB crash recovery:** Kill db-worker via DevTools → app shows toast → worker restarts
6. **SW update:** Deploy new version → toast appears → update on tap → no mid-game interrupt
7. **Gradient text:** All gradient titles render correctly (not opaque)
8. **Companion stable:** Rapid tapping doesn't cause flickering
9. **Speech recovery:** Interrupt speech mid-sentence → retries → continues

## Critical Files

| File | Changes |
|------|---------|
| `rust/errors.rs` | Expand with safe_create_element, spawn_safe, log_error |
| `rust/browser_apis.rs` | Eliminate .unwrap() on Window/Document/Promise |
| `rust/render.rs` | Use safe_create_element, .ok() on set_attribute |
| `rust/dom.rs` | .ok() on append_child, proper Option chaining |
| `rust/safari_apis.rs` | Fix NaN sort unwrap (debug only) |
| `public/db-worker.js` | Add offline_queue table to SCHEMA |
| `rust/offline_queue.rs` | Bounded queue, retry logic, flush stats |
| `rust/db_client.rs` | Heartbeat, crash recovery, degraded mode |
| `rust/db_worker.rs` | Heartbeat response handler |
| `public/sw.js` | Fix precache, graceful updates |
| `rust/pwa.rs` | Update toast instead of reload |
| `rust/storage_pressure.rs` | Proactive cleanup at 60% |
| `rust/companion.rs` | Render lock, aria-labels |
| `rust/speech.rs` | Error recovery, retry logic |
| `src/styles/tokens.css` | Z-index custom properties |
| `src/styles/home.css` | Gradient text fix |
| `src/styles/games.css` | Gradient text fix |

### Existing utilities to reuse
- `dom::warn()` — console warning
- `dom::toast()` — user-visible toast
- `browser_apis::now_ms()` — timestamp
- `browser_apis::sleep_ms()` — async delay
- `db_client::query()`, `exec()` — DB access
- `state::with_state_mut()` — state updates
- `offline_queue::queued_exec()` — queue writes
