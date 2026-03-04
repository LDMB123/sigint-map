# Wave 4: Code Hardening — Implementation Plan

- Archive Path: `docs/archive/plans/2026-02-19-code-hardening.md`
- Normalized On: `2026-03-04`
- Source Title: `Wave 4: Code Hardening — Implementation Plan`

## Summary
| Category | Before | After |
|----------|--------|-------|
| `expect()` / `unwrap()` crash vectors | 5 critical | 1 (documented-safe Promise constructor) |
| Render function panics | Every render call | None — all return `Option` |
| Bare `spawn_local` (error-swallowing) | ~8 | Replaced with `spawn_local_logged` |
| Offline queue bounds | Unbounded | 500 max + 24h TTL |
| Storage pressure response | Warn only | Auto-cleanup at 80%+ |
| SW update during gameplay | Immediate reload | Deferred until game/story ends |
| Speech error recovery | None | `onerror` handler on utterances |
| DB init timeout reporting | Console only | Structured `AppError::DatabaseInit` |
| Build warnings | 21 | <5 |

### Critical Files

| File | Changes |
|------|---------|
| `rust/render.rs` | `create_el` → `Option<Element>`, all functions return `Option` |
| ALL `rust/*.rs` calling render | Propagate `Option` with `?` or `let Some(x) = ... else { return }` |
| `rust/dom.rs:35` | Fix `announce_live()` unwrap |
| `rust/browser_apis.rs` | Harden `yield_microtask`, `new_abort_handle` → `Option` |
| `rust/safari_apis.rs:5` | NaN-safe sort comparison |
| `rust/offline_queue.rs` | 500 max size, 24h TTL cleanup |
| `rust/db_client.rs:9` | Structured error on init timeout |
| `rust/speech.rs:6` | `onerror` handler on utterances |
| `rust/pwa.rs:4` | Guard reload against active game/story |
| `rust/storage_pressure.rs` | Proactive cleanup at 80%+ |
| `rust/lib.rs` | No changes needed (already correct) |

### Existing utilities to reuse:
- `browser_apis::spawn_local_logged()` — error-logging async wrapper
- `browser_apis::now_ms()` — timestamp
- `errors::report()` — structured error reporting
- `errors::clear_old_errors()` — DB cleanup
- `dom::warn()` — console warning
- `dom::toast()` — user-visible notification
- `dom::query()` — selector query
- `offline_queue::flush_queue()` — replay failed mutations
- `db_client::exec()` / `query()` — DB operations

## Context
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Eliminate all WASM crash vectors, harden error recovery, and add defensive patterns so the app never crashes during use by a 4-year-old.

**Architecture:** 6 tiers of independent fixes, each targeting a specific crash/data-loss category. All changes are internal hardening — zero UI changes, zero new features. Tier 1 fixes the most critical crash vectors first.

**Tech Stack:** Rust/WASM, web-sys, wasm-bindgen, Safari 26.2

**Git state:** Branch `main`, build passes (`trunk build --release`)

---

### Tier 1: Eliminate WASM Crash Vectors (Critical)

### Task 1: Make `render::create_el()` Return `Option<Element>` Instead of Panicking

**Files:**
- Modify: `rust/render.rs:2`

**Context:** `create_el()` uses `.expect("create_element failed")` which panics and kills the WASM module instantly. Every single render call in the app goes through this function. If `document.createElement()` ever fails (memory pressure, DOM corruption), the entire app dies.

**Step 1:** Change `create_el()` from `expect` to return `Option<Element>`:

```rust
fn create_el(doc: &Document, tag: &str) -> Option<Element> {
    doc.create_element(tag).ok()
}
```

**Step 2:** Update `create_el_with_class` to propagate `Option`:

```rust
pub fn create_el_with_class(doc: &Document, tag: &str, class: &str) -> Option<Element> {
    let el = create_el(doc, tag)?;
    let _ = el.set_attribute("class", class);
    Some(el)
}
```

