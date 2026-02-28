//! Performance.mark() and Performance.measure() wrappers for boot phase tracking.

use crate::dom;
use std::cell::RefCell;
use std::collections::HashMap;

thread_local! { static PERF_MONITOR: RefCell<PerfMonitor> = RefCell::new(PerfMonitor::new()); }

pub struct PerfMonitor {
    marks: HashMap<String, f64>,
}

impl PerfMonitor {
    pub fn new() -> Self {
        Self {
            marks: HashMap::new(),
        }
    }

    pub fn mark_internal(&mut self, name: &str) {
        let ts = dom::window().performance().map_or(0.0, |p| p.now());

        self.marks.insert(name.to_string(), ts);

        // Also create browser Performance mark for DevTools
        if let Some(perf) = dom::window().performance() {
            let _ = perf.mark(name);
        }
    }

    pub fn measure_internal(&self, name: &str, start_mark: &str, end_mark: &str) {
        if let Some(perf) = dom::window().performance() {
            let _ = perf.measure_with_start_mark_and_end_mark(name, start_mark, end_mark);
        }
    }

    #[cfg_attr(not(debug_assertions), allow(dead_code))]
    pub fn duration(&self, start_mark: &str, end_mark: &str) -> Option<f64> {
        let start = self.marks.get(start_mark)?;
        let end = self.marks.get(end_mark)?;
        Some(end - start)
    }
}

pub fn mark(name: &str) {
    PERF_MONITOR.with(|m| m.borrow_mut().mark_internal(name));
}

pub fn measure(name: &str, start_mark: &str, end_mark: &str) {
    PERF_MONITOR.with(|m| m.borrow().measure_internal(name, start_mark, end_mark));
}

#[cfg_attr(not(debug_assertions), allow(dead_code))]
pub fn duration(start_mark: &str, end_mark: &str) -> Option<f64> {
    PERF_MONITOR.with(|m| m.borrow().duration(start_mark, end_mark))
}

/// Get all performance marks (for debug panel).
#[allow(dead_code)] // Called from debug::tabs::performance — compiler can't trace gesture-triggered path
pub fn get_marks() -> Vec<(String, f64)> {
    PERF_MONITOR.with(|m| {
        m.borrow()
            .marks
            .iter()
            .map(|(k, v)| (k.clone(), *v))
            .collect()
    })
}
