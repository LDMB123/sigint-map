# Memory Leak Fixes - Quick Reference

## Quick Wins (5-10 minutes each)

### Fix 1: Gesture TAP_TIMES Retention Logic
**File**: `rust/gestures.rs`, line 32

Change:
```rust
tap_times.retain(|&t| now - t < 1000.0);
```

To:
```rust
let cutoff = now - 1000.0;
tap_times.retain(|&t| t >= cutoff);
```

**Why**: Avoids drift in the comparison where `now` can stale mid-retain if called from closure.

**Heap Impact**: Prevents 5-10KB growth under high-tap scenarios.

---

### Fix 2: Speech voiceschanged Guard
**File**: `rust/speech.rs`, lines 19-53

Add guard to prevent re-attaching listener:

```rust
thread_local! {
    static VOICES_LISTENER_ATTACHED: Cell<bool> = const { Cell::new(false) };
}

pub fn init_voices() {
    // Skip if already initialized or listener already attached
    if VOICES_READY.with(|ready| *ready.borrow())
        || VOICES_LISTENER_ATTACHED.with(|set| set.get()) {
        return;
    }

    let synth = match dom::window().speech_synthesis() {
        Ok(s) => s,
        Err(_) => return,
    };

    // ... rest of function ...

    // After attaching listener:
    VOICES_LISTENER_ATTACHED.with(|set| set.set(true));
}
```

**Why**: Prevents duplicate listener registration if init_voices called multiple times.

**Heap Impact**: Prevents duplicate closures (800B each).

---

### Fix 3: Onboarding - Already Safe
**File**: `rust/onboarding.rs`

✅ **Status**: SAFE - Element is removed from DOM after interaction, no detached DOM leak.

No action needed.

---

## Medium Complexity Fixes (30-45 minutes each)

### Fix 4: Navigation API Listeners with AbortSignal
**File**: `rust/navigation.rs`, lines 62-95

**Before**:
```rust
fn listen_navigate_event() {
    let Some(nav) = get_navigation_object() else { return };
    dom::on(nav.as_ref(), "navigate", move |event: Event| {
        // handler
    });
}
```

**After**:
```rust
thread_local! {
    static NAV_ABORT: RefCell<Option<browser_apis::AbortHandle>> =
        const { RefCell::new(None) };
}

fn listen_navigate_event() {
    let Some(nav) = get_navigation_object() else { return };

    let abort = browser_apis::new_abort_handle();
    let signal = abort.signal();

    dom::on_with_signal(nav.as_ref(), "navigate", &signal, move |event: Event| {
        let Ok(nav_event) = event.dyn_into::<bindings::NavigateEvent>() else { return };
        if !nav_event.can_intercept() { return; }
        if !nav_event.download_request().is_null() && !nav_event.download_request().is_undefined() {
            return;
        }
        let nav_type = nav_event.navigation_type();
        let dest = nav_event.destination();
        let state = dest.get_state();
        let Some(panel) = panel_from_js(&state) else { return };

        if nav_type == "traverse" {
            let id = panel;
            let handler = Closure::<dyn FnMut()>::once(move || {
                apply_panel_transition(&id);
            });
            let opts = bindings::InterceptOptions::new();
            opts.set_handler(handler.as_ref().unchecked_ref());
            nav_event.intercept(opts.as_ref());
            handler.forget();
        }
    });

    NAV_ABORT.with(|cell| {
        // Abort previous listener if any
        if let Some(old) = cell.borrow_mut().take() {
            old.abort();
        }
        *cell.borrow_mut() = Some(abort);
    });
}
```