**Step 3:** Update ALL functions in `render.rs` that call `create_el` or `create_el_with_class` to return `Option<Element>`:

- `create_el_with_data` → `Option<Element>`
- `text_el` → `Option<Element>`
- `text_el_with_data` → `Option<Element>`
- `append_text` → `Option<Element>`
- `create_button` → `Option<Element>`
- `create_button_with_data` → `Option<Element>`
- `build_game_picker` → already returns `Option`, just add `?` calls
- `build_skeleton` → `Option<Element>`
- `create_img` → `Option<Element>`
- `create_img_with_priority` → `Option<Element>`

**Step 4:** Run `trunk build --release`. This WILL produce compiler errors in every file that calls render functions. That is expected — the next tasks fix those call sites.

**Step 5:** Commit: `refactor: render::create_el returns Option instead of panicking`

---

### Task 2: Fix All Render Call Sites Across the Codebase

**Files:**
- Modify: ALL Rust files that call `render::*` functions (the compiler will tell you exactly which)

**Context:** After Task 1, every call site that expects `Element` from render functions now gets `Option<Element>`. Each call site needs a `?` or `.unwrap_or_else(|| return)` depending on context.

**Step 1:** Run `trunk build --release 2>&1 | head -200` to get the list of all broken call sites.

**Step 2:** For each broken call site, apply one of these patterns:

Pattern A — function already returns `Option`: add `?`
```rust
// Before:
let card = render::create_el_with_class(&doc, "div", "game-card");
// After:
let card = render::create_el_with_class(&doc, "div", "game-card")?;
```

Pattern B — function returns `()`: use `let Some(el) = render::...  else { return; }`
```rust
// Before:
let grid = render::create_el_with_class(&doc, "div", "games-grid");
// After:
let Some(grid) = render::create_el_with_class(&doc, "div", "games-grid") else { return };
```

Pattern C — in void closures: early return on None
```rust
// Before:
let el = render::text_el(&doc, "div", "class", "text");
// After:
let Some(el) = render::text_el(&doc, "div", "class", "text") else { return };
```

**Step 3:** Fix ALL call sites until `trunk build --release` compiles with 0 errors.

**Step 4:** Commit: `fix: propagate Option from render functions across all call sites`

---

### Task 3: Harden `dom.rs` — Remove `unwrap_throw` from `window()`/`document()`/`body()`

**Files:**
- Modify: `rust/dom.rs:2-4,35`

**Context:** `dom::window()`, `dom::document()`, `dom::body()` all use `unwrap_throw()` which panics. These are called hundreds of times. Also `announce_live()` on line 35 has a bare `.unwrap()` on `create_element("div")`.

**Step 1:** Change `window()`, `document()`, `body()` to return `Option`:

```rust
pub fn window() -> Option<Window> { web_sys::window() }
pub fn document() -> Option<Document> { window()?.document() }
pub fn body() -> Option<HtmlElement> { document()?.body() }
```

**Step 2:** This will break EVERY file in the codebase. The `dom::window()` return is used everywhere. A practical alternative is to keep the panicking versions but add safe alternatives:

```rust
// Keep existing panicking versions for now — they're safe because
// WASM always runs in a browser context where window/document exist.
// These literally cannot fail in Safari 26.2.
pub fn window() -> Window { web_sys::window().unwrap_throw() }
pub fn document() -> Document { window().document().unwrap_throw() }
pub fn body() -> HtmlElement { document().body().unwrap_throw() }
```

**Actually, KEEP these as-is.** `web_sys::window()` only returns None in non-browser contexts (Node.js, Deno). In Safari WASM, these are guaranteed to succeed. The `unwrap_throw()` is safe here.

**Step 3:** Fix `announce_live()` — replace bare `.unwrap()` with graceful handling:

```rust
pub fn announce_live(message: &str) {
    let live_region = query("[data-aria-live]").or_else(|| {
        let region = document().create_element("div").ok()?;
        for (k, v) in [("data-aria-live", ""), ("aria-live", "polite"), ("aria-atomic", "true"), ("class", "sr-only")] {
            let _ = region.set_attribute(k, v);
        }
        let _ = body().append_child(&region);
        Some(region)
    });
    if let Some(region) = live_region {
        region.set_text_content(Some(message));
    }
```

**Step 4:** Run `trunk build --release` — verify 0 errors.

**Step 5:** Commit: `fix: harden announce_live to avoid unwrap crash`

---

### Task 4: Harden `browser_apis.rs` Critical Unwraps

**Files:**
- Modify: `rust/browser_apis.rs`

**Context:** Three crash vectors:
1. `queueMicrotask.expect("queueMicrotask unavailable")` in `yield_microtask()` — panics if API missing
2. `resolve_holder.borrow_mut().take().unwrap()` in `new_promise_with_resolver()` — panics if callback never called
3. `AbortController::new().expect("AbortController unavailable")` in `new_abort_handle()` — panics if API missing

**Step 1:** Fix `yield_microtask()` — fallback to `setTimeout(0)` if `queueMicrotask` unavailable:

Replace lines in `yield_microtask()`:
```rust
async fn yield_microtask() {
    let promise = Promise::new(&mut |resolve, _reject| {
        let global = js_sys::global().unchecked_into::<web_sys::Window>();
        let queue_fn = js_sys::Reflect::get(&global, &"queueMicrotask".into()).ok();
        if let Some(func) = queue_fn.and_then(|v| v.dyn_into::<js_sys::Function>().ok()) {
            let _ = func.call1(&JsValue::NULL, &resolve);
        } else {
            // Fallback: setTimeout(resolve, 0)
            let _ = global.set_timeout_with_callback_and_timeout_and_arguments_0(&resolve, 0);
        }
    });
    let _ = JsFuture::from(promise).await;
}
```

**Step 2:** Fix `new_promise_with_resolver()` — add defensive check:

```rust
fn new_promise_with_resolver() -> (Function, Promise) {
    let resolve_holder = std::rc::Rc::new(std::cell::RefCell::new(None::<Function>));
    let holder = resolve_holder.clone();
    let mut cb = move |resolve: Function, _reject: Function| {
        *holder.borrow_mut() = Some(resolve);
    };
    let promise = Promise::new(&mut cb);
    let resolve = resolve_holder
        .borrow_mut()
        .take()
        .expect("Promise constructor must call callback synchronously");
    // Note: This expect is actually safe — Promise::new() is specified to call
    // the callback synchronously. But we document why it's safe.
    (resolve, promise)
}
```

**Actually, this `.unwrap()` IS safe** — `Promise::new()` calls its callback synchronously per the JS spec. The resolver is always set. Add a comment documenting why, but don't change the code.

**Step 3:** Fix `new_abort_handle()` — return `Option<AbortHandle>`:

```rust
pub fn new_abort_handle() -> Option<AbortHandle> {
    Some(AbortHandle {
        controller: AbortController::new().ok()?,
    })
}
```

**Step 4:** Update all call sites of `new_abort_handle()` to handle `Option`. Search with:
```bash
grep -rn "new_abort_handle" rust/
```

**Step 5:** Run `trunk build --release` — verify 0 errors.

**Step 6:** Commit: `fix: harden browser_apis — remove expect/unwrap crash vectors`

---

### Task 5: Fix `safari_apis.rs` NaN Crash in Sort

**Files:**
- Modify: `rust/safari_apis.rs:5`

**Context:** `baselines.sort_by(|a, b| b.partial_cmp(a).unwrap())` panics if any value is NaN. This is debug-only (`#[cfg(debug_assertions)]`) but still a crash vector during development.

**Step 1:** Replace the sort with NaN-safe comparison:

