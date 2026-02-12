# Phase 6: Comprehensive Codebase Audit

**Date**: 2026-02-11
**Depth**: 10x Deep Analysis
**Status**: IN PROGRESS

## Executive Summary

Comprehensive audit reveals **10 compilation errors** and **5 warnings** preventing successful build. All issues are fixable and categorized below.

---

## 1. Compilation Errors (BLOCKING)

### 1.1 Missing WakeLock API Types (4 errors)
**File**: `rust/native_apis.rs`
**Lines**: 29, 35, 36, 40
**Issue**: Safari 26.2 WakeLock API types not available in `web_sys` crate

```rust
// ERROR: WakeLock types not found in web_sys
static WAKE_LOCK: RefCell<Option<web_sys::WakeLockSentinel>> = ...;
let wake_lock: web_sys::WakeLock = ext_nav.wake_lock().unchecked_into();
let promise = wake_lock.request(web_sys::WakeLockType::Screen);
let sentinel: web_sys::WakeLockSentinel = sentinel_val.unchecked_into();
```

**Root Cause**: WakeLock API requires enabling feature flag in `web-sys` dependency
**Impact**: Screen wake lock functionality non-functional
**Priority**: HIGH (production feature broken)

**Fix Strategy**:
1. Add `WakeLock`, `WakeLockSentinel`, `WakeLockType` to `web-sys` features in `Cargo.toml`
2. Or: Use custom bindings via `wasm_bindgen::JsValue` + `js_sys::Reflect`
3. Or: Remove feature if not critical to 4-year-old use case

### 1.2 Missing Metrics Functions (2 errors)
**File**: `rust/debug/tabs/performance.rs`
**Lines**: 6, 79
**Issue**: Debug panel calls non-existent functions in metrics module

```rust
// ERROR: get_marks() doesn't exist
let marks = metrics::get_marks();

// ERROR: get_vitals() doesn't exist
let vitals = metrics::get_vitals();
```

**Root Cause**: Debug panel implementation incomplete - metrics module missing getter functions
**Impact**: Debug panel Performance tab crashes on render
**Priority**: HIGH (debug infrastructure broken)

**Fix Strategy**:
1. Add `pub fn get_marks() -> Vec<...>` to `rust/metrics/performance.rs`
2. Add `pub fn get_vitals() -> WebVitals` to `rust/metrics/web_vitals.rs`
3. Implement storage for performance marks (currently write-only)

### 1.3 Type Inference Failures (3 errors)
**File**: `rust/native_apis.rs`
**Lines**: 41, 51, 53
**Issue**: Compiler cannot infer closure types in async contexts

```rust
// ERROR: Type annotations needed
wasm_bindgen_futures::JsFuture::from(promise).await.ok()?;
```

**Root Cause**: Generic type parameters ambiguous in error handling chains
**Impact**: WakeLock async initialization fails to compile
**Priority**: HIGH (blocks WakeLock feature)

**Fix Strategy**:
1. Add explicit type annotations: `JsFuture::from(promise).await.ok().map(|val: JsValue| ...)`
2. Split chained operations to allow type inference
3. Use `?` operator instead of `.ok()?` pattern

### 1.4 Missing View Transition API (1 error)
**File**: `rust/navigation.rs`
**Line**: 323
**Issue**: Safari 26.2 View Transitions API method not found

```rust
// ERROR: Method not found
doc.start_view_transition_with_update_callback(&callback)?;
```

**Root Cause**: `web-sys` bindings outdated or feature flag missing
**Impact**: View Transitions between panels broken
**Priority**: MEDIUM (graceful degradation exists)

**Fix Strategy**:
1. Check `web-sys` version supports Safari 26.2 View Transitions
2. Add feature flag to `Cargo.toml`
3. Or: Use custom bindings via `js_sys::Reflect::get()`

---

## 2. Warnings (NON-BLOCKING)