**Similarly for `listen_navigate_error()`**:
```rust
fn listen_navigate_error() {
    let Some(nav) = get_navigation_object() else { return };

    let abort = browser_apis::new_abort_handle();
    let signal = abort.signal();

    dom::on_with_signal(nav.as_ref(), "navigateerror", &signal, move |event: Event| {
        let err_event: &bindings::NavigateErrorEvent = event.unchecked_ref();
        let message = err_event.message().unwrap_or_else(|| "unknown".into());
        web_sys::console::warn_1(&format!("[nav] error: {message}").into());
    });

    NAV_ABORT.with(|cell| {
        if let Some(old) = cell.borrow_mut().take() {
            old.abort();
        }
        *cell.borrow_mut() = Some(abort);
    });
}
```

**Heap Impact**: Enables cleanup of 500B closure on every navigation (was permanent).

---

### Fix 5: Document Click Delegation Listener
**File**: `rust/navigation.rs`, lines 155-177

**Before**:
```rust
fn bind_panel_buttons() {
    let doc = dom::document();
    let cb = Closure::<dyn FnMut(Event)>::new(move |event: Event| {
        // ... 60 lines of panel routing ...
    });
    let _ = doc.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
}
```

**After**:
```rust
thread_local! {
    static CLICK_LISTENER_ABORT: RefCell<Option<browser_apis::AbortHandle>> =
        const { RefCell::new(None) };
}

fn bind_panel_buttons() {
    let doc = dom::document();

    let abort = browser_apis::new_abort_handle();
    let signal = abort.signal();

    dom::on_with_signal(&doc, "click", &signal, move |event: Event| {
        let target = event.target().and_then(|t| t.dyn_into::<Element>().ok());
        let Some(el) = target else { return };

        if let Ok(Some(open_btn)) = el.closest("[data-panel-open]") {
            if let Some(panel_id) = open_btn.get_attribute("data-panel-open") {
                open_panel(&panel_id);
            }
            return;
        }
        if let Ok(Some(close_btn)) = el.closest("[data-panel-close]") {
            if let Ok(Some(panel)) = close_btn.closest(".panel") {
                if let Some(id) = panel.get_attribute("id") {
                    close_panel(&id);
                }
            }
        }
    });

    CLICK_LISTENER_ABORT.with(|cell| {
        if let Some(old) = cell.borrow_mut().take() {
            old.abort();
        }
        *cell.borrow_mut() = Some(abort);
    });
}
```

**Heap Impact**: Maintains single listener (good) but now removable (future-proofing).

---

### Fix 6: Gesture Listener with Removal
**File**: `rust/gestures.rs`, lines 14-48

**Option A: Store and remove (if debug gesture can be toggled)**:
```rust
thread_local! {
    static GESTURE_LISTENER_ABORT: RefCell<Option<browser_apis::AbortHandle>> =
        const { RefCell::new(None) };
}

pub fn setup_debug_gesture() {
    let abort = browser_apis::new_abort_handle();
    let signal = abort.signal();

    dom::on_with_signal(&dom::document(), "pointerup", &signal, move |event: Event| {
        let event: PointerEvent = match event.dyn_into() {
            Ok(e) => e,
            Err(_) => return,
        };

        if event.pointer_type() != "touch" && event.pointer_type() != "pen" {
            return;
        }

        let now = browser_apis::now_ms();

        TAP_TIMES.with(|times| {
            let mut tap_times = times.borrow_mut();
            tap_times.push(now);

            let cutoff = now - 1000.0;
            tap_times.retain(|&t| t >= cutoff);

            if tap_times.len() >= 3 {
                web_sys::console::log_1(&"[gestures] Triple-tap detected - toggling debug panel".into());
                crate::debug::toggle();
                tap_times.clear();
            }
        });
    });

    GESTURE_LISTENER_ABORT.with(|cell| {
        if let Some(old) = cell.borrow_mut().take() {
            old.abort();
        }
        *cell.borrow_mut() = Some(abort);
    });
}

pub fn teardown_debug_gesture() {
    GESTURE_LISTENER_ABORT.with(|cell| {
        if let Some(abort) = cell.borrow_mut().take() {
            abort.abort();
        }
    });
    TAP_TIMES.with(|times| times.borrow_mut().clear());
}
```

