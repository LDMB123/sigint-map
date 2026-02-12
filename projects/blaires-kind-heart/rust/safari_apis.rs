//! Safari 26.2 APIs not covered elsewhere.
//! INP monitoring, themed scrollbars, scroll-driven animations.
//! All either typed via web-sys or via custom wasm_bindgen bindings.

use std::cell::RefCell;

use wasm_bindgen::closure::Closure;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use web_sys::{HtmlElement, Element};

use crate::dom;

// ── INP Severity Levels ──
/// INP threshold severity for 4-year-old UX (double-tap prevention).
enum InpSeverity {
    Warning,      // 200-400ms — sluggish but tolerable
    Critical,     // 400-800ms — double-tap risk
    Catastrophic, // 800ms+ — app appears frozen
}

/// Determine INP severity based on interaction duration.
fn get_inp_severity(duration_ms: f64) -> InpSeverity {
    if duration_ms >= 800.0 {
        InpSeverity::Catastrophic
    } else if duration_ms >= 400.0 {
        InpSeverity::Critical
    } else {
        InpSeverity::Warning
    }
}

// Thread-local storage for INP baseline tracking (highest durations)
thread_local! {
    static INP_BASELINES: RefCell<Vec<f64>> = const { RefCell::new(Vec::new()) };
}

/// Store INP measurement for baseline tracking (keep top 10 slowest).
fn store_inp_baseline(duration_ms: f64) {
    INP_BASELINES.with(|cell| {
        let mut baselines = cell.borrow_mut();
        baselines.push(duration_ms);
        baselines.sort_by(|a, b| b.partial_cmp(a).unwrap()); // descending
        baselines.truncate(10); // keep worst 10
    });
}

// ── Event Timing API (INP monitoring) ──
// Measures tap-to-paint latency. Critical: if a 4-year-old taps and nothing
// happens within 200ms, they tap again — causing double-actions.
// Safari 26.2 supports PerformanceObserver({ type: "event" }).

/// Start monitoring interaction latency (INP).
/// Warns in console if any interaction exceeds `threshold_ms`.
/// Logs with severity levels for debugging and baseline tracking.
fn observe_interaction_latency(threshold_ms: f64) {
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
            let duration = entry.duration();
            if duration > threshold_ms {
                let name = entry.name();
                let severity = get_inp_severity(duration);

                match severity {
                    InpSeverity::Warning => {
                        web_sys::console::warn_1(
                            &format!("[INP] SLOW: {name} took {duration:.0}ms (threshold: {threshold_ms:.0}ms)").into(),
                        );
                    }
                    InpSeverity::Critical => {
                        web_sys::console::error_1(
                            &format!("[INP] CRITICAL: {name} took {duration:.0}ms (threshold: {threshold_ms:.0}ms) - double-tap risk!").into(),
                        );
                    }
                    InpSeverity::Catastrophic => {
                        web_sys::console::error_1(
                            &format!("[INP] CATASTROPHIC: {name} took {duration:.0}ms (threshold: {threshold_ms:.0}ms) - FREEZING!").into(),
                        );
                    }
                }

                store_inp_baseline(duration);
            }
        }
    });

    // Use the PerformanceObserver constructor with typed web-sys
    if let Ok(observer) = web_sys::PerformanceObserver::new(cb.as_ref().unchecked_ref()) {
        // Safari 26.2 supports { type: "event", buffered: true, durationThreshold: N }
        // Typed via custom wasm_bindgen extern — zero Reflect calls
        let opts = crate::bindings::PerformanceObserveOptions::new();
        opts.set_type("event");
        opts.set_buffered(true);
        opts.set_duration_threshold(threshold_ms);
        observer.observe(&opts.unchecked_into());
        cb.forget();
    }
}

// ── Themed scrollbars (Safari 26.2) ──
// scrollbar-color: <thumb> <track>; scrollbar-width: thin;
// Kid-friendly bright colored scrollbars.

/// Apply themed scrollbar colors to a scrollable element.
fn set_scrollbar_theme(el: &Element, thumb_color: &str, track_color: &str) {
    if let Some(html) = el.dyn_ref::<HtmlElement>() {
        let style = html.style();
        let _ = style.set_property("scrollbar-color", &format!("{thumb_color} {track_color}"));
        let _ = style.set_property("scrollbar-width", "thin");
    }
}

// ── CSS Scroll-Driven Animations (Safari 26.2) ──
// Set animation-timeline: view() on elements for scroll-linked animations.
// Zero WASM overhead — Safari's compositor handles the animation.

/// Apply scroll-driven animation to an element.
/// The element will animate as it enters the viewport during scroll.
fn set_scroll_driven_animation(el: &Element, animation_name: &str) {
    if let Some(html) = el.dyn_ref::<HtmlElement>() {
        let style = html.style();
        let _ = style.set_property("animation-name", animation_name);
        let _ = style.set_property("animation-timeline", "view()");
        let _ = style.set_property("animation-range", "entry 0% entry 100%");
        let _ = style.set_property("animation-fill-mode", "both");
        let _ = style.set_property("animation-duration", "1ms"); // required placeholder
    }
}

// ── Init — apply Safari 26.2 enhancements globally ──

pub fn init() {
    // Theme all scrollable containers with kid-friendly purple scrollbars
    for el in dom::query_all("[data-scrollable]") {
        set_scrollbar_theme(&el, "#9333ea", "transparent");
    }

    // Apply scroll-driven fade-in to quest cards and reward items
    for el in dom::query_all("[data-scroll-animate]") {
        set_scroll_driven_animation(&el, "fade-slide-up");
    }

    // Monitor interaction latency — warn if any tap takes >200ms
    // (critical for 4-year-old UX: double-taps on slow response)
    observe_interaction_latency(200.0);

    // Monitor Largest Contentful Paint (LCP) — Safari 26.2 support
    // Target: <2.5s for loading screen sparkle image
    observe_lcp();
}

// ── LCP (Largest Contentful Paint) Observer ──
// Measures time to render the largest content element (image, text block).
// Safari 26.2 supports PerformanceObserver({ type: "largest-contentful-paint" }).

/// Start monitoring LCP (Largest Contentful Paint).
/// Logs LCP timing with severity levels based on Core Web Vitals thresholds.
fn observe_lcp() {
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
            let lcp_time = entry.start_time();

            // Good: <2.5s, Needs Improvement: 2.5-4s, Poor: >4s (Core Web Vitals)
            let severity = if lcp_time < 2500.0 {
                "✓ Good"
            } else if lcp_time < 4000.0 {
                "⚠ Needs Improvement"
            } else {
                "✗ Poor"
            };

            web_sys::console::log_1(
                &format!(
                    "[LCP] {:.0}ms {} - {}",
                    lcp_time,
                    severity,
                    entry.name()
                ).into(),
            );
        }
    });

    if let Ok(observer) = web_sys::PerformanceObserver::new(cb.as_ref().unchecked_ref()) {
        // Safari 26.2 supports { type: "largest-contentful-paint", buffered: true }
        let opts = crate::bindings::PerformanceObserveOptions::new();
        opts.set_type("largest-contentful-paint");
        opts.set_buffered(true);
        observer.observe(&opts.unchecked_into());
        cb.forget();
    }
}