```rust
fn store_inp_baseline(duration_ms: f64) {
    INP_BASELINES.with(|cell| {
        let mut baselines = cell.borrow_mut();
        baselines.push(duration_ms);
        baselines.sort_by(|a, b| b.partial_cmp(a).unwrap_or(std::cmp::Ordering::Equal));
        baselines.truncate(10);
    });
}
```

**Step 2:** Run `trunk build --release` — verify 0 errors.

**Step 3:** Commit: `fix: NaN-safe sort in safari_apis INP baseline tracking`

---

### Tier 2: Database Resilience

### Task 6: Add Retry Logic to `offline_queue::flush_queue_locked()`

**Files:**
- Modify: `rust/offline_queue.rs`

**Context:** Currently `flush_queue_locked()` tries each queued mutation exactly once. If a transient error occurs (DB busy, lock contention), the mutation stays in the queue forever with no backoff. The queue also has no size limit — if the DB is down for a long session, thousands of mutations could pile up.

**Step 1:** Add a `MAX_QUEUE_SIZE` constant and enforce it in `queue_mutation()`:

Find this in `offline_queue.rs`:
```rust
async fn queue_mutation(sql: &str, params: Vec<String>) -> Result<(), JsValue> {
```

Replace with:
```rust
const MAX_QUEUE_SIZE: usize = 500;

async fn queue_mutation(sql: &str, params: Vec<String>) -> Result<(), JsValue> {
    // Enforce queue size limit — drop oldest if full
    let count = db_client::query(
        "SELECT COUNT(*) as cnt FROM offline_queue", vec![],
    ).await.ok()
        .and_then(|rows| rows.get(0)?.get("cnt")?.as_u64())
        .unwrap_or(0) as usize;

    if count >= MAX_QUEUE_SIZE {
        // Drop oldest 10% to make room
        let drop_count = MAX_QUEUE_SIZE / 10;
        let _ = db_client::exec(
            &format!("DELETE FROM offline_queue WHERE id IN (SELECT id FROM offline_queue ORDER BY timestamp ASC LIMIT {})", drop_count),
            vec![],
        ).await;
        crate::dom::warn(&format!("[offline_queue] Queue full ({count}), dropped oldest {drop_count} entries"));
    }

    let mutation = QueuedMutation {
        sql: sql.to_string(),
        params,
        timestamp: crate::browser_apis::now_ms(),
    };
    let sql = "INSERT INTO offline_queue (sql, params, timestamp) VALUES (?1, ?2, ?3)";
    let params = vec![
        mutation.sql,
        serde_json::to_string(&mutation.params).unwrap_or_default(),
        mutation.timestamp.to_string(),
    ];
    db_client::exec(sql, params).await
}
```

**Step 2:** Add TTL cleanup in `flush_queue_locked()` — skip mutations older than 24 hours:

Before the for loop in `flush_queue_locked()`, add:
```rust
// Purge stale mutations older than 24h
let cutoff = crate::browser_apis::now_ms() - (24.0 * 60.0 * 60.0 * 1000.0);
let _ = db_client::exec(
    "DELETE FROM offline_queue WHERE timestamp < ?1",
    vec![cutoff.to_string()],
).await;
```

**Step 3:** Run `trunk build --release` — verify 0 errors.

**Step 4:** Commit: `fix: offline queue bounded size (500 max) + 24h TTL cleanup`

---

### Task 7: Add `db_client::wait_for_ready()` Timeout Error Reporting

**Files:**
- Modify: `rust/db_client.rs:9`

**Context:** `wait_for_ready()` loops 100 times × 50ms = 5s, then just proceeds with `dom::warn`. This silent failure means all subsequent DB operations will fail silently. We should report it as a structured error.

**Step 1:** Import and use the errors module at the top of `db_client.rs`. Change the timeout path:

In the `wait_for_ready()` function, replace:
```rust
dom::warn("[db] Worker init timed out after 5s — proceeding anyway");
```