**Option B: Keep permanent but fix retention logic (simpler)**:
```rust
pub fn setup_debug_gesture() {
    let closure = Closure::wrap(Box::new(move |event: PointerEvent| {
        if event.pointer_type() != "touch" && event.pointer_type() != "pen" {
            return;
        }

        let now = browser_apis::now_ms();

        TAP_TIMES.with(|times| {
            let mut tap_times = times.borrow_mut();
            tap_times.push(now);

            // FIXED: Use >= comparison to avoid drift
            let cutoff = now - 1000.0;
            tap_times.retain(|&t| t >= cutoff);

            if tap_times.len() >= 3 {
                web_sys::console::log_1(&"[gestures] Triple-tap detected - toggling debug panel".into());
                crate::debug::toggle();
                tap_times.clear();
            }
        });
    }) as Box<dyn FnMut(_)>);

    dom::document()
        .add_event_listener_with_callback("pointerup", closure.as_ref().unchecked_ref())
        .unwrap_throw();

    closure.forget();
}
```

**Recommended**: Go with Option B (simpler, gesture is meant to be permanent).

**Heap Impact**: Fixes retention logic; prevents 10KB growth under pathological tap scenarios.

---

### Fix 7: Gardens Navigation Listener with Removal
**File**: `rust/gardens.rs`, lines 182-219

**Before**:
```rust
thread_local! {
    static NAV_LISTENER: RefCell<Option<Closure<dyn FnMut(web_sys::Event)>>> =
        const { RefCell::new(None) };
}

pub fn init() {
    // ...
    let listener = Closure::wrap(Box::new(move |_event: web_sys::Event| {
        if let Some(panel) = crate::dom::query("#panel-gardens") {
            if !panel.has_attribute("hidden") {
                wasm_bindgen_futures::spawn_local(async {
                    populate_gardens_grid().await;
                });
            }
        }
    }) as Box<dyn FnMut(_)>);

    let _ = nav_target.add_event_listener_with_callback(
        "navigate",
        listener.as_ref().unchecked_ref()
    );
    NAV_LISTENER.with(|cell| *cell.borrow_mut() = Some(listener));
}
```

**After**:
```rust
thread_local! {
    static NAV_LISTENER: RefCell<Option<(
        web_sys::EventTarget,
        Closure<dyn FnMut(web_sys::Event)>,
    )>> = const { RefCell::new(None) };
}

pub fn init() {
    use wasm_bindgen::JsCast;
    let window = web_sys::window().expect("window");
    let navigation = js_sys::Reflect::get(&window, &"navigation".into())
        .ok()
        .and_then(|nav| nav.dyn_into::<web_sys::EventTarget>().ok());

    if let Some(nav_target) = navigation {
        let listener = Closure::wrap(Box::new(move |_event: web_sys::Event| {
            if let Some(panel) = crate::dom::query("#panel-gardens") {
                if !panel.has_attribute("hidden") {
                    wasm_bindgen_futures::spawn_local(async {
                        populate_gardens_grid().await;
                    });
                }
            }
        }) as Box<dyn FnMut(_)>);

        let _ = nav_target.add_event_listener_with_callback(
            "navigate",
            listener.as_ref().unchecked_ref()
        );

        NAV_LISTENER.with(|cell| {
            *cell.borrow_mut() = Some((nav_target.clone(), listener));
        });
    }

    render_gardens_panel();
}

pub fn teardown() {
    NAV_LISTENER.with(|cell| {
        if let Some((nav_target, listener)) = cell.borrow_mut().take() {
            let _ = nav_target.remove_event_listener_with_callback(
                "navigate",
                listener.as_ref().unchecked_ref()
            );
        }
    });
}
```

**Heap Impact**: Enables cleanup if gardens module ever needs to be torn down (future-proofing).

---

### Fix 8: Speech voiceschanged Listener
**File**: `rust/speech.rs`, lines 36-52