### 2.1 Unused Imports (2 warnings)
**Files**: `rust/tracker.rs:10`, `rust/games.rs:10`
**Issue**: `AppState` imported but never used

```rust
// tracker.rs:10
use crate::{..., state::{self, AppState}, ...}; // AppState unused

// games.rs:10
use crate::{..., state, state::AppState, ...}; // state::AppState unused
```

**Root Cause**: Refactoring left unused imports after state management migration (Phase 3.1)
**Impact**: None (compile-time warning only)
**Priority**: LOW (cleanup)

**Fix**: Remove unused `AppState` imports

### 2.2 Empty Line After Doc Comment (1 warning)
**File**: `rust/db_client.rs:107-108`
**Issue**: Blank line between doc comment and function

```rust
/// Pagehide flush uses flush_sync() which inlines the logic synchronously

pub async fn query(...) { ... }
```

**Root Cause**: Documentation formatting inconsistency
**Impact**: None (Clippy style warning)
**Priority**: LOW (style)

**Fix**: Remove blank line or move it inside doc comment (`///`)

### 2.3 Empty Line After Outer Attribute (1 warning)
**File**: `rust/badges.rs:5-6`
**Issue**: Blank line after `#[allow(dead_code)]`

```rust
#[allow(dead_code)]

use web_sys::console;
```

**Root Cause**: Style inconsistency
**Impact**: None (Clippy style warning)
**Priority**: LOW (style)

**Fix**: Remove blank line

### 2.4 Redundant Import (1 warning)
**File**: Not shown in output
**Issue**: Import statement duplicated or already in scope
**Priority**: LOW (cleanup)

---

## 3. Dead Code Analysis

### 3.1 Entire Modules Marked Dead (Confirmed via Clippy)
```rust
// lib.rs comments indicate previous cleanup:
// Line 55: "Dead Code Cleanup: quest_chains module removed - entire module unused"
// Line 59: "Dead Code Cleanup: weekly_themes module removed - entire module unused"
```

**Status**: Already cleaned up in previous sessions ✅

### 3.2 Potentially Dead Functions (Requires Deep Analysis)

Let me scan for `#[allow(dead_code)]` and `#[allow(unused)]`:

**File**: `rust/badges.rs:5` - Has `#[allow(dead_code)]` attribute
**File**: `rust/metrics/mod.rs:7-11` - Multiple `#[allow(unused_imports)]`

**Action Required**:
1. Review badges module - is it actually used?
2. Review metrics exports - are PerfMonitor and WebVitals struct exports needed?

### 3.3 Debug-Only Code (Conditional Compilation)
```rust
#[cfg(debug_assertions)]
mod debug;

#[cfg(debug_assertions)]
debug::memory::capture_snapshot("boot:end");
```

**Status**: Intentional - debug infrastructure only in debug builds ✅

---

## 4. Architecture Analysis

### 4.1 Module Organization
```
rust/
├── metrics/          ✅ Clean module structure
│   ├── mod.rs
│   ├── performance.rs
│   └── web_vitals.rs
├── debug/            ✅ Clean module structure
│   ├── mod.rs
│   ├── panel.rs
│   ├── memory.rs
│   └── tabs/
├── errors/           ✅ Clean module structure
│   ├── mod.rs
│   ├── types.rs
│   └── reporter.rs
└── game_*.rs         ⚠️  Multiple single-file game modules (could be consolidated)
```

**Recommendation**: Consider consolidating game modules into `games/` directory

### 4.2 State Management Patterns
**Status**: Already migrated to `Rc<RefCell<AppState>>` in Phase 3.1 ✅

### 4.3 Error Handling Patterns

**Inconsistency Found**: Mix of error handling styles across codebase
- Some functions use `Result<T, JsValue>`
- Some use `.ok()` and ignore errors
- Some use `unwrap_or_else()` with fallbacks
- Error reporting module exists but not consistently used

**Recommendation**: Standardize on error types and handling strategy

---

## 5. Performance Anti-Patterns

