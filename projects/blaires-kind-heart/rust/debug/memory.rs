//! Memory profiling and allocation tracking for WASM heap monitoring.

use std::cell::RefCell;
use wasm_bindgen::JsCast;
use wasm_bindgen::UnwrapThrowExt;

thread_local! {
    static SNAPSHOTS: RefCell<Vec<MemorySnapshot>> = const { RefCell::new(Vec::new()) };
}

#[derive(Debug, Clone)]
pub struct MemorySnapshot {
    pub timestamp: f64,
    pub heap_bytes: usize,
    pub wasm_pages: usize,
    pub label: String,
}

/// Capture a memory snapshot with optional label.
pub fn capture_snapshot(label: &str) -> MemorySnapshot {
    let mem = wasm_bindgen::memory()
        .dyn_into::<js_sys::WebAssembly::Memory>()
        .unwrap_throw();
    let buffer = mem
        .buffer()
        .dyn_into::<js_sys::ArrayBuffer>()
        .unwrap_throw();
    let byte_length = buffer.byte_length() as usize;

    let snapshot = MemorySnapshot {
        timestamp: js_sys::Date::now(),
        heap_bytes: byte_length,
        wasm_pages: byte_length / 65536, // 64KB per WASM page
        label: label.to_string(),
    };

    // Store snapshot (keep last 100)
    SNAPSHOTS.with(|snaps| {
        let mut snapshots = snaps.borrow_mut();
        snapshots.push(snapshot.clone());

        let len = snapshots.len();
        if len > 100 {
            snapshots.drain(0..len - 100);
        }
    });

    snapshot
}

/// Get all memory snapshots.
pub fn get_snapshots() -> Vec<MemorySnapshot> {
    SNAPSHOTS.with(|snaps| snaps.borrow().clone())
}

/// Get current heap usage in bytes.
pub fn current_heap_bytes() -> usize {
    let mem = wasm_bindgen::memory()
        .dyn_into::<js_sys::WebAssembly::Memory>()
        .unwrap_throw();
    mem.buffer()
        .dyn_into::<js_sys::ArrayBuffer>()
        .unwrap_throw()
        .byte_length() as usize
}

/// Get current WASM pages allocated.
pub fn current_pages() -> usize {
    current_heap_bytes() / 65536
}

/// Calculate memory growth since first snapshot.
pub fn memory_growth() -> Option<i64> {
    SNAPSHOTS.with(|snaps| {
        let snapshots = snaps.borrow();
        if snapshots.len() < 2 {
            return None;
        }

        let first = snapshots.first()?;
        let last = snapshots.last()?;

        Some(last.heap_bytes as i64 - first.heap_bytes as i64)
    })
}

/// Detect memory leak patterns by checking if heap grows unbounded.
/// Returns true if heap has grown >20MB without any decrease in the last 50 snapshots.
pub fn detect_leak_pattern() -> bool {
    SNAPSHOTS.with(|snaps| {
        let snapshots = snaps.borrow();
        if snapshots.len() < 50 {
            return false;
        }

        let recent = &snapshots[snapshots.len() - 50..];
        let first_heap = recent.first().map_or(0, |s| s.heap_bytes);
        let max_heap = recent.iter().map(|s| s.heap_bytes).max().unwrap_or(0);

        // Check if heap grew >20MB without any decrease
        let growth = max_heap.saturating_sub(first_heap);
        let has_decrease = recent.windows(2).any(|w| w[1].heap_bytes < w[0].heap_bytes);

        growth > 20_000_000 && !has_decrease
    })
}

/// Format bytes as human-readable string (KB/MB).
pub fn format_bytes(bytes: usize) -> String {
    if bytes < 1024 {
        format!("{bytes} B")
    } else if bytes < 1024 * 1024 {
        format!("{:.1} KB", bytes as f64 / 1024.0)
    } else {
        format!("{:.2} MB", bytes as f64 / (1024.0 * 1024.0))
    }
}
