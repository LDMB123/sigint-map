# Phase 3 Bug Fixes - Consolidated Implementation Plan

## Status: 32 bugs found, fixing in priority order

### ✅ COMPLETED (1/32)

**Bug #1: Assets not copied to build** - FIXED
- Added companion + gardens copy directives to index.html
- Verified: 18 + 60 WebP files now in dist/

---

## 🔴 CRITICAL PRIORITY (6 remaining)

### Bug #2: Service Worker precache missing CSS files

**File**: `public/sw-assets.js`
**Fix**: Add 3 missing CSS files to PRECACHE_ASSETS array

```javascript
// Add after line 120:
'/scroll-effects.css',
'/particle-effects.css',
'/gardens.css',
```

---

### Bug #3: Gardens seed function is empty

**File**: `rust/gardens.rs` lines 466-472
**Fix**: Implement test garden seeding

```rust
pub async fn seed_gardens() {
    use crate::db_client;

    // Check if already seeded
    let check_sql = "SELECT COUNT(*) as count FROM gardens";
    let count = match db_client::query(check_sql, vec![]).await {
        Ok(rows) => rows.as_array()
            .and_then(|arr| arr.get(0))
            .and_then(|row| row.get("count"))
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0),
        Err(_) => 0.0,
    };

    if count > 0.0 {
        console::log_1(&"[gardens] Gardens already seeded".into());
        return;
    }

    console::log_1(&"[gardens] Seeding test garden for development".into());

    let now = js_sys::Date::now() as i64;
    let sql = "INSERT INTO gardens (id, garden_name, quest_chain_id, theme_emoji, growth_stage, unlocked_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)";
    let params = vec![
        "garden-hug-1".into(),
        "Bunny Garden".into(),
        "chain-hug-1".into(),
        "🐰".into(),
        1.into(), // Start at stage 1 for testing
        now.to_string().into(),
    ];

    if let Err(e) = db_client::exec(sql, params).await {
        console::error_1(&format!("[gardens] Failed to seed: {:?}", e).into());
    }
}
```

---

### Bug #4: Stage index mapping wrong

**File**: `rust/gardens.rs` lines 411-420
**Fix**: Correct growth_stage → asset array index calculation

```rust
// REPLACE:
let stage_index = if growth_stage == 0 {
    0
} else {
    std::cmp::min((growth_stage - 1) as usize, 4)
};

// WITH:
let stage_index = std::cmp::min(growth_stage as usize, 4);
```

---

### Bug #5: OPFS detection broken - skip entirely on Safari

**File**: `public/db-worker.js` lines 14-24
**Fix**: Skip OPFS on Safari, default to kvvfs

```javascript
// REPLACE tryOpfs() function with:
async function tryOpfs(sqlite3) {
  // Safari 26.2 does NOT support FileSystemSyncAccessHandle
  // Skip OPFS detection entirely to avoid 30s timeout
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if (isSafari) {
    console.log('[db-worker] Safari detected, skipping OPFS');
    return null;
  }

  if (!sqlite3.oo1.OpfsDb) return null;
  try {
    const opfs = new sqlite3.oo1.OpfsDb('/blaires-kind-heart.sqlite3', 'cw');
    console.log('[db-worker] OPFS backend opened');
    return opfs;
  } catch (_) {
    console.warn('[db-worker] OPFS backend unavailable');
    return null;
  }
}
```

---

### Bug #6: Memory+blob export interval too long

**File**: `public/db-worker.js` line 41
**Fix**: Reduce export interval from 30s to 5s

```javascript
// REPLACE:
const db = new sqlite3.oo1.DB('/blaires-kind-heart.sqlite3', 'ct', 'memory');
const persist = new sqlite3.oo1.JsStorageDb('local');
persist.exportToStorage(db, 'blaires-kind-heart-backup');
setInterval(() => persist.exportToStorage(db, 'blaires-kind-heart-backup'), 30000);

// WITH:
const db = new sqlite3.oo1.DB('/blaires-kind-heart.sqlite3', 'ct', 'memory');
const persist = new sqlite3.oo1.JsStorageDb('local');
persist.exportToStorage(db, 'blaires-kind-heart-backup');
// Reduce from 30s to 5s to minimize data loss risk
setInterval(() => persist.exportToStorage(db, 'blaires-kind-heart-backup'), 5000);
```