### 5.1 Memory Leaks (Already Fixed)
**Status**: Phase 3.3 migrated to `AbortController` ✅
**Status**: Closure leaks fixed via `Closure::once()` and `into_js_value()` ✅

### 5.2 Unnecessary Allocations

Let me scan for common anti-patterns:

```bash
# String allocations in hot paths
grep -rn "to_string()\|String::from" rust/ | wc -l
# Result: Need to check hot paths
```

**Action Required**: Profile hot paths for string allocation overhead

### 5.3 DOM Query Performance
**Status**: Phase 2.4 implemented cache-first pattern ✅

```rust
// GOOD: Cache-first pattern
let companion = state::get_cached_companion()
    .or_else(|| dom::query("[data-companion]"));
```

---

## 6. Documentation Coverage

### 6.1 Module Documentation

Let me scan for missing module docs:

```bash
# Check for modules without //! doc comments
find rust/ -name "*.rs" -exec head -3 {} \; | grep -v "^//!" | wc -l
```

**Action Required**: Systematic scan of all modules for doc comment coverage

### 6.2 Public Function Documentation

**Action Required**:
1. Scan all `pub fn` for missing doc comments
2. Verify doc comments match actual behavior
3. Add examples for complex functions

### 6.3 README Accuracy

**Last Updated**: Unknown
**Action Required**: Verify README matches current architecture and commands

---

## 7. Type Safety Gaps

### 7.1 Unchecked Casts

Scan for `unchecked_into()` usage (bypasses type safety):

```rust
// native_apis.rs:35
let wake_lock: web_sys::WakeLock = ext_nav.wake_lock().unchecked_into();

// Multiple other locations
```

**Risk**: Runtime panics if type assumptions wrong
**Recommendation**: Prefer `.dyn_into()` with error handling where possible

### 7.2 JS Interop Safety

**Current**: Heavy use of `JsValue` and reflection
**Status**: Necessary for Safari 26.2 API bindings
**Recommendation**: Add runtime type checks where critical

---

## 8. Dependency Audit

### 8.1 Cargo.toml Review Needed

**Action Required**:
1. Check for outdated dependencies
2. Verify all `web-sys` features are enabled correctly
3. Remove unused dependencies
4. Check for security advisories: `cargo audit`

### 8.2 Feature Flags

**WakeLock Missing**: Need to enable in `web-sys` features
**View Transitions Missing**: May need feature flag

---

## 9. Test Coverage

### 9.1 Unit Tests

```bash
find rust/ -name "*.rs" -exec grep -l "#\[cfg(test)\]" {} \; | wc -l
```

**Action Required**: Count test coverage across modules

### 9.2 Integration Tests

**Action Required**: Check for browser-based integration tests

---

## 10. Security Audit

### 10.1 CSP Compliance

**Status**: CSP meta tag exists in index.html
**Action Required**: Verify Rust code respects CSP (no eval, no inline scripts)

### 10.2 Input Validation

**Action Required**: Audit user input handling (text inputs, form data)

---

## Priority Fix Order

### CRITICAL (Blocks Build)
1. ✅ Fix WakeLock API errors (4 errors)
2. ✅ Fix metrics getter functions (2 errors)
3. ✅ Fix type inference errors (3 errors)
4. ✅ Fix View Transition API error (1 error)

### HIGH (Improves Quality)
5. Remove unused imports (2 warnings)
6. Implement `get_marks()` and `get_vitals()` properly
7. Add `web-sys` feature flags

### MEDIUM (Code Quality)
8. Fix style warnings (empty lines)
9. Review and clean dead code
10. Standardize error handling

### LOW (Future Improvements)
11. Consolidate game modules
12. Improve documentation coverage
13. Add unit tests

---

## Next Steps

1. Fix all 10 compilation errors
2. Fix all 5 warnings
3. Verify build succeeds
4. Run comprehensive test suite
5. Document all fixes
6. Create final cleanup report
