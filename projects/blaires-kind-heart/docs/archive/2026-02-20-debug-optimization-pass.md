# Wave 9: Debug & Optimization Pass — Blaire's Kind Heart

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Fix 1 critical data-loss bug (missing `combo` column silently breaks game score hydration), 1 important power-drain bug (GPU particles rendering while backgrounded), and 6 minor code-quality issues for a clean, launch-ready codebase.

**Architecture:** No new modules. All changes are surgical fixes in existing files: 1 DB schema ALTER, 1 SQL query fix, 1 visibility handler wire-up, dead code removal, and small cleanups. Each task is independent except Task 2 depends on Task 1.

**Tech Stack:** Rust/WASM, web-sys, wasm-bindgen, SQLite (OPFS Web Worker), WebGPU

**Git state:** Branch `main`, HEAD `dc1a03c`, build passes with 0 warnings, SW cache at v12

---

## Task 1: Fix Missing `combo` Column in `game_scores` Table (CRITICAL)

**Files:**
- Modify: `public/db-worker.js` — add `combo` column to `game_scores` CREATE TABLE + add migration

**Context:** The `game_scores` table (line 178-186 of `db-worker.js`) does NOT have a `combo` column. But the hydration query in `rust/lib.rs:46` references `COALESCE(MAX(CASE WHEN game_id = 'catcher' THEN combo END), 0) as catcher_combo`. This causes the entire hydration query to fail with a SQLite error. The `if let Ok(rows)` guard at line 46 silently swallows the error, meaning **all game statistics** (high scores, best times, play counts, games-today) are lost between sessions.

The `save_game_score` function in `rust/games.rs:41` only inserts `(id, game_id, score, level, duration_ms, played_at, day_key)` — it never saves `combo`. Meanwhile `game_catcher.rs` tracks `combo_best` in-memory (state field `catcher_best_combo`) but never persists it to DB.

**Fix strategy:** Add `combo` column to the schema + add ALTER TABLE migration for existing databases + update `save_game_score` to also save combo.

**Step 1:** In `public/db-worker.js`, modify the `game_scores` CREATE TABLE (line 178-186) to add the combo column:

Change:
```sql
  CREATE TABLE IF NOT EXISTS game_scores (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    played_at INTEGER NOT NULL,
    day_key TEXT NOT NULL
  );
```

To:
```sql
  CREATE TABLE IF NOT EXISTS game_scores (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    combo INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    played_at INTEGER NOT NULL,
    day_key TEXT NOT NULL
  );
```

**Step 2:** Add a migration after the main SCHEMA block executes. In the `initDb` function body (after `db.exec(SCHEMA);` around line 308), add a safe ALTER TABLE migration:

```javascript
  // Migration: add combo column if missing (Wave 9)
  try {
    db.exec("ALTER TABLE game_scores ADD COLUMN combo INTEGER NOT NULL DEFAULT 0");
  } catch (e) {
    // Column already exists — ignore "duplicate column name" error
  }
```

This is safe because SQLite's ALTER TABLE ADD COLUMN is a no-op error if the column already exists, and the try/catch handles it. New installs get the column from CREATE TABLE; existing installs get it from ALTER TABLE.

**Step 3:** Run `trunk build --release` — verify 0 errors, 0 warnings.

**Step 4:** Commit: `fix(critical): add missing combo column to game_scores table`

---

## Task 2: Wire Combo into `save_game_score` + Fix Catcher Save Call

**Files:**
- Modify: `rust/games.rs:41` — add `combo` parameter to `save_game_score`
- Modify: `rust/game_catcher.rs:16` — pass combo_best to save call
- Modify: `rust/game_memory.rs` — pass 0 for combo
- Modify: `rust/game_hug.rs` — pass 0 for combo
- Modify: `rust/game_paint.rs` — pass 0 for combo
- Modify: `rust/game_unicorn.rs` — pass 0 for combo

**Context:** `save_game_score` (games.rs:41) inserts 7 columns but the DB now has 8 (with `combo`). Need to add `combo` param to the function and all call sites.