---

### Bug #7: Missing CSS in Service Worker precache (duplicate of #2)
(Already covered above)

---

## 🟠 HIGH PRIORITY (8 bugs)

### Bug #8: Companion memory leak - ERROR_CLOSURES Vec

**File**: `rust/companion.rs` lines 165-169
**Fix**: Store closure on element instead of global Vec

```rust
// REPLACE:
thread_local! {
    static ERROR_CLOSURES: std::cell::RefCell<Vec<wasm_bindgen::closure::Closure<dyn FnMut()>>> =
        std::cell::RefCell::new(Vec::new());
}
ERROR_CLOSURES.with(|closures| closures.borrow_mut().push(error_closure));

// WITH:
// Store closure reference on img element to prevent leak
if let Some(html) = img.dyn_ref::<web_sys::HtmlElement>() {
    let key = wasm_bindgen::JsValue::from_str("__error_closure");
    let _ = web_sys::js_sys::Reflect::set(
        html,
        &key,
        error_closure.as_ref().unchecked_ref()
    );
}
error_closure.forget(); // Stored on element, will be GC'd with element
```

---

### Bug #9: Race condition in set_expression()

**File**: `rust/companion.rs` lines 286-315
**Fix**: Add pending render tracking to prevent stale renders

```rust
thread_local! {
    static PENDING_RENDER: std::cell::RefCell<Option<u32>> = const { std::cell::RefCell::new(None) };
}

fn set_expression(class: &'static str) {
    if let Some(el) = dom::query("[data-companion]") {
        // Remove all expression classes
        for &c in EXPRESSION_CLASSES {
            let _ = el.class_list().remove_1(c);
        }
        let _ = el.class_list().add_1(class);

        let request_id = RENDER_COUNTER.with(|c| {
            let id = c.get().wrapping_add(1);
            c.set(id);
            id
        });

        // Cancel previous pending render
        PENDING_RENDER.with(|cell| *cell.borrow_mut() = Some(request_id));

        let expression = match class {
            "companion--celebrating" | "companion--cheering" | "companion--dancing" => "celebrating",
            "companion--proud" | "companion--loving" => "proud",
            _ => "happy",
        };

        wasm_bindgen_futures::spawn_local(async move {
            let skin_id = crate::companion_skins::get_active_skin().await
                .unwrap_or_else(|| "default".to_string());

            // Check if still latest AND still pending
            let is_latest = PENDING_RENDER.with(|cell| {
                cell.borrow().as_ref().map_or(false, |&id| id == request_id)
            });
            if !is_latest {
                return; // Stale request
            }

            render_companion_with_skin(&skin_id, expression);

            // Clear pending
            PENDING_RENDER.with(|cell| *cell.borrow_mut() = None);
        });
    }
}
```

---

### Bug #10: Emoji fallback selector too broad

**File**: `rust/gardens.rs` lines 428-439
**Fix**: Capture container reference instead of global query

```rust
// REPLACE:
let emoji = garden.theme_emoji.to_string();
let error_closure = Closure::once(move || {
    if let Some(container) = dom::query(".garden-image-container") {
        container.set_inner_html(&format!(..., emoji));
    }
});

// WITH:
let emoji = garden.theme_emoji.to_string();
let img_container_clone = img_container.clone();
let error_closure = Closure::once(move || {
    img_container_clone.set_inner_html(&format!(
        "<div style=\"font-size: 120px; text-align: center; padding: 60px 0;\">{}</div>",
        emoji
    ));
});
```

---

## Additional Fixes Pending

See agent reports for detailed fixes for remaining 22 bugs:
- Safari View Transitions memory leak
- Navigation API state desync
- WebGPU device lost handling
- Web Locks serialization
- Type mismatches (i64 vs i32)
- NULL safety checks
- CSS animation issues
- And more...

---

## Testing After Fixes

1. Rebuild: `trunk build --release`
2. Verify 78 assets in dist/
3. Check Service Worker cache has all assets
4. Test gardens panel shows test garden
5. Rapid-tap companion - no flicker/leak
6. Force quit browser - data persists (5s export)
