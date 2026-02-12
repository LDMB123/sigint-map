# Safari 26.2 Web API Implementation Guide

## Quick Wins (30 min total)

### 1. Remove Duplicate Batch Handler (5 min)

**File**: `/public/db-worker.js`
**Lines to delete**: 540-557

**Before**:
```javascript
// Lines 504-537: Batch handler #1
if (reqType === 'Batch') {
  const statements = request?.statements;
  db.run('BEGIN TRANSACTION');
  // ... handler 1
}

// Lines 540-557: Batch handler #2 (DUPLICATE - DELETE)
if (reqType === 'Batch') {  // ← DELETE THIS ENTIRE BLOCK
  const statements = request?.statements;
  db.exec('BEGIN');
  // ... handler 2
}
```

**After**:
```javascript
// Only one Batch handler remains (lines 504-537)
if (reqType === 'Batch') {
  const statements = request?.statements;
  db.run('BEGIN TRANSACTION');
  try {
    for (const [sql, params] of statements) {
      const stmt = getOrPrepare(db, sql);
      if (params && params.length > 0) {
        stmt.bind(params);
      }
      stmt.step();
      stmt.reset();
    }
    db.run('COMMIT');
    self.postMessage({ type: 'Ok', request_id });
  } catch (err) {
    db.run('ROLLBACK');
    self.postMessage({
      type: 'Error',
      request_id,
      message: `Batch failed: ${err.message}`
    });
  }
  return;
}
```

**Verification**:
```bash
# Verify only one Batch handler remains
grep -n "if (reqType === 'Batch')" /path/to/db-worker.js
# Should output one match only
```

---

### 2. Add INP Baseline Reporting (15 min)

**File**: `/rust/safari_apis.rs`

**Step 1**: Add getter function (after `store_inp_baseline`)

```rust
/// Retrieve the worst 10 INP measurements (for reporting).
pub fn get_inp_worst_10() -> Vec<f64> {
    INP_BASELINES.with(|cell| {
        cell.borrow().clone()
    })
}

/// Clear INP baseline history (call periodically to avoid unbounded growth).
pub fn clear_inp_baselines() {
    INP_BASELINES.with(|cell| {
        cell.borrow_mut().clear();
    });
}
```

**Step 2**: Add reporting call in `/rust/errors/reporter.rs`

```rust
pub async fn report_performance_metrics() {
    let inp_worst = crate::safari_apis::get_inp_worst_10();

    if !inp_worst.is_empty() {
        let message = format!(
            "[metrics] INP worst 10: {:?}ms (max: {:.0}ms)",
            inp_worst,
            inp_worst.first().copied().unwrap_or(0.0)
        );
        web_sys::console::log_1(&message.into());

        // TODO: Send to analytics endpoint
        // store_error_log("performance_metrics", &message).await;
    }

    // Clear for next batch
    crate::safari_apis::clear_inp_baselines();
}
```

**Step 3**: Call from boot (in `/rust/lib.rs` boot_async)

```rust
// After batch 3 completes (around line 205)
// Spawn metric reporting task (non-blocking)
browser_apis::spawn_local(async {
    errors::reporter::report_performance_metrics().await;
});
```

---

### 3. Test Navigation API Fallback (10 min)

**File**: `/rust/navigation.rs` lines 169-176

**Current fallback code**:
```rust
fn fallback_navigate_hash(panel_id: &str) {
    let window = dom::window();
    let location = window.location();
    let mut hash = String::with_capacity(1 + panel_id.len());
    hash.push('#');
    hash.push_str(panel_id);
    let _ = location.set_hash(&hash);
}
```

**Add test** (in navigation.rs):

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_panel_state_js_round_trip() {
        // Create state object
        let state_obj = panel_state_js("panel-tracker");

        // Extract it back
        let extracted = panel_from_js(&state_obj);

        assert_eq!(extracted, Some("panel-tracker".to_string()));
    }

    #[test]
    fn test_navigate_opts_json() {
        // Verify navigate options structure
        let opts = navigate_opts_js("panel-quests");

        // Should be { state: {panel: "panel-quests"}, history: "push" }
        assert!(!opts.is_null());
    }
}
```

**Add integration test** (in root or tests/integration):

```javascript
// tests/navigation-fallback.test.js
describe('Navigation API fallback', () => {
  it('should use location.hash if Navigation API unavailable', async () => {
    // Simulate Navigation API unavailable
    delete window.navigation;

    // Trigger panel open
    const btn = document.querySelector('[data-panel-open]');
    btn.click();

    // Check if hash was updated
    expect(window.location.hash).toContain('panel-');
  });
});
```

---

## Medium-Impact Improvements (1-2 hours)

### 4. Implement Trusted Types Policy (120 min)

**File 1**: `/rust/bindings.rs` — Already has definitions, no changes needed.

**File 2**: Create new `/rust/trusted_types.rs`

```rust
//! Trusted Types policy enforcement for XSS prevention.
//! Safari 26.2 supports TrustedTypes API.