with:
```rust
dom::warn("[db] Worker init timed out after 5s — proceeding anyway");
crate::errors::report(crate::errors::AppError::DatabaseInit {
    backend: "sqlite-opfs".to_string(),
    reason: "Worker init timed out after 5s".to_string(),
});
```

**Step 2:** Run `trunk build --release` — verify 0 errors.

**Step 3:** Commit: `fix: report structured error on DB worker init timeout`

---

### Tier 3: Speech & Audio Error Recovery

### Task 8: Add `onend`/`onerror` Handlers to Speech Utterances

**Files:**
- Modify: `rust/speech.rs:6`

**Context:** `say()` creates utterances but never attaches `onend` or `onerror` handlers. If speech fails silently (Safari bug, audio session interrupted), there's no recovery. The SpeechSynthesis API can also get stuck in a "speaking but producing no audio" state.

**Step 1:** Add error and stall detection to `say()`:

Replace the `say` function body. After `synth.speak(&utterance);`, add:

```rust
fn say(text: &str, rate: f32, pitch: f32) {
    init_voices();
    let synth = match dom::window().speech_synthesis() {
        Ok(s) => s,
        Err(_) => {
            dom::warn("[speech] SpeechSynthesis API unavailable");
            return;
        }
    };
    synth.cancel();
    let utterance = match SpeechSynthesisUtterance::new_with_text(text) {
        Ok(u) => u,
        Err(e) => {
            dom::warn(&format!("[speech] Failed to create utterance: {e:?}"));
            return;
        }
    };
    utterance.set_lang("en-US");
    utterance.set_rate(rate);
    utterance.set_pitch(pitch);
    PREFERRED_VOICE.with(|v| {
        if let Some(ref voice) = *v.borrow() {
            utterance.set_voice(Some(voice));
        }
    });

    // Error handler: log and recover
    let on_error = Closure::<dyn FnMut(web_sys::Event)>::new(move |_: web_sys::Event| {
        crate::dom::warn("[speech] Utterance error — speech synthesis may need restart");
    });
    utterance.set_onerror(Some(on_error.as_ref().unchecked_ref()));
    on_error.forget();

    synth.speak(&utterance);
}
```

**Step 2:** Run `trunk build --release` — verify 0 errors.

**Step 3:** Commit: `fix: add onerror handler to speech utterances for error recovery`

---

### Tier 4: PWA Update Safety

### Task 9: Guard SW Update Reload Against Active Games/Stories

**Files:**
- Modify: `rust/pwa.rs:4`

**Context:** `show_update_prompt()` calls `location.reload()` immediately when the user taps the toast. If the user is mid-game or mid-story, they lose progress. We should check if a game or story is active and defer the reload.

**Step 1:** Replace `show_update_prompt` with a guarded version:

```rust
fn show_update_prompt(reg: &web_sys::ServiceWorkerRegistration) {
    use wasm_bindgen::closure::Closure;
    dom::toast("\u{1F31F} Update available! Tap to refresh");
    if let Some(toast_el) = dom::query("[data-toast]") {
        let reg_clone = reg.clone();
        let cb = Closure::<dyn FnMut(web_sys::Event)>::once(move |_: web_sys::Event| {
            // Check if user is in an active game or story
            let game_active = dom::query("#game-arena")
                .map(|el| !el.has_attribute("hidden"))
                .unwrap_or(false);
            let story_active = dom::query("[data-story-active]").is_some();

            if game_active || story_active {
                dom::toast("Update will install after you finish playing!");
                // Defer: try again in 30s
                dom::set_timeout_once(30_000, move || {
                    show_update_prompt_force(&reg_clone);
                });
                return;
            }

            if let Some(waiting) = reg_clone.waiting() {
                let _ = waiting.post_message(
                    &wasm_bindgen::JsValue::from_str("{\"type\":\"SKIP_WAITING\"}")
                );
            }
            let _ = dom::window().location().reload();
        });
        let _ = toast_el.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
        cb.forget();
    }

fn show_update_prompt_force(reg: &web_sys::ServiceWorkerRegistration) {
    dom::toast("\u{1F31F} Update ready! Tap to refresh now");
    if let Some(toast_el) = dom::query("[data-toast]") {
        let reg_clone = reg.clone();
        let cb = Closure::<dyn FnMut(web_sys::Event)>::once(move |_: web_sys::Event| {
            if let Some(waiting) = reg_clone.waiting() {
                let _ = waiting.post_message(
                    &wasm_bindgen::JsValue::from_str("{\"type\":\"SKIP_WAITING\"}")
                );
            }
            let _ = dom::window().location().reload();
        });
        let _ = toast_el.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
        cb.forget();
    }
```

