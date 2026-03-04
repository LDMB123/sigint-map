# Memory Diagnostic Checklist - iPad Testing Guide

- Archive Path: `docs/archive/DETAILED_MEMORY_CHECKLIST.md`
- Normalized On: `2026-03-04`
- Source Title: `Memory Diagnostic Checklist - iPad Testing Guide`

## Summary
- **Before Fixes**: Expect 30-50KB growth per 8-hour session
- **After Fixes**: Expect < 5KB growth per 8-hour session
- **Verification**: Run all 7 tests before and after fixes
- **Regression**: Add automated tests to prevent reintroduction

**Target for Production**: All tests PASS with no LEAK indicators.

## Context
Use this checklist to verify memory leaks on actual iPad hardware (iPad mini 6, A15, 4GB RAM).

---

## Actions
_No actions recorded._

## Validation
- [ ] Close all other apps
- [ ] Safari 26.2 (verify in Settings > Safari > About)
- [ ] iPadOS 26.2 or later
- [ ] Plug in iPad (prevent sleep)
- [ ] Open DevTools (on macOS: Safari > Develop > [iPad Name])
- [ ] Navigate to Console tab
- [ ] Enable memory profiling output with timestamp

---

**Objective**: Detect if Navigation API listener leaks during repeated panel changes.

### Procedure

1. Open DevTools on macOS connected to iPad
2. On iPad: Open app home screen
3. In DevTools Console, run:
```javascript
// Mark baseline
performance.mark('nav-test-start');
console.log('[TEST] Navigation leak test starting...');

// Get initial memory
const baseline = performance.memory?.usedJSHeapSize || 0;
console.log(`[TEST] Baseline heap: ${(baseline / 1024 / 1024).toFixed(2)}MB`);
```

4. On iPad: Rapidly navigate between panels 50 times
   - Tap: Tracker → Quests → Stories → Rewards → Home
   - Repeat 10 times (50 navigations total)
   - Should take ~30-40 seconds

5. In DevTools Console, run:
```javascript
// Force GC and measure growth
if (window.gc) gc();  // Only works if DevTools opened at start
const after = performance.memory?.usedJSHeapSize || 0;
const growth = after - baseline;
const growth_mb = growth / 1024 / 1024;

console.log(`[TEST] Growth: ${growth_mb.toFixed(2)}MB`);
console.log(`[TEST] ${growth_mb < 2 ? 'PASS' : 'LEAK'}`);

performance.mark('nav-test-end');
performance.measure('nav-test', 'nav-test-start', 'nav-test-end');
```

- **PASS**: < 2MB growth
- **WARN**: 2-5MB growth (investigate)
- **LEAK**: > 5MB growth (navigate listener not cleaned up)

### If LEAK Detected