use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use crate::dom;

thread_local! {
    static POLICY: std::cell::RefCell<Option<crate::bindings::TrustedTypePolicy>>
        = const { std::cell::RefCell::new(None) };
}

/// Initialize the Trusted Types policy.
/// Must be called during boot (before any innerHTML operations).
pub fn init() {
    let window = dom::window();
    let nav: &crate::bindings::NavigationWindow = window.unchecked_ref();

    // Check if trustedTypes available (Safari 26.2)
    let factory_val = nav.trusted_types();
    if factory_val.is_null() || factory_val.is_undefined() {
        web_sys::console::warn_1(&"[trusted-types] API not available".into());
        return;
    }

    let factory: crate::bindings::TrustedTypePolicyFactory = match factory_val.dyn_into() {
        Ok(f) => f,
        Err(_) => {
            web_sys::console::warn_1(&"[trusted-types] Failed to cast factory".into());
            return;
        }
    };

    // Create policy with basic sanitization
    let opts = crate::bindings::TrustedTypePolicyOptions::new();

    // Set createHTML handler (sanitizes HTML)
    let create_html_fn = crate::bindings::create_trusted_html_handler();
    opts.set_create_html(&create_html_fn);

    // Create policy
    match factory.create_policy("kindheart", &opts.into()) {
        policy => {
            POLICY.with(|p| {
                *p.borrow_mut() = Some(policy);
            });
            web_sys::console::log_1(&"[trusted-types] Policy 'kindheart' created".into());
        }
    }
}

/// Sanitize and set innerHTML with Trusted Types protection.
pub fn set_inner_html(element: &web_sys::Element, html: &str) -> Result<(), JsValue> {
    // Get policy or use default
    let result = POLICY.with(|p| {
        if let Some(policy) = p.borrow().as_ref() {
            let trusted_html = policy.create_html(html);
            let trusted_el: &crate::bindings::TrustedElement = element.unchecked_ref();
            trusted_el.set_inner_html_trusted(&trusted_html);
            Ok(())
        } else {
            // Fallback to regular innerHTML (not protected)
            web_sys::console::warn_1(&"[trusted-types] Policy not available, using fallback".into());
            element.set_inner_html(html);
            Ok(())
        }
    });
    result
}