**Step 2:** Need `use wasm_bindgen::closure::Closure;` import — check if it's already at the top of `pwa.rs`.

**Step 3:** Run `trunk build --release` — verify 0 errors.

**Step 4:** Commit: `fix: guard SW update reload against active games/stories`

---

### Tier 5: Storage Pressure

### Task 10: Proactive Storage Cleanup When Pressure Is High

**Files:**
- Modify: `rust/storage_pressure.rs`

**Context:** Currently only warns at 80% — no automatic cleanup. If storage fills up, the app silently fails to save data.

**Step 1:** Add proactive cleanup when storage exceeds 80%:

Replace `warn_if_low()`:

```rust
pub async fn warn_if_low() {
    if let Some((used, total, pct)) = check_quota().await {
        if pct > 90 {
            dom::toast(&format!("Storage {pct}% full! Cleaning up..."));
            run_cleanup().await;
        } else if pct > 80 {
            dom::toast(&format!(
                "Storage {pct}% full ({used:.0}MB / {total:.0}MB)"
            ));
            run_cleanup().await;
        }

async fn run_cleanup() {
    // 1. Clear old errors (older than 7 days)
    if let Err(e) = crate::errors::clear_old_errors().await {
        dom::warn(&format!("[storage] Error cleanup failed: {e}"));
    }

    // 2. Flush and clear the offline queue
    if let Err(e) = crate::offline_queue::flush_queue().await {
        dom::warn(&format!("[storage] Queue flush failed: {e:?}"));
    }

    // 3. Clear old game scores (keep last 30 days)
    let cutoff = crate::utils::days_ago_key(30);
    let _ = crate::db_client::exec(
        "DELETE FROM game_scores WHERE day_key < ?1",
        vec![cutoff],
    ).await;

    dom::warn("[storage] Cleanup complete");
}
```

**Step 2:** Check if `utils::days_ago_key(n)` exists. If not, add a simple helper to `rust/utils.rs`:

```rust
pub fn days_ago_key(n: u32) -> String {
    let date = js_sys::Date::new_0();
    date.set_date(date.get_date() - n);
    let y = date.get_full_year();
    let m = date.get_month() + 1;
    let d = date.get_date();
    format!("{y:04}-{m:02}-{d:02}")
}
```

**Step 3:** Run `trunk build --release` — verify 0 errors.

**Step 4:** Commit: `fix: proactive storage cleanup at 80%+ quota pressure`

---

### Tier 6: Defensive Patterns

### Task 11: Replace Bare `spawn_local` with `spawn_local_logged` Across Codebase

**Files:**
- Modify: All files using bare `spawn_local` that should use `spawn_local_logged`

**Context:** `browser_apis::spawn_local_logged(label, future)` wraps async tasks with error logging. Many places still use bare `wasm_bindgen_futures::spawn_local()` which swallows errors silently.

**Step 1:** Search for bare `spawn_local` calls:
```bash
grep -rn "spawn_local" rust/ | grep -v "spawn_local_logged" | grep -v "//.*spawn_local" | grep -v "pub fn spawn_local_logged"
```

