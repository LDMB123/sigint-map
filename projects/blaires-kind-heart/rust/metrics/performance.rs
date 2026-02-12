//! Performance.mark() and Performance.measure() wrappers for boot phase tracking.

use std::cell::RefCell;
use std::collections::HashMap;
use crate::dom;

thread_local! {
    static PERF_MONITOR: RefCell<PerfMonitor> = RefCell::new(PerfMonitor::new());
}

pub struct PerfMonitor {
    marks: HashMap<String, f64>,
}

impl PerfMonitor {
    pub fn new() -> Self {
        Self {
            marks: HashMap::new(),
        }
    }

    /// Record a performance mark with the current timestamp.
    pub fn mark_internal(&mut self, name: &str) {
        let ts = dom::window()
            .performance()
            .map(|p| p.now())
            .unwrap_or(0.0);

        self.marks.insert(name.to_string(), ts);

        // Also create browser Performance mark for DevTools
        if let Some(perf) = dom::window().performance() {
            let _ = perf.mark(name);
        }
    }

    /// Create a performance measure between two marks.
    pub fn measure_internal(&self, name: &str, start_mark: &str, end_mark: &str) {
        if let Some(perf) = dom::window().performance() {
            let _ = perf.measure_with_start_mark_and_end_mark(name, start_mark, end_mark);
        }
    }

    /// Get the duration between two marks in milliseconds.
    pub fn duration(&self, start_mark: &str, end_mark: &str) -> Option<f64> {
        let start = self.marks.get(start_mark)?;
        let end = self.marks.get(end_mark)?;
        Some(end - start)
    }
}

/// Record a performance mark (global API).
pub fn mark(name: &str) {
    PERF_MONITOR.with(|m| m.borrow_mut().mark_internal(name));
}

/// Create a performance measure between two marks (global API).
pub fn measure(name: &str, start_mark: &str, end_mark: &str) {
    PERF_MONITOR.with(|m| m.borrow().measure_internal(name, start_mark, end_mark));
}

/// Get duration between two marks in milliseconds.
pub fn duration(start_mark: &str, end_mark: &str) -> Option<f64> {
    PERF_MONITOR.with(|m| m.borrow().duration(start_mark, end_mark))
}

/// Get all performance marks (for debug panel).
pub fn get_marks() -> Vec<(String, f64)> {
    PERF_MONITOR.with(|m| {
        m.borrow()
            .marks
            .iter()
            .map(|(k, v)| (k.clone(), *v))
            .collect()
    })
}