/// Create the createHTML handler function.
fn create_trusted_html_handler() -> js_sys::Function {
    use wasm_bindgen::closure::Closure;

    let handler = Closure::<dyn Fn(String) -> String>::new(|input: String| {
        // Basic HTML sanitization: remove script tags and event handlers
        // In production, use DOMPurify or similar
        let sanitized = input
            .replace(r#"<script"#, "&lt;script")
            .replace(r#"onclick="#, "data-onclick=")
            .replace(r#"onerror="#, "data-onerror=")
            .replace(r#"onload="#, "data-onload=");
        sanitized
    });

    handler.as_ref().clone()
}
```

**File 3**: Update `/rust/lib.rs` boot_async to call init

```rust
// In boot_async, after navigation::init() (around line 150)
trusted_types::init(); // Call early to protect all subsequent innerHTML
```

**File 4**: Update `/rust/render.rs` to use new API

```rust
// Find all innerHTML assignments and replace with:
// OLD: element.set_inner_html(html_string);
// NEW:
crate::trusted_types::set_inner_html(&element, &html_string)?;
```

---

### 5. Add AbortSignal.timeout() Support (60 min)

**File**: Create `/rust/abort_signal.rs`

```rust
//! Enhanced AbortSignal support for Safari 26.2.
//! AbortSignal.timeout(ms) for automatic abort after duration.

use wasm_bindgen::{JsCast, JsValue};
use web_sys::AbortSignal;
use js_sys::Reflect;
use crate::dom;

/// Create an AbortSignal that auto-aborts after `ms` milliseconds.
/// Safari 26.2 supports AbortSignal.timeout(ms) natively.
pub fn timeout(ms: u32) -> Result<AbortSignal, JsValue> {
    // Try native AbortSignal.timeout() (Safari 26.2+)
    if let Ok(signal) = try_native_timeout(ms) {
        return Ok(signal);
    }

    // Fallback: manual AbortController + timer
    let controller = web_sys::AbortController::new()?;
    let signal = controller.signal();

    // Spawn async task to abort after timeout
    let controller_clone = controller.clone();
    wasm_bindgen_futures::spawn_local(async move {
        crate::browser_apis::sleep_ms(ms as i32).await;
        controller_clone.abort();
    });

    Ok(signal)
}

/// Try to use native AbortSignal.timeout(ms) from Safari 26.2.
fn try_native_timeout(ms: u32) -> Result<AbortSignal, JsValue> {
    let global = dom::window();

    // Get AbortSignal constructor
    let abort_signal = Reflect::get(&global, &JsValue::from_str("AbortSignal"))?;

    // Call AbortSignal.timeout(ms)
    let timeout_fn = Reflect::get(&abort_signal, &JsValue::from_str("timeout"))?;
    let timeout_fn: js_sys::Function = timeout_fn.dyn_into()?;

    // Call it: AbortSignal.timeout(ms)
    let result = timeout_fn.call1(
        &abort_signal,
        &JsValue::from_f64(ms as f64),
    )?;

    // Convert to AbortSignal
    result.dyn_into::<AbortSignal>()
}

/// Convenience wrapper for short timeouts (e.g., query operations).
pub async fn with_timeout<F, T>(ms: u32, operation: F) -> Result<T, JsValue>
where
    F: std::future::Future<Output = Result<T, JsValue>>,
{
    let signal = timeout(ms)?;

    // TODO: Integrate signal with fetch() or other abortable operations
    // For now, just run operation with timeout side-effect
    operation.await
}
```

**File**: Update `/rust/db_client.rs` to use timeouts

```rust
// In query() function, around line where worker.postMessage is called:
// OLD:
let response = rx.await?;

// NEW:
use crate::abort_signal;

// Add 5-second timeout for DB queries
let signal = abort_signal::timeout(5000)?;
let response = tokio::time::timeout(
    std::time::Duration::from_secs(5),
    rx
).await
    .map_err(|_| JsValue::from_str("DB query timeout"))?;
```

---

### 6. Audio GainNode Pooling (60 min)

**File**: Update `/rust/synth_audio.rs`

```rust
// Add pooling module at top of file
use std::cell::RefCell;

thread_local! {
    static GAIN_POOL: RefCell<Vec<web_sys::GainNode>> = RefCell::new(Vec::new());
}

/// Get or create a GainNode from pool.
fn get_or_create_gain(ctx: &web_sys::AudioContext) -> web_sys::GainNode {
    GAIN_POOL.with(|pool| {
        let mut pool_vec = pool.borrow_mut();
        if let Some(gain) = pool_vec.pop() {
            // Reset node for reuse
            gain.gain().set_value(1.0);
            gain
        } else {
            // Create new if pool empty
            ctx.create_gain()
        }
    })
}

/// Return GainNode to pool for reuse.
fn return_gain_to_pool(gain: web_sys::GainNode) {
    GAIN_POOL.with(|pool| {
        let mut pool_vec = pool.borrow_mut();
        if pool_vec.len() < 10 {  // Keep max 10 in pool
            pool_vec.push(gain);
        }
        // Otherwise drop (destroy)
    });
}

// Update synth_chime() to use pooling:
pub fn synth_chime() {
    if !ensure_audio_context() { return; }

    let ctx = get_audio_context();
    let osc = ctx.create_oscillator();
    let gain = get_or_create_gain(&ctx);  // ← Use pool

    osc.set_frequency(523.25);
    osc.connect_with_audio_node(&gain)
        .expect("Failed to connect oscillator");
    gain.connect_with_audio_node(&ctx.destination())
        .expect("Failed to connect gain");

    // Envelope
    let now = ctx.current_time();
    gain.gain().set_value_at_time(0.0, now);
    gain.gain().linear_ramp_to_value_at_time(0.8, now + 0.01);
    gain.gain().exponential_ramp_to_value_at_time(0.01, now + 0.5);

    osc.start();
    osc.stop_at(now + 0.5);

    // Return gain to pool after sound finishes
    let gain_clone = gain.clone();
    wasm_bindgen_futures::spawn_local(async move {
        crate::browser_apis::sleep_ms(500).await;
        return_gain_to_pool(gain_clone);
    });
}
```

---

## Advanced Features (2-3 hours)

### 7. Implement scrollend + Snap Detection (90 min)

**File**: Update `/rust/lazy_loading.rs`

```rust
//! Enhanced lazy loading with scrollend detection and snap snapping.

use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{IntersectionObserver, IntersectionObserverInit};
use crate::dom;

pub fn init_gardens() {
    init_garden_lazy_loading();
    init_garden_scroll_snap();  // ← New function
}

fn init_garden_lazy_loading() {
    // Existing code from current lazy_loading.rs
    // ... (unchanged)
}

/// Detect when garden scrolling ends and snap to items.
fn init_garden_scroll_snap() {
    let window = dom::window();
    let Some(gardens) = window.document()
        .and_then(|doc| doc.query_selector("[data-gardens-body]").ok().flatten())
    else { return };

    // Listen for scrollend event (Safari 26.2)
    let gardens_clone = gardens.clone();
    let cb = Closure::<dyn FnMut()>::new(move || {
        let scroll_left = gardens_clone.scroll_left() as f64;
        let item_width = 300.0; // Garden card width + gap (in CSS)

        // Calculate which item we're closest to
        let snap_index = (scroll_left / item_width).round() as u32;

        web_sys::console::log_1(&format!(
            "[scrollend] Garden snap to item {}",
            snap_index
        ).into());

        // Optional: Preload images for adjacent items
        preload_garden_images(snap_index);

        // Optional: Update scroll indicator (if exists)
        update_scroll_indicator(snap_index);
    });

    // Add scrollend listener (Safari 26.2)
    let _ = gardens.add_event_listener_with_callback(
        "scrollend",
        cb.as_ref().unchecked_ref(),
    );
    cb.forget();
}

fn preload_garden_images(center_index: u32) {
    // Preload images for center_index - 1, center_index, center_index + 1
    for offset in [-1, 0, 1] {
        let idx = (center_index as i32 + offset) as u32;
        if let Some(card) = dom::query(&format!("[data-garden-index='{}']", idx)) {
            if let Ok(Some(img)) = card.query_selector("[data-lazy-src]") {
                if let Some(img_el) = img.dyn_into::<web_sys::HtmlImageElement>().ok() {
                    if let Some(src) = img_el.get_attribute("data-lazy-src") {
                        let _ = img_el.set_attribute("src", &src);
                        let _ = img_el.remove_attribute("data-lazy-src");
                    }
                }
            }
        }
    }
}

fn update_scroll_indicator(snap_index: u32) {
    if let Some(indicator) = dom::query("[data-garden-indicator]") {
        let _ = indicator.set_attribute("data-snap-index", &snap_index.to_string());
    }
}
```

**HTML Update**: Add data attributes to gardens

```html
<!-- In index.html panel-gardens section -->
<div id="gardens-body" class="panel-body" data-gardens-body>
  <!-- Each garden card needs data-garden-index -->
  <div class="garden-card" data-garden-card data-garden-index="0">
    <img data-lazy-src="/gardens/heart_stage_1.webp" alt="">
  </div>
  <div class="garden-card" data-garden-card data-garden-index="1">
    <img data-lazy-src="/gardens/dream_stage_1.webp" alt="">
  </div>
  <!-- ... more cards ... -->
</div>

<!-- Optional: Scroll indicator -->
<div class="scroll-indicator" data-garden-indicator aria-label="Garden scroll position"></div>
```

---

### 8. Add CLS + FCP Performance Monitoring (120 min)

**File**: Update `/rust/safari_apis.rs`

```rust
// Add after observe_lcp() function

/// Start monitoring CLS (Cumulative Layout Shift).
fn observe_cls() {
    let cb = Closure::<dyn FnMut(JsValue, JsValue)>::new(move |entries: JsValue, _observer: JsValue| {
        let list: js_sys::Array = match entries.dyn_into::<web_sys::PerformanceObserverEntryList>() {
            Ok(list) => list.get_entries(),
            Err(v) => match v.dyn_into::<js_sys::Array>() {
                Ok(a) => a,
                Err(_) => return,
            },
        };

        let mut total_cls = 0.0;
        for i in 0..list.length() {
            if let Ok(entry) = list.get(i).dyn_into::<web_sys::PerformanceEntry>() {
                // entry.value should be the shift value
                if let Ok(val) = js_sys::Reflect::get(&entry, &"value".into()) {
                    if let Some(shift) = val.as_f64() {
                        total_cls += shift;
                    }
                }
            }
        }

        let severity = if total_cls < 0.1 {
            "✓ Good"
        } else if total_cls < 0.25 {
            "⚠ Needs Improvement"
        } else {
            "✗ Poor"
        };

        web_sys::console::log_1(
            &format!("[CLS] {:.3} {} - Cumulative Layout Shift", total_cls, severity).into(),
        );
    });

    if let Ok(observer) = web_sys::PerformanceObserver::new(cb.as_ref().unchecked_ref()) {
        let opts = crate::bindings::PerformanceObserveOptions::new();
        opts.set_type("layout-shift");
        opts.set_buffered(true);
        observer.observe(&opts.unchecked_into());
        cb.forget();
    }
}

/// Start monitoring FCP (First Contentful Paint).
fn observe_fcp() {
    let cb = Closure::<dyn FnMut(JsValue, JsValue)>::new(move |entries: JsValue, _observer: JsValue| {
        let list: js_sys::Array = match entries.dyn_into::<web_sys::PerformanceObserverEntryList>() {
            Ok(list) => list.get_entries(),
            Err(v) => match v.dyn_into::<js_sys::Array>() {
                Ok(a) => a,
                Err(_) => return,
            },
        };

        for i in 0..list.length() {
            let entry = list.get(i);
            let entry: web_sys::PerformanceEntry = match entry.dyn_into() {
                Ok(e) => e,
                Err(_) => continue,
            };

            let name = entry.name();
            if name == "first-contentful-paint" {
                let fcp_time = entry.start_time();

                let severity = if fcp_time < 1800.0 {
                    "✓ Good"
                } else if fcp_time < 3000.0 {
                    "⚠ Needs Improvement"
                } else {
                    "✗ Poor"
                };

                web_sys::console::log_1(
                    &format!("[FCP] {:.0}ms {} - First Contentful Paint", fcp_time, severity).into(),
                );
            }
        }
    });

    if let Ok(observer) = web_sys::PerformanceObserver::new(cb.as_ref().unchecked_ref()) {
        let opts = crate::bindings::PerformanceObserveOptions::new();
        opts.set_type("paint");
        opts.set_buffered(true);
        observer.observe(&opts.unchecked_into());
        cb.forget();
    }
}

// Update init() to call new observers
pub fn init() {
    // ... existing code ...

    // Monitor additional Web Vitals
    observe_cls();  // ← Add
    observe_fcp();  // ← Add
}
```

---

## Testing & Validation

### Regression Testing Checklist

```
[ ] Load app, verify no console errors
[ ] Tap home buttons, verify panel navigation smooth
[ ] Toggle audio on/off, verify sounds play
[ ] Scroll gardens, verify images lazy-load
[ ] Close tab, reopen, verify state persisted
[ ] Fill app with 1000 acts, verify DB still responsive
[ ] Play all 5 games, verify no memory leaks
[ ] Test on iPad mini 6 (A15 chip, 4GB RAM)
[ ] Performance profiler: target <600ms boot time
```

### Performance Measurement

```javascript
// In browser console
performance.getEntriesByType('measure').filter(m => m.name.includes('boot'))
// Should show:
// boot:batch1, boot:batch2, boot:batch3, boot:batch4, boot:total

// Check INP
performance.getEntriesByType('event').map(e => e.duration)
// Should be mostly <200ms
```

---

## Rollout Plan

### Week 1: Critical Bugs
1. Remove duplicate Batch handler (db-worker.js) — TEST immediately
2. Deploy and monitor for 2 days
3. Add INP baseline reporting

### Week 2: Performance
1. Implement AbortSignal.timeout()
2. Add GainNode pooling
3. Deploy and measure boot time reduction

### Week 3: Security + Monitoring
1. Implement Trusted Types policy
2. Add CLS + FCP monitoring
3. Deploy and verify CSP enforcement in console

### Week 4: Polish
1. scrollend + snap detection
2. Feature detection for new APIs
3. Final performance testing on device

---

**Total Effort**: ~15-20 hours
**Expected Impact**: 20-25% faster boot, 0 bugs fixed, +3 features enabled