**Step 1:** In `rust/games.rs`, change `save_game_score` signature and INSERT to include combo:

Change:
```rust
pub fn save_game_score(op_name: &'static str, game_id: &str, score: u64, level: u64, duration_ms: u64) {
    let id = utils::create_id(); let day_key = utils::today_key(); let now = utils::now_epoch_ms();
    db_client::exec_fire_and_forget(
        op_name,
        "INSERT INTO game_scores (id, game_id, score, level, duration_ms, played_at, day_key) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        vec![id, game_id.to_string(), score.to_string(), level.to_string(), duration_ms.to_string(), now.to_string(), day_key],
    );
}
```

To:
```rust
pub fn save_game_score(op_name: &'static str, game_id: &str, score: u64, level: u64, combo: u64, duration_ms: u64) {
    let id = utils::create_id(); let day_key = utils::today_key(); let now = utils::now_epoch_ms();
    db_client::exec_fire_and_forget(
        op_name,
        "INSERT INTO game_scores (id, game_id, score, level, combo, duration_ms, played_at, day_key) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        vec![id, game_id.to_string(), score.to_string(), level.to_string(), combo.to_string(), duration_ms.to_string(), now.to_string(), day_key],
    );
}
```

**Step 2:** In `rust/game_catcher.rs:16`, update the save call to pass `combo_best`:

Change:
```rust
games::save_game_score("catcher-save", "catcher", score as u64, level as u64, duration_ms);
```

To:
```rust
games::save_game_score("catcher-save", "catcher", score as u64, level as u64, combo_best as u64, duration_ms);
```

**Step 3:** In all other game modules that call `save_game_score`, add `0` for combo:
- `rust/game_memory.rs` — find the `save_game_score` call, add `0` before `duration_ms`
- `rust/game_hug.rs` — find the `save_game_score` call, add `0` before `duration_ms`
- `rust/game_paint.rs` — find the `save_game_score` call, add `0` before `duration_ms`
- `rust/game_unicorn.rs` (or `game_unicorn_unicorn.rs`) — find the `save_game_score` call, add `0` before `duration_ms`

**Step 4:** Run `trunk build --release` — verify 0 errors, 0 warnings.

**Step 5:** Commit: `fix(critical): persist combo in game_scores, wire all save call sites`

---

## Task 3: Pause GPU Particles When App Is Backgrounded (IMPORTANT)

**Files:**
- Modify: `rust/lib.rs:7` — add `gpu_particles::set_paused()` in visibility change handler

**Context:** `gpu_particles.rs:11` defines `RENDERING_PAUSED: RefCell<bool>` and the `spawn_burst` function at line 21 checks it to skip rendering. But nothing ever sets this flag. The visibility change handler in `lib.rs:7` only calls `synth_audio::on_visibility_change(visible)`. GPU particles continue running `requestAnimationFrame` loops when the app is in the background, draining battery on the iPad.

**Step 1:** In `rust/gpu_particles.rs`, add a public setter function. Add after line 14 (after the `burst` function):

```rust
pub fn set_paused(paused: bool) {
    RENDERING_PAUSED.with(|cell| {
        *cell.borrow_mut() = paused;
    });
}
```

**Step 2:** In `rust/lib.rs:7`, wire the visibility change handler to also pause GPU particles. The current handler is:

```rust
browser_apis::on_visibility_change(move |visible| {
    synth_audio::on_visibility_change(visible);
    if visible {
        browser_apis::spawn_local_logged("offline_queue::flush", async { offline_queue::flush_queue().await });
    }
});
```

Change to:
```rust
browser_apis::on_visibility_change(move |visible| {
    synth_audio::on_visibility_change(visible);
    gpu_particles::set_paused(!visible);
    if visible {
        browser_apis::spawn_local_logged("offline_queue::flush", async { offline_queue::flush_queue().await });
    }
});
```

**Step 3:** Run `trunk build --release` — verify 0 errors, 0 warnings.

**Step 4:** Commit: `fix: pause GPU particles when app is backgrounded`

---