Run in DevTools to identify listener count:
```javascript
// Count active Closure objects in memory
console.log('[DEBUG] Check Memory tab → detached objects');
// Or run heap snapshot to search for "Closure" objects

// Alternative: Monitor listener attachment
const origAdd = EventTarget.prototype.addEventListener;
let listenerCount = 0;
EventTarget.prototype.addEventListener = function(...args) {
    listenerCount++;
    console.log(`[DEBUG] Listener #${listenerCount} attached to ${this.constructor.name}`);
    return origAdd.apply(this, args);
};
```

---

**Objective**: Detect if TAP_TIMES vector grows unbounded.

### Procedure

1. In DevTools Console, add logging:
```javascript
// Inject tap counter into app console
const tapCounter = {
    count: 0,
    log: function() {
        this.count++;
        if (this.count % 100 === 0) {
            console.log(`[TEST] Taps: ${this.count}`);
        }
};
window.tapCounter = tapCounter;
```

2. On iPad: Simulate rapid tapping
   - Use a stylus or rapid finger taps
   - Aim for ~200-300 taps in 5 seconds
   - Normal child interaction: 30-50 taps over an hour (well under limit)

3. After tapping, in DevTools:
```javascript
console.log('[TEST] Checking TAP_TIMES vector size');
// Note: TAP_TIMES is thread_local so not directly accessible from JS
// Instead, check heap snapshot for Vec<f64> objects

// Indirect check: Look for memory spike
const heap = performance.memory?.usedJSHeapSize || 0;
console.log(`[TEST] Heap after tapping: ${(heap / 1024 / 1024).toFixed(2)}MB`);
```

4. Take heap snapshot in DevTools Memory tab:
   - Click "Take heap snapshot"
   - Search for "TAP" or "Vec" objects
   - Should see small number of vectors (typically 1, within Rust thread_local)

- **PASS**: No memory spike (< 500KB growth)
- **WARN**: Spike of 1-5MB (investigate TAP_TIMES bounds)
- **LEAK**: Spike > 5MB (vector growing without limit)

### If LEAK Detected

Fix gesture.rs retention logic:
```rust
let cutoff = now - 1000.0;
tap_times.retain(|&t| t >= cutoff);  // Not: now - t < 1000.0
```

---

**Objective**: Verify RAF loops are properly cleaned up.

### Procedure

1. In DevTools, take baseline memory snapshot

2. On iPad: Launch game_catcher
   - Let it run for 3-5 seconds
   - Close/go back

3. Repeat step 2 five times (5 game launches/exits)

4. In DevTools, run:
```javascript
// Check if RAF ID is cleared
const afterGames = performance.memory?.usedJSHeapSize || 0;
console.log(`[TEST] After 5 games: ${(afterGames / 1024 / 1024).toFixed(2)}MB`);

// Memory should return to baseline +- 1MB
// If > 30MB growth, RAF loop not cleaned up
```

5. Take heap snapshot:
   - Search for "Closure" + "game_catcher"
   - Count should be 0-1 (not 5)

- **PASS**: Each game exit → ~5KB cleanup, heap returns to baseline
- **WARN**: 2-10MB per game (some state not cleaned)
- **LEAK**: Each game stays in memory (cleanup not called)

### If LEAK Detected

Verify game cleanup is called:
```rust
// game_catcher.rs cleanup() function
pub fn cleanup() {
    GAME.with(|g| {
        if let Some(mut game) = g.borrow_mut().take() {
            if let Some(id) = game.raf_id.take() {
                let window = dom::window();
                let _ = window.cancel_animation_frame(id);  // MUST HAPPEN
            }
    });
}
```

---

**Objective**: Detect growth leaks over extended play.

### Procedure

1. On iPad: Start fresh app session
2. Take DevTools memory baseline

3. Play normally for 30 minutes:
   - Click through all features
   - Launch different games
   - Navigate panels
   - Trigger celebrations/confetti

4. After 30 minutes, measure in DevTools:
```javascript
const soak_heap = performance.memory?.usedJSHeapSize || 0;
const soak_growth = soak_heap - baseline;  // From baseline test
console.log(`[TEST] After 30min soak: ${(soak_growth / 1024 / 1024).toFixed(2)}MB growth`);
console.log(`[TEST] Rate: ~${(soak_growth / 30).toFixed(1)}KB/min`);

// Healthy: < 5MB growth
// Concerning: 5-20MB growth
// Problematic: > 20MB growth
```

5. Optional: Repeat step 3-4 for another 30 minutes, measuring slope:
   - Linear growth = permanent leak
   - Logarithmic curve = event listener or cache growth (normal)
   - Flat = no leak

- **PASS**: < 5MB growth over 30 minutes
- **WARN**: 5-20MB growth (accumulation, investigate source)
- **LEAK**: > 20MB growth (likely permanent event listener leak)

### If LEAK Detected

Source is likely:
1. Global event listeners on document/window (navigation, click, resize)
2. RAF loops not cleaned up
3. Closure captures storing large objects

Use heap snapshot diff to identify:
- Take snapshot at 0min
- Take snapshot at 30min
- Compare for growth in Closure objects

---

**Objective**: Verify voiceschanged listener doesn't duplicate.

### Procedure

1. In DevTools Console:
```javascript
// Monitor SpeechSynthesis addEventListener calls
const synth = window.speechSynthesis;
const origAdd = synth.addEventListener.bind(synth);
let voicesChangedCount = 0;

synth.addEventListener = function(event, handler, options) {
    if (event === 'voiceschanged') {
        voicesChangedCount++;
        console.log(`[TEST] voiceschanged listener #${voicesChangedCount} added`);
    }
    return origAdd(event, handler, options);
};
```

2. On iPad: Trigger speech multiple times
   - Complete a quest (triggers speech)
   - Interact with companion (triggers speech)
   - Complete another quest

3. Check console output:
   - Should see "voiceschanged listener #1" (only once)
   - Not #2, #3, etc.

- **PASS**: "listener #1" appears once
- **LEAK**: "listener #1", "listener #2", "listener #3"... (duplicates)

### If LEAK Detected

Ensure guard prevents duplicate initialization:
```rust
pub fn init_voices() {
    if VOICES_READY.with(|ready| *ready.borrow()) {
        return;  // Skip if already initialized
    }
    // ... rest of init
}
```

---

**Objective**: Verify gardens navigate listener doesn't leak on module reload.

### Procedure

1. On iPad: Navigate to Gardens panel
2. In DevTools, take heap snapshot
3. Navigate away from Gardens
4. Navigate to Gardens again
5. Take another heap snapshot
6. Diff snapshots:
   - Should show no growth in navigate listeners
   - Count should be stable

- **PASS**: No new Closure objects in diff
- **LEAK**: 1+ new Closure objects (old listener not removed)

### If LEAK Detected

Implement explicit listener removal:
```rust
// Add to navigation.rs or gardens.rs
pub fn cleanup() {
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

---

**Objective**: Verify GPU particle burst doesn't leave dangling closures.

### Procedure

1. On iPad: Trigger multiple celebrations
   - Complete quests (shows confetti)
   - Earn badges
   - Each triggers GPU particles

2. In DevTools, count RequestAnimationFrame closures:
```javascript
// Rough estimate via monitoring
let rafCount = 0;
const origReqAF = window.requestAnimationFrame;
window.requestAnimationFrame = function(callback) {
    rafCount++;
    console.log(`[TEST] RAF #${rafCount} requested`);
    return origReqAF(callback);
};

const origCancelAF = window.cancelAnimationFrame;
window.cancelAnimationFrame = function(id) {
    console.log(`[TEST] RAF #${id} cancelled`);
    return origCancelAF(id);
};
```

3. Trigger 10 celebrations and count:
   - RAF requests should equal RAF cancellations
   - If requests > cancellations, frames are leaking

- **PASS**: Each celebration: ~5 RAF requests, ~5 cancellations
- **LEAK**: RAF count grows without corresponding cancellations

---

Once fixes are applied, add this test to CI:

```rust
#[cfg(test)]
#[wasm_bindgen_test]
async fn test_memory_no_navigation_leak() {
    // 1. Get baseline memory
    let baseline = get_heap_used();

    // 2. Simulate 50 panel navigations
    for _ in 0..50 {
        navigation::push_panel_state("panel-tracker");
        navigation::push_panel_state("home-scene");
    }

    // 3. Force GC
    web_sys::window()
        .and_then(|w| w.gc())
        .ok();

    // 4. Measure growth
    let after = get_heap_used();
    let growth = after - baseline;

    // Assert < 2MB growth
    assert!(growth < 2_000_000,
        "Navigation leak: {}MB growth detected",
        growth / 1_000_000);
}

fn get_heap_used() -> u32 {
    js_sys::Reflect::get(&js_sys::global(), &"performance".into())
        .ok()
        .and_then(|perf| {
            js_sys::Reflect::get(&perf, &"memory".into())
                .ok()
                .and_then(|mem| {
                    js_sys::Reflect::get(&mem, &"usedJSHeapSize".into())
                        .ok()
                        .and_then(|size| size.as_f64().map(|s| s as u32))
                })
        .unwrap_or(0)
}
```

---

### Troubleshooting

### "DevTools shows memory growth but unclear source"

1. Take heap snapshots at start and end of suspected operation
2. In Memory tab, select both snapshots
3. Use "Comparison" view to see only delta
4. Look for:
   - Closure objects (indicates event listener leak)
   - Arrays/Vectors (indicates unbounded collection)
   - Elements (indicates detached DOM)

### "app.js is huge in heap"

This is normal for WASM. The `.wasm` file is ~2.5MB. Look at growth, not absolute size.

### "Can't get performance.memory on iPad"

- Ensure DevTools open before app start
- Use `window.gc()` for manual GC (only available with DevTools)
- Take heap snapshots instead of measuring programmatically

### "Memory grows but then stabilizes"

This is normal and indicates:
- Initial caches being built
- Event listeners being accumulated but not removed
- Once stabilized, measure the "new baseline"
- Growth AFTER stabilization is the leak

---

When creating an issue or PR, include:

```markdown

### Environment
- Device: iPad mini 6, A15, 4GB RAM
- OS: iPadOS 26.2
- Safari: 26.2
- Test Date: 2026-02-11

- [ ] Panel Navigation: PASS / WARN / LEAK
  - Growth: XMB after 50 navigations
- [ ] Gesture TAP_TIMES: PASS / WARN / LEAK
  - Max vector size: X elements
- [ ] Game Lifecycle: PASS / WARN / LEAK
  - Growth per game: XKB
- [ ] 30min Soak: PASS / WARN / LEAK
  - Total growth: XMB
- [ ] SpeechSynthesis: PASS / LEAK
  - Listener count: X
- [ ] Gardens Listener: PASS / LEAK
  - Closure growth on reload: X
- [ ] Confetti/GPU: PASS / LEAK
  - RAF mismatch: X

### Notes
[Any observations about growth patterns, spikes, or anomalies]
```

---

## References
_No references recorded._

