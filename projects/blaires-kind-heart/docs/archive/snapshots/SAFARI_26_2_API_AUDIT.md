# Safari 26.2 API Support Audit

- Archive Path: `docs/archive/snapshots/SAFARI_26_2_API_AUDIT.md`
- Normalized On: `2026-03-04`
- Source Title: `Safari 26.2 API Support Audit`

## Summary
**Date**: 2026-02-09

## Context
**Date**: 2026-02-09
**Safari Version**: 26.2 (December 2025 release)
**Platform**: iPad mini 6, iPadOS 26.2

### Critical Finding: Scheduler API NOT Supported

**Status**: 🔴 **CRITICAL BUG FOUND & FIXED**

Safari 26.2 does **NOT** support the Scheduler API (`scheduler.yield()`, `scheduler.postTask()`).

### Impact
- Initial simplification removed setTimeout(0) fallback
- Would have caused **runtime crash on startup** (5 calls during boot)
- **FIXED**: Restored fallback in `rust/browser_apis.rs`

### Sources
- [Safari 26.2 WebKit Features](https://webkit.org/blog/17640/webkit-features-for-safari-26-2/) - No Scheduler API mention
- [Scheduler API Browser Support](https://caniuse.com/mdn-api_scheduler_yield) - Safari not supported
- [Prioritized Task Scheduling MDN](https://developer.mozilla.org/en-US/docs/Web/API/Prioritized_Task_Scheduling_API) - Chrome/Edge only

### ✅ Supported APIs (Verified Safe)

## Actions
### Reverted (CRITICAL)
```rust
// browser_apis.rs - RESTORED FALLBACK
pub async fn scheduler_yield() {
    let sched_js: JsValue = sched_win.scheduler();
    if sched_js.is_undefined() || sched_js.is_null() {
        // Safari 26.2 fallback: yield via setTimeout(0)
        sleep_ms(0).await;
        return;
    }
    // ... scheduler.yield_to_main()
}
```

### Kept (VERIFIED SAFE)
- ✅ Trusted Types `.unchecked_into()` - dom.rs:87
- ✅ WebGPU `.unchecked_into()` - gpu.rs:80
- ✅ Navigation API `.dyn_into()` - navigation.rs:138
- ✅ View Transitions `.unwrap()` - navigation.rs:266
- ✅ Wake Lock `.unchecked_into()` - native_apis.rs:33

### Also Kept (LEGITIMATE)
- ✅ Removed popstate fallback - Navigation API guaranteed in 26.2
- ✅ Removed user-agent Safari detection - safari_apis.rs (always Safari)
- ✅ Removed is_safari() function - unnecessary for Safari-only app

### Total Impact

| Metric | Before Audit | After Fix | Status |
|--------|--------------|-----------|--------|
| Lines deleted | 99 | 88 | 11 lines restored |
| Critical bugs | 1 (crash) | 0 | ✅ FIXED |
| Safe deletions | 88 lines | 88 lines | ✅ Verified |
| Build warnings | 10 | 10 | No change |
| Runtime safety | ❌ Crash | ✅ Safe | CRITICAL FIX |

### Lessons Learned

1. **Never assume API support** - Always verify with official release notes
2. **Scheduler API not universal** - Chrome/Edge only, not Safari/Firefox
3. **Fallbacks exist for a reason** - "Defensive code" may be necessary, not bloat
4. **Test assumptions** - Devils advocate review caught critical bug before deployment

## Validation
_Validation details not recorded._

## References
- **Status**: ✅ NEW in Safari 26.2
- **Usage**: `window.navigation()` - modern History API replacement
- **Code**: `navigation.rs` - `.dyn_into()` with Option return (SAFE pattern)
- **Source**: [WebKit Safari 26.2 Features](https://webkit.org/blog/17640/webkit-features-for-safari-26-2/)

### Trusted Types API
- **Status**: ✅ Supported since Safari 26.0, refined in 26.2
- **Usage**: `window.trustedTypes` - XSS protection
- **Code**: `dom.rs:87` - `.unchecked_into()` is SAFE
- **Source**: [Trusted Types in Safari 26](https://underpassapp.com/news/2025/7/3.html)

### WebGPU
- **Status**: ✅ Supported since Safari 26.0, expanded in 26.2
- **Usage**: `navigator.gpu` - GPU compute and graphics
- **Code**: `gpu.rs:80` - `.unchecked_into()` is SAFE
- **Note**: `requestAdapter()` can return null (legitimate - handled correctly)
- **Source**: [WebKit Safari 26.2 Features](https://webkit.org/blog/17640/webkit-features-for-safari-26-2/)

### View Transitions API
- **Status**: ✅ Fully supported in Safari 26.2
- **Usage**: `document.startViewTransition()` - animated DOM transitions
- **Code**: `navigation.rs:266` - `.unwrap()` is SAFE
- **Source**: [WebKit Safari 26.2 Features](https://webkit.org/blog/17640/webkit-features-for-safari-26-2/)

### Wake Lock API
- **Status**: ✅ Supported since Safari 17.0
- **Usage**: `navigator.wakeLock.request('screen')` - prevent screen sleep
- **Code**: `native_apis.rs:33` - `.unchecked_into()` is SAFE
- **Source**: [WebKit Safari 17.0](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/)

- [Safari 26.2 Release Notes](https://developer.apple.com/documentation/safari-release-notes/safari-26_2-release-notes)
- [WebKit Safari 26.2 Features](https://webkit.org/blog/17640/webkit-features-for-safari-26-2/)
- [iPadOS 26.2 Update](https://www.macrumors.com/2025/12/12/apple-releases-ipados-26-2/)
- [Scheduler API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler)
- [Can I Use: Scheduler API](https://caniuse.com/mdn-api_scheduler_yield)

