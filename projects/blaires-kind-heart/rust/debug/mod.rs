//! Production-safe debug panel for viewing errors, performance, and DB status.
//! Activated via triple-tap gesture (safe for kids, discoverable for developers).

pub mod memory;
mod panel;
mod tabs;

pub use panel::DebugPanel;

thread_local! {
    static PANEL: DebugPanel = const { DebugPanel::new() };
}

/// Get the global debug panel instance.
///
/// # Safety
///
/// This function uses `unsafe` to extend the lifetime of a `thread_local!` reference to `'static`.
/// This is safe in the WASM single-threaded browser environment because:
///
/// 1. **Main thread never exits**: Browser WASM runs on the main thread, which never terminates
///    during program execution. Thread-locals persist for the entire program lifetime.
///
/// 2. **No concurrent access**: Single-threaded WASM has no thread safety issues. Only one
///    reference can exist at a time, and no other threads can access this thread_local.
///
/// 3. **No Drop implementation**: `DebugPanel` has no `Drop` impl that could run prematurely.
///    Even if it did, thread_locals are only dropped when the thread exits (never in browser).
///
/// 4. **Immutable after init**: The panel is initialized once and never mutated through the
///    static reference. All mutations go through `RefCell` interior mutability.
///
/// This pattern trades lifetime safety for ergonomics. The alternative (passing `&DebugPanel`
/// through every function) would pollute signatures across the codebase.
pub fn panel() -> &'static DebugPanel {
    PANEL.with(|p| unsafe { &*std::ptr::from_ref::<DebugPanel>(p) })
}

/// Toggle debug panel visibility (called by triple-tap gesture).
pub fn toggle() {
    panel().toggle();
}

/// Format timestamp as HH:MM:SS (shared by debug tabs).
pub fn format_timestamp(timestamp: f64) -> String {
    let date = js_sys::Date::new(&timestamp.into());
    format!(
        "{:02}:{:02}:{:02}",
        date.get_hours(),
        date.get_minutes(),
        date.get_seconds()
    )
}