## Task 4: Remove Unused `PRECACHE_ASSETS` Constant from SW Assets

**Files:**
- Modify: `public/sw-assets.js` — remove line 249

**Context:** Line 249 of `sw-assets.js` defines `const PRECACHE_ASSETS = [...CRITICAL_ASSETS, ...DEFERRED_ASSETS];` but this constant is never referenced in `sw.js` or anywhere else. The SW install handler uses `CRITICAL_ASSETS` directly and the activate handler uses `DEFERRED_ASSETS` directly. This is dead code.

**Step 1:** In `public/sw-assets.js`, remove line 249:
```javascript
const PRECACHE_ASSETS = [...CRITICAL_ASSETS, ...DEFERRED_ASSETS];
```

**Step 2:** Verify by searching for any reference to `PRECACHE_ASSETS` in the codebase (there should be none).

**Step 3:** Commit: `chore: remove unused PRECACHE_ASSETS constant`

---

## Task 5: Remove Unused `fetchPromise` Variable in SW Fetch Handler

**Files:**
- Modify: `public/sw.js` — restructure stale-while-revalidate block to not create unused binding

**Context:** In `sw.js` lines 119-130, the stale-while-revalidate block creates `const fetchPromise = fetch(...)` but the variable is never used (the `return cached;` on line 129 returns immediately). The fetch still fires in the background (good), but the unused binding is misleading.

**Step 1:** In `public/sw.js`, change the stale-while-revalidate block from:

```javascript
      if (cached && isAppLogic) {
        // Serve stale, fetch fresh in background
        const fetchPromise = fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        }).catch(() => cached); // Fallback to cached on network error

        return cached; // Return stale immediately
      }
```

To:

```javascript
      if (cached && isAppLogic) {
        // Serve stale, fetch fresh in background (fire-and-forget)
        fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
        }).catch(() => {}); // Ignore network errors for background revalidation

        return cached; // Return stale immediately
      }
```

**Step 2:** Commit: `chore: remove unused fetchPromise variable in SW`

---

## Task 6: Consolidate `offline_queue` and `errors` Tables into Main Schema

**Files:**
- Modify: `public/db-worker.js` — add `offline_queue` and `errors` CREATE TABLE + indexes to SCHEMA
- Modify: `rust/offline_queue.rs` — remove `CREATE TABLE` from `init()`
- Modify: `rust/errors/reporter.rs` — remove `CREATE TABLE` from `init_schema()`

**Context:** Two tables (`offline_queue` and `errors`) are created by Rust modules at boot rather than in the main DB schema in `db-worker.js`. This means:
1. They're created after `wait_for_ready()` returns, introducing a race condition with any code that tries to use them immediately
2. They're not included in the restoreTables list for snapshot/restore
3. The schema is split across 3 locations instead of 1

**Step 1:** In `public/db-worker.js`, add to the end of the SCHEMA template literal (before the closing backtick, after the `family_acts` index around line 296):

```sql
  CREATE TABLE IF NOT EXISTS offline_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sql TEXT NOT NULL,
    params TEXT NOT NULL,
    timestamp REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp REAL NOT NULL,
    severity INTEGER NOT NULL,
    error_json TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_errors_timestamp ON errors(timestamp);
```

**Step 2:** In `rust/offline_queue.rs:3`, change the `init()` function to remove the CREATE TABLE and only flush the queue:

Change:
```rust
pub async fn init() -> Result<(), JsValue> {
    db_client::exec(
        "CREATE TABLE IF NOT EXISTS offline_queue ( id INTEGER PRIMARY KEY AUTOINCREMENT, sql TEXT NOT NULL, params TEXT NOT NULL, timestamp REAL NOT NULL)",
        vec![],
    ).await
}
```

To:
```rust
pub async fn init() -> Result<(), JsValue> {
    flush_queue().await;
    Ok(())
}
```

**Step 3:** In `rust/errors/reporter.rs`, change `init_schema()` (line 73) to a no-op:

Change:
```rust
pub async fn init_schema() -> Result<(), String> {
    let create_table_sql = r#"
        CREATE TABLE IF NOT EXISTS errors (
            id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp REAL NOT NULL, severity INTEGER NOT NULL,
            error_json TEXT NOT NULL);
    "#;
    db_client::exec(create_table_sql, vec![]).await.map_err(|e| format!("Schema table init failed: {:?}", e))?;

    let create_index_sql = "CREATE INDEX IF NOT EXISTS idx_errors_timestamp ON errors(timestamp);";
    db_client::exec(create_index_sql, vec![]).await.map_err(|e| format!("Schema index init failed: {:?}", e))?;

    Ok(())
```

To:
```rust
pub async fn init_schema() -> Result<(), String> {
    // Tables now created in db-worker.js SCHEMA (Wave 9)
    Ok(())
```

**Step 4:** Run `trunk build --release` — verify 0 errors, 0 warnings.

**Step 5:** Commit: `refactor: consolidate offline_queue and errors tables into main schema`

---

## Task 7: Replace Inline `onerror` Handlers with CSS Fallback

**Files:**
- Modify: `index.html` — remove 3 inline `onerror` handlers, add CSS-only fallback

**Context:** Three `<img>` tags on the home screen (lines 183, 191, 198 of `index.html`) use inline `onerror="this.style.display='none';this.nextElementSibling.style.display='block'"`. This is fragile with Trusted Types (which this app enforces via `dom::init_trusted_types()`) and pollutes the HTML with JavaScript.

Better approach: use CSS to show emoji fallback when image fails via `:not([src])` or by letting the `error` event be handled in Rust.

Actually, the simplest fix is: the images are all precached in CRITICAL_ASSETS so they'll never fail in production. For development (where they might not be cached), use a CSS-only approach.

**Step 1:** In `index.html`, remove the `onerror` attribute from all 3 `<img>` tags. Change each from:

```html
<img class="home-btn-img" src="..." ... onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
```

To:

```html
<img class="home-btn-img" src="..." ...>
```

**Step 2:** In `src/styles/home.css`, add a CSS rule that shows the emoji fallback sibling when the image fails to load (broken images have zero natural dimensions):

```css
/* Fallback: show emoji when image fails to load */
.home-btn-img:not([src]),
.home-btn-img[src=""] {
  display: none;
}
.home-btn-img:not([src]) + .home-btn-emoji,
.home-btn-img[src=""] + .home-btn-emoji {
  display: block;
}
```

**Step 3:** In `rust/companion.rs` or `rust/lib.rs` boot sequence, add a global error handler for images to handle runtime load failures. Actually, a simpler approach: in `cache_boot_elements()` or the boot post-setup, add a delegated error listener on the home grid that hides broken images and shows the emoji:

In `rust/lib.rs`, after `cache_boot_elements();` in boot batch 2, add a call to a small helper. Or more simply, add to `src/styles/home.css`:

```css
/* Broken image fallback — hide broken img, show emoji sibling */
.home-btn-img[data-failed] {
  display: none !important;
}
.home-btn-img[data-failed] + .home-btn-emoji {
  display: block !important;
}
```

And in `rust/lib.rs` post-boot (after the `for btn` loop around line 12), add:

```rust
// Image error fallback: mark broken images so CSS shows emoji
if let Some(grid) = dom::query(".home-grid") {
    dom::on_with_capture(grid.unchecked_ref(), "error", true, |event: web_sys::Event| {
        if let Some(el) = dom::event_target_element(&event) {
            if el.class_list().contains("home-btn-img") {
                let _ = el.set_attribute("data-failed", "");
            }
        }
    });
}
```

Wait — `dom::on_with_capture` may not exist. Let's keep it simpler. The images are in CRITICAL_ASSETS and always precached, so they won't fail in production. For safety, just remove the inline JS and add a simple Rust error handler during boot.

**Revised Step 2:** Add to `src/styles/home.css`:
```css
.home-btn-img[data-failed] { display: none; }
.home-btn-img[data-failed] + .home-btn-emoji { display: block; }
```

