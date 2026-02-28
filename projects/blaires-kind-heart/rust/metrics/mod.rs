//! Performance metrics and Web Vitals tracking.

#[cfg(debug_assertions)]
mod performance;
#[cfg(debug_assertions)]
mod web_vitals;

#[cfg(debug_assertions)]
#[allow(unused_imports)]
pub use performance::{duration, get_marks, mark, measure, PerfMonitor};
#[cfg(debug_assertions)]
#[allow(unused_imports)]
pub use web_vitals::{get_vitals, init as init_web_vitals, WebVitals};

#[cfg(not(debug_assertions))]
#[inline]
pub fn mark(_: &str) {}
#[cfg(not(debug_assertions))]
#[inline]
pub fn measure(_: &str, _: &str, _: &str) {}
#[cfg(not(debug_assertions))]
#[inline]
#[allow(dead_code)]
pub fn duration(_: &str, _: &str) -> Option<f64> {
    None
}
#[cfg(not(debug_assertions))]
#[inline]
pub fn init_web_vitals() {}
#[cfg(not(debug_assertions))]
#[allow(dead_code)]
#[inline]
pub fn get_marks() -> Vec<(String, f64)> {
    Vec::new()
}
#[cfg(not(debug_assertions))]
#[allow(dead_code)]
pub struct PerfMonitor;
#[cfg(not(debug_assertions))]
#[derive(Debug, Clone, Default)]
#[allow(dead_code)]
pub struct WebVitals {
    pub lcp: Option<f64>,
    pub fid: Option<f64>,
    pub cls: Option<f64>,
    pub inp: Option<f64>,
}
#[cfg(not(debug_assertions))]
#[allow(dead_code)]
#[inline]
pub fn get_vitals() -> WebVitals {
    WebVitals::default()
}