**Step 2:** For each bare `spawn_local(async { ... })` that contains fallible operations (DB calls, network), replace with `browser_apis::spawn_local_logged("label", async { ... })`. The future must return `Result<(), JsValue>`.

**Key candidates:**
- `errors/reporter.rs:29` — `spawn_local(async move { ... persist_error ... })` → wrap with logged
- `lib.rs:7` — `spawn_local(async { gpu::init().await; })` — GPU init should be logged
- `pwa.rs:2` — `wasm_bindgen_futures::spawn_local(async move { ... })` for SW registration

For `spawn_local` calls in `lib.rs` that don't return `Result`, keep them as-is (they're simple fire-and-forget).

**Step 3:** Run `trunk build --release` — verify 0 errors.

**Step 4:** Commit: `fix: replace bare spawn_local with spawn_local_logged for error visibility`

---

### Task 12: Add `#[allow(dead_code)]` Audit and Cleanup Warning Suppression

**Files:**
- Modify: Multiple files with `#[allow(dead_code)]` or `#[allow(unused_imports)]`

**Context:** The build currently has 21 warnings in `emotion_vocabulary.rs`. Clean builds are important for catching real issues. However, many `#[allow(dead_code)]` annotations exist for good reasons (gesture-triggered code paths, debug-only code). This task focuses on reducing noise, not removing valid annotations.

**Step 1:** Run `trunk build --release 2>&1 | grep "warning"` to get current warning list.

**Step 2:** For each warning:
- If it's a genuinely unused item → remove the dead code
- If it's used via runtime paths the compiler can't see → add `#[allow(dead_code)]` with a comment explaining why
- If it's an unused import → remove the import

**Step 3:** Target: reduce to <5 warnings.

**Step 4:** Run `trunk build --release` — verify reduced warnings.

**Step 5:** Commit: `refactor: suppress valid dead_code warnings, remove genuine dead code`

---

### Task 13: Add Defensive `pagehide` Data Flush

**Files:**
- Modify: `rust/lib.rs`

**Context:** The `pagehide` handler (lib.rs line 8) calls `db_client::flush_sync()` which sends pending mutations synchronously. But if the offline queue also has pending items, those aren't flushed. And the handler doesn't catch errors.

**Step 1:** The current handler is:
```rust
dom::on(dom::window().unchecked_ref(), "pagehide", |_: web_sys::Event| {
    db_client::flush_sync();
});
```

This is actually correct as-is — `flush_sync()` handles the mutation queue synchronously (critical for `pagehide`), and the offline queue is persisted in the DB already (it doesn't need a separate flush). The offline queue flush happens on visibility change (line 7).

**Actually, no changes needed here.** The current implementation is correct:
- `pagehide` → `flush_sync()` sends pending write-back mutations
- `visibilitychange` → `offline_queue::flush_queue()` replays failed mutations

**Step 2:** Skip this task — mark as completed with no changes.

---

## Actions
_No actions recorded._

## Validation
**Files:**
- No files modified — verification only

**Step 1:** Run `trunk build --release` — confirm 0 errors, <5 warnings.

**Step 2:** Run `trunk serve --address 0.0.0.0` — load on iPad mini 6 Safari 26.2.

**Step 3:** Smoke test checklist:
- [ ] App boots successfully (loading screen → home)
- [ ] Navigate all 5 panels (home, tracker, quests, stories, rewards)
- [ ] Log a kind act → hearts increment, Sparkle celebrates
- [ ] Open a game → play briefly → return to menu
- [ ] Open a story → karaoke highlights words → replay button works
- [ ] Tap Sparkle → conversation menu appears
- [ ] Toast appears and disappears correctly
- [ ] Turn off WiFi → app still works fully offline

**Step 4:** Commit: `chore: Wave 4 code hardening complete — build verified`

---

## References
_No references recorded._