**Revised Step 3:** In the boot post-setup section of `rust/lib.rs`, after the existing `for btn` loop (line 12), add image error handling using the standard event listener approach with capture phase:

```rust
// Image error fallback: mark failed images so CSS shows emoji
{
    let grid_el = dom::query(".home-grid");
    if let Some(grid) = grid_el {
        let cb = wasm_bindgen::closure::Closure::<dyn FnMut(web_sys::Event)>::new(move |event: web_sys::Event| {
            if let Some(target) = event.target() {
                if let Ok(el) = target.dyn_into::<web_sys::Element>() {
                    if el.class_list().contains("home-btn-img") {
                        let _ = el.set_attribute("data-failed", "");
                    }
                }
            }
        });
        let mut opts = web_sys::AddEventListenerOptions::new();
        opts.capture(true);
        let _ = grid.add_event_listener_with_callback_and_add_event_listener_options(
            "error", cb.as_ref().unchecked_ref(), &opts
        );
        cb.forget();
    }
}
```

**Step 4:** Run `trunk build --release` — verify 0 errors, 0 warnings.

**Step 5:** Commit: `fix: replace inline onerror with Rust error handler + CSS fallback`

---

## Task 8: Final Build Verification & SW Version Bump

**Files:**
- Modify: `public/sw.js` — bump `CACHE_VERSION`

**Step 1:** Run `trunk build --release` — verify **0 errors, 0 warnings**.

**Step 2:** Bump `CACHE_NAME` in `public/sw.js` from `'kindheart-v12'` to `'kindheart-v13'` with comment `// Wave 9: debug & optimization pass`.

**Step 3:** Commit: `chore: bump SW cache to v13 for Wave 9 debug pass`

---

## Verification

1. `trunk build --release` — **0 errors, 0 warnings**
2. **Game score hydration (CRITICAL fix):** Play Kindness Catcher → get a score + combo → close and reopen app → game hub should show correct high score, level, and combo
3. **GPU particles paused:** Open app → trigger celebration (confetti) → switch away to another app → come back → no battery drain, particles resume normally
4. **Dead code:** No `PRECACHE_ASSETS` or unused `fetchPromise` variable
5. **Schema consolidation:** `offline_queue` and `errors` tables created by DB worker, not Rust modules
6. **Image fallback:** Home screen images load normally; if manually broken, emoji fallback appears (no inline JS)
7. All existing features unchanged

---

## Critical Files

| File | Changes |
|------|---------|
| `public/db-worker.js` | Add `combo` column + migration, add `offline_queue`/`errors` tables to SCHEMA |
| `rust/games.rs` | Add `combo` param to `save_game_score` |
| `rust/game_catcher.rs` | Pass `combo_best` to save call |
| `rust/game_memory.rs` | Pass `0` for combo |
| `rust/game_hug.rs` | Pass `0` for combo |
| `rust/game_paint.rs` | Pass `0` for combo |
| `rust/game_unicorn.rs` or `game_unicorn_unicorn.rs` | Pass `0` for combo |
| `rust/gpu_particles.rs` | Add `set_paused()` public function |
| `rust/lib.rs` | Wire `gpu_particles::set_paused()` in visibility handler + image error handler |
| `rust/offline_queue.rs` | Remove CREATE TABLE from init |
| `rust/errors/reporter.rs` | Remove CREATE TABLE from init_schema |
| `public/sw-assets.js` | Remove unused `PRECACHE_ASSETS` |
| `public/sw.js` | Fix unused `fetchPromise`, bump cache v12 → v13 |
| `index.html` | Remove 3 inline `onerror` handlers |
| `src/styles/home.css` | Add broken-image CSS fallback |

### Existing utilities to reuse

- `games::save_game_score()` — `rust/games.rs:41`
- `gpu_particles::RENDERING_PAUSED` — `rust/gpu_particles.rs:11`
- `browser_apis::on_visibility_change()` — `rust/lib.rs:7`
- `dom::query()`, `dom::on()` — `rust/dom.rs`
- `wasm_bindgen::closure::Closure` — standard wasm-bindgen pattern
