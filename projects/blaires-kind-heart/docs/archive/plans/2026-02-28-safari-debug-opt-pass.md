# Safari 26.2 / iPad mini 6 Debug & Optimization Pass

- Archive Path: `docs/archive/plans/2026-02-28-safari-debug-opt-pass.md`
- Normalized On: `2026-03-04`
- Source Title: `Safari 26.2 / iPad mini 6 Debug & Optimization Pass`

## Summary
The app is feature-complete and all automated CI gates pass (Playwright Chromium + WebKit on Ubuntu). The sole release blocker is a physical iPad mini 6 (iPadOS 26.2 / Safari 26.2) regression run — never performed on any build. Static analysis of all 3 JS interface files and ~...

## Context
The app is feature-complete and all automated CI gates pass (Playwright Chromium + WebKit on Ubuntu). The sole release blocker is a physical iPad mini 6 (iPadOS 26.2 / Safari 26.2) regression run — never performed on any build. Static analysis of all 3 JS interface files and ~75 Rust source files reveals **11 fixable issues** across 5 independent domains before that test. Issues range from a P0 boot-responsiveness regression (scheduler_yield actually calls queueMicrotask, not scheduler.yield()) to low-risk polish items.

All agents will use `model: "sonnet"` (Sonnet 4.6 with thinking).

---

### Issue Registry (prioritized)

### P0 — Safari-Specific Correctness

| # | Location | Issue |
|---|----------|-------|
| 1 | `src/browser_apis.rs:8-22` | `scheduler_yield()` calls `queueMicrotask`, NOT `scheduler.yield()`. CLAUDE.md lists Scheduler.yield() as a used API. Boot batches never yield to the rendering pipeline — browser cannot paint or process touch input between the 4 boot phases. |
| 2 | `src/game_catcher.rs:770-806` | Gravity loop uses `setInterval(16ms)` instead of `requestAnimationFrame`. Misses vsync synchronization; can drift and double-fire under timer coalescing. `raf_id` field name is already a misnomer. |
| 3 | `public/sw.js:83` | `clients.claim()` is chained after `Promise.allSettled` for all 60 deferred WebP assets. SW takeover can be delayed by seconds on first install, leaving the page uncontrolled. |

### P1 — Performance & Correctness

| # | Location | Issue |
|---|----------|-------|
| 4 | `src/game_catcher.rs:807-887` | `apply_gravity` runs `for_each_match("[data-catcher-area] [data-item-kind]")` (full DOM walk) + 7-9 `data-*` attribute reads + 3 `style.set_property()` calls per item, every 16ms. Position state stored in DOM instead of Rust Vec. |
| 5 | `src/companion.rs:694` | `dom::query("[data-companion-bubble]")` called on every typewriter character (~30-60 calls per phrase). Element reference not cached before the loop. |
| 6 | `public/db-worker.js:654,681` | `request_id` has no `|| 0` fallback in Exec/Query/Batch paths, unlike the Init path (line 563). If caller omits it, response cannot be matched by Rust promise resolver. |
| 7 | `public/offline.html:76-77` | `illustrations/stickers/unicorn-rainbow.webp` is a relative path. This is a deferred SW asset — may 404 on the very first offline visit before deferred assets are cached. |

### P2 — Polish / Latent Risk

| # | Location | Issue |
|---|----------|-------|
| 8 | `wasm-init.js:34` | No `arrayBuffer()` fallback if `compileStreaming` fails (wrong MIME type from dev server). Fails silently with unhelpful error message. |
| 9 | `src/synth_audio.rs:97` | Uses `js_sys::Date::now()` (wall clock, ms resolution). All other time code uses `browser_apis::now_ms()` (`performance.now()`, monotonic). Documented inconsistency in `debugging.md`. |
| 10 | `public/index.html` | No `<link rel="apple-touch-startup-image">` splash screen for iPad mini 6. Safari shows white screen while WASM loads. |
| 11 | TT + sqlite-wasm | `require-trusted-types-for 'script'` in main page CSP. The `default` TT policy name is declared but may not be registered. sqlite-wasm may hit TT-controlled sinks in worker context. Needs audit to confirm safety. |

---

## Actions
### Approach: 4 Parallel Agents

Issues are in fully independent domains. Dispatch 4 agents simultaneously; no edit conflicts.

---

### Agent 1 — Rust Performance (src/)

**Files to modify:**
- `src/browser_apis.rs` — fix `scheduler_yield()`
- `src/game_catcher.rs` — fix gravity loop + apply_gravity
- `src/companion.rs` — cache bubble element in typewriter
- `src/synth_audio.rs` — replace `Date::now()` with `browser_apis::now_ms()`

**Fix 1 — `browser_apis.rs:scheduler_yield()`:**