Already has a good pattern with the callback guard. Just ensure it's not called multiple times:

**Verify in init_voices()**:
```rust
pub fn init_voices() {
    // Skip if already initialized
    if VOICES_READY.with(|ready| *ready.borrow()) {
        return;
    }

    let synth = match dom::window().speech_synthesis() {
        Ok(s) => s,
        Err(_) => return,
    };

    // Check if voices already loaded
    if try_select_voice(&synth) {
        return;
    }

    // Otherwise wait for voiceschanged event
    let cb = Closure::wrap(Box::new(move |_: web_sys::Event| {
        // This guard prevents duplicate processing even if listener fires multiple times
        if VOICES_READY.with(|ready| *ready.borrow()) {
            return;
        }
        if let Ok(synth) = dom::window().speech_synthesis() {
            try_select_voice(&synth);
        }
    }) as Box<dyn Fn(web_sys::Event)>);

    let _ = synth.add_event_listener_with_callback(
        "voiceschanged",
        cb.as_ref().unchecked_ref(),
    );
    cb.forget();
}
```

✅ **Already safe** - guard prevents duplicate work and once VOICES_READY is true, callback becomes a no-op.

---

## Testing After Fixes

### Automated Test
```rust
#[cfg(test)]
mod memory_tests {
    use wasm_bindgen_test::*;

    #[wasm_bindgen_test]
    fn test_nav_listener_removable() {
        // 1. Get initial listener count via DevTools
        // 2. Call listen_navigate_event()
        // 3. Verify listener count increased
        // 4. Call some cleanup/reset function
        // 5. Verify listener count decreased
    }

    #[wasm_bindgen_test]
    fn test_gesture_tap_times_bounded() {
        setup_debug_gesture();

        // Simulate 1000 rapid taps
        for i in 0..1000 {
            // Trigger pointerup with timestamp i * 0.5ms apart
        }

        // TAP_TIMES should never exceed ~3 elements (due to 1000ms window)
        TAP_TIMES.with(|times| {
            assert!(times.borrow().len() < 10, "TAP_TIMES grew unbounded");
        });
    }
}
```

### Manual Chrome DevTools Steps

1. **Before Fix**:
   - Open Memory tab
   - Take baseline heap snapshot
   - Navigate between panels 30 times
   - GC and take final snapshot
   - Diff shows multiple Closure objects

2. **After Fix**:
   - Same steps
   - Diff shows no Closure growth
   - EventListener count stays constant

---

## Verification Checklist

- [ ] Gesture TAP_TIMES retention fixed (`t >= cutoff` not `now - t < 1000`)
- [ ] Speech voiceschanged guard verified
- [ ] Navigation listeners use AbortSignal
- [ ] Click delegation listener managed (AbortSignal or documented as permanent)
- [ ] Gardens listener removable via takedown function
- [ ] All `Closure::new()` with `.forget()` are either temporary (RAF loops with cleanup) or necessary
- [ ] No circular Rc<RefCell> cycles in RAF loops (break cycle before dropping)
- [ ] All game RAF loops call `cancel_animation_frame()` in cleanup
- [ ] Test suite includes memory regression test

---

## Expected Cleanup Timeline

| Priority | Task | Estimated Time | Impact |
|----------|------|-----------------|---------|
| P0 | Fix gesture TAP_TIMES | 5 min | HIGH |
| P0 | Fix navigation listeners (AbortSignal) | 30 min | HIGH |
| P1 | Verify speech voiceschanged guard | 10 min | MEDIUM |
| P1 | Fix gardens listener removal | 20 min | MEDIUM |
| P2 | Add memory regression tests | 60 min | LONG-TERM |
| P2 | Document closure patterns for future | 20 min | DOCUMENTATION |

**Total estimated time**: 2.5-3 hours for all fixes
**Benefit**: Reduce memory growth from 30-50KB/8hrs to <5KB/8hrs