Replace `queueMicrotask` implementation with real `scheduler.yield()` when available:

```rust
pub async fn scheduler_yield() {
    // Try scheduler.yield() first (Safari 26.2 / Chrome 129+)
    // Falls back to queueMicrotask if unavailable
    let global = js_sys::global();
    let scheduler = js_sys::Reflect::get(&global, &"scheduler".into()).ok();
    if let Some(sched) = scheduler.filter(|v| !v.is_undefined() && !v.is_null()) {
        let yield_fn = js_sys::Reflect::get(&sched, &"yield".into()).ok()
            .and_then(|v| v.dyn_into::<js_sys::Function>().ok());
        if let Some(f) = yield_fn {
            if let Ok(promise) = f.call0(&sched) {
                if let Ok(promise) = promise.dyn_into::<js_sys::Promise>() {
                    let _ = JsFuture::from(promise).await;
                    return;
                }
    // Fallback: queueMicrotask
    yield_microtask().await;
}
```

**Fix 2 — `game_catcher.rs:start_gravity_loop()` → `requestAnimationFrame`:**

Replace `set_interval_with_callback_and_timeout_and_arguments_0(closure, 16)` with a recursive RAF loop. Store RAF handle in `game.raf_id` (already named correctly; this makes the name accurate). Use `performance.now()` delta to compute gravity step, so gravity speed is frame-rate-independent.

Pattern to reuse: `browser_apis.rs` has `scheduler_yield()`; gravity should use RAF directly via `web_sys::window().request_animation_frame()`.

**Fix 3 — `game_catcher.rs:apply_gravity()` — reduce DOM churn:**

Add a `CatcherItem` struct alongside the DOM element:
```rust
struct CatcherItem {
    element: HtmlElement,
    y: f64,
    left: f64,
    speed_mult: f64,
    wobble: f64,
}
```
Store items in `Vec<CatcherItem>` on the `CatcherGame` struct. Remove `data-y`, `data-left`, `data-speed-mult`, `data-wobble` attribute reads per frame. Batch the 3 `style.set_property()` calls into a single `style.css_text` write or keep as 3 (minor). Replace `for_each_match("[data-catcher-area] [data-item-kind]")` with iteration over the Vec.

**Fix 4 — `companion.rs:show_bubble_typewriter()` — cache element:**

Query `[data-companion-bubble]` once before the character loop. Pass reference into the loop. Use `AppState.companion_element` as parent anchor if needed.

**Fix 5 — `synth_audio.rs:97` — consistent time API:**

Replace `js_sys::Date::now()` with `browser_apis::now_ms()`. Add import if needed.

---

### Agent 2 — JS/PWA Fixes (public/ + root JS)

**Files to modify:**
- `public/sw.js` — decouple `clients.claim()` from deferred caching
- `public/offline.html` — fix relative image path
- `public/db-worker.js` — fix `request_id` fallback
- `wasm-init.js` — add `arrayBuffer()` fallback

**Fix 6 — `sw.js` — decouple `clients.claim()`:**

Move `clients.claim()` to fire at the start of activate, before deferred asset caching:
```js
self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        await self.clients.claim();        // ← moved here, fires immediately
        await cleanupOldCaches();
        await cacheDeferred();              // ← runs after claim
    })());
});
```

**Fix 7 — `offline.html` — image path:**

Change `illustrations/stickers/unicorn-rainbow.webp` to `/illustrations/stickers/unicorn-rainbow.webp` (absolute path from root). If CRITICAL_ASSETS in sw.js doesn't include this image, either add it or use a base64-encoded inline fallback via `onerror` handler.

**Fix 8 — `db-worker.js` — `request_id` consistency:**

In the `Exec`, `Query`, and `Batch` message handlers, add `|| 0` fallback matching the Init pattern:
```js
const { request_id = 0 } = event.data;  // destructuring default
```
Or: `const request_id = event.data.request_id ?? 0;`

**Fix 9 — `wasm-init.js` — `arrayBuffer()` fallback:**

```js
let wasmModule;
try {
    wasmModule = await WebAssembly.compileStreaming(wasmFetch);
} catch (_) {
    // MIME type mismatch or streaming unsupported — fetch as ArrayBuffer
    const buf = await fetch(wasmPath).then(r => r.arrayBuffer());
    wasmModule = await WebAssembly.compile(buf);
}
```

---

### Agent 3 — Safari Splash Screen (index.html + icons/)

**Context:** iPad mini 6 logical resolution is 744×1133pt (portrait). Safari on iPadOS uses `apple-touch-startup-image` link tags for the launch screen shown while the PWA loads from home screen. Currently absent — user sees a white screen.

**Files to modify:**
- `public/index.html` — add `<link rel="apple-touch-startup-image">` tags
- Possibly generate/verify splash PNG files exist in `public/icons/`

**Fix 10 — `index.html` — splash screen links:**

Add for iPad mini 6 in portrait and landscape:
```html
<!-- iPad mini 6 portrait: 1488×2266 physical -->
<link rel="apple-touch-startup-image"
      href="/icons/splash-1488x2266.png"
      media="(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)">
<!-- iPad mini 6 landscape: 2266×1488 physical -->
<link rel="apple-touch-startup-image"
      href="/icons/splash-2266x1488.png"
      media="(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)">
```

Splash images should be simple: pink/purple gradient background + app name. If `public/icons/splash-*.png` files don't exist, create them programmatically via a Canvas script or use the existing `sparkle-splash-optimized.webp` adapted to PNG.

---

### Agent 4 — Trusted Types + sqlite-wasm Audit (read-only)

**Scope:** Determine if the `require-trusted-types-for 'script'` CSP causes sqlite-wasm to throw in the db-worker context. Workers have their own security context — verify whether the main document's CSP `<meta>` propagates to workers served by the SW.

**Investigation:**
1. Read `public/db-worker.js` — look for any `innerHTML`, `eval`, `new Function()`, or dynamic script creation in sqlite-wasm init path
2. Check how sqlite3.js is loaded and whether it creates a TT default policy
3. Check SW response headers — does SW inject additional CSP headers on worker responses?
4. Read `src/dom.rs` — verify the "kindheart" TT policy is the only one created, and "default" policy is registered for catch-all

**Expected outcome:** Either (a) confirm no issue because CSP meta in main doc does not apply to workers, or (b) identify that sqlite-wasm uses TT-controlled sinks and needs a `default` policy registered in the worker.

**If action needed:** Register a permissive `default` TT policy in `db-worker.js`:
```js
if (typeof trustedTypes !== 'undefined' && !trustedTypes.defaultPolicy) {
    trustedTypes.createPolicy('default', {
        createHTML: s => s,
        createScriptURL: s => s,
        createScript: s => s,
    });
}
```

---

### Files to Modify

| File | Domain | Fixes |
|------|--------|-------|
| `src/browser_apis.rs` | Rust Perf | Fix 1 |
| `src/game_catcher.rs` | Rust Perf | Fix 2, Fix 3 |
| `src/companion.rs` | Rust Perf | Fix 4 |
| `src/synth_audio.rs` | Rust Perf | Fix 5 |
| `public/sw.js` | JS/PWA | Fix 6 |
| `public/offline.html` | JS/PWA | Fix 7 |
| `public/db-worker.js` | JS/PWA | Fix 8 |
| `wasm-init.js` | JS/PWA | Fix 9 |
| `public/index.html` | Splash | Fix 10 |
| `public/icons/` | Splash | New splash PNGs |

**Read-only audit:** `public/db-worker.js`, `src/dom.rs`, `public/sw.js` headers (TT audit)

---

### Existing Utilities to Reuse

- `browser_apis::now_ms()` → replace `Date::now()` in synth_audio
- `browser_apis::sleep_ms()` → already used; don't duplicate
- `dom::query()` → already interned via `wasm_bindgen::intern()`; reuse pattern for bubble cache
- `src/render.rs::create_img()` → reference for element caching patterns
- `theme.rs` constants → `CATCHER_MAX_ITEMS` (verify before fixing Vec size)

---

## Validation
After all 4 agents complete:

1. **Build:** `trunk build --release` — must succeed with zero new Rust warnings
2. **E2E gates:** `bun run test:e2e:all` — all 46 tests must pass, 1 skip unchanged
3. **QA gates:** `bun run qa:runtime` + `bun run qa:pwa-contract` + `bun run qa:db-contract`
4. **Visual regression:** `bun run test:e2e -- --project=visual` — snapshots must not regress (scheduler_yield change should not affect DOM output)
5. **Local iPad serve:** `trunk serve --address 0.0.0.0` → navigate to app on iPad mini 6 in Safari 26.2
   - Verify boot completes without white flash between batches
   - Verify Catcher game runs smoothly (RAF-based gravity should feel smoother)
   - Verify typewriter bubble appears without hesitation
   - Verify offline.html shows unicorn image when airplane mode is enabled
   - Verify splash screen appears on home screen launch (after adding to home screen)
6. **Commit:** One commit per domain (4 commits + possible TT fix commit)

---

### Out of Scope

- State snapshot divergence in game modules (architectural, benign — panels are exclusive)
- Tier 3 memory+blob data loss on OS kill (Safari architectural limitation)
- kvvfs tier no-op in workers (gracefully falls through, no crash)
- Manifest shortcuts (Safari silently ignores them, harmless)
- WebKit CI not being real Safari (structural limitation of CI environment)

## References
_No references recorded._

