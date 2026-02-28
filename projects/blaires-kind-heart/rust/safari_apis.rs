use crate::dom;
use std::cell::RefCell;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use web_sys::{Element, HtmlElement};
enum InpSeverity {
    Warning,
    Critical,
    Catastrophic,
}
fn get_inp_severity(duration_ms: f64) -> InpSeverity {
    if duration_ms >= 800.0 {
        InpSeverity::Catastrophic
    } else if duration_ms >= 400.0 {
        InpSeverity::Critical
    } else {
        InpSeverity::Warning
    }
}
thread_local! { static INP_BASELINES: RefCell<Vec<f64>> = const { RefCell::new(Vec::new()) }; static INP_LOG_COUNT: std::cell::Cell<u32> = const { std::cell::Cell::new(0) }; }
const INP_LOG_MAX: u32 = 10;
fn store_inp_baseline(duration_ms: f64) {
    INP_BASELINES.with(|cell| {
        let mut baselines = cell.borrow_mut();
        baselines.push(duration_ms);
        baselines.sort_by(|a, b| b.partial_cmp(a).unwrap_or(std::cmp::Ordering::Equal));
        baselines.truncate(10);
    });
}
fn observe_interaction_latency(threshold_ms: f64) {
    let cb = Closure::<dyn FnMut(JsValue, JsValue)>::new(
        move |entries: JsValue, _observer: JsValue| {
            let list: js_sys::Array =
                match entries.dyn_into::<web_sys::PerformanceObserverEntryList>() {
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
                    store_inp_baseline(duration);
                    let count = INP_LOG_COUNT.with(|c| {
                        let v = c.get();
                        c.set(v + 1);
                        v
                    });
                    if count < INP_LOG_MAX {
                        match severity {
                            InpSeverity::Warning => {
                                web_sys::console::warn_1( &format!("[INP] SLOW: {name} took {duration:.0}ms (threshold: {threshold_ms:.0}ms)").into(), );
                            }
                            InpSeverity::Critical => {
                                web_sys::console::warn_1( &format!("[INP] CRITICAL: {name} took {duration:.0}ms (threshold: {threshold_ms:.0}ms) - double-tap risk!").into(), );
                            }
                            InpSeverity::Catastrophic => {
                                web_sys::console::warn_1( &format!("[INP] CATASTROPHIC: {name} took {duration:.0}ms (threshold: {threshold_ms:.0}ms) - FREEZING!").into(), );
                            }
                        }
                    } else if count == INP_LOG_MAX {
                        web_sys::console::warn_1(
                            &format!(
                                "[INP] Suppressing further warnings (logged {INP_LOG_MAX} events)"
                            )
                            .into(),
                        );
                    }
                }
            }
        },
    );
    if let Ok(observer) = web_sys::PerformanceObserver::new(cb.as_ref().unchecked_ref()) {
        let opts = crate::bindings::PerformanceObserveOptions::new();
        opts.set_type("event");
        opts.set_buffered(true);
        opts.set_duration_threshold(threshold_ms);
        observer.observe(&opts.unchecked_into());
        cb.forget();
    }
}
fn set_scrollbar_theme(el: &Element, thumb_color: &str, track_color: &str) {
    if let Some(html) = el.dyn_ref::<HtmlElement>() {
        let style = html.style();
        let _ = style.set_property("scrollbar-color", &format!("{thumb_color} {track_color}"));
        let _ = style.set_property("scrollbar-width", "thin");
    }
}
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
pub fn init() {
    for el in dom::query_all("[data-scrollable]") {
        set_scrollbar_theme(&el, "#9333ea", "transparent");
    }
    for el in dom::query_all("[data-scroll-animate]") {
        set_scroll_driven_animation(&el, "fade-slide-up");
    }
    observe_interaction_latency(200.0);
    observe_lcp();
}
fn observe_lcp() {
    let cb =
        Closure::<dyn FnMut(JsValue, JsValue)>::new(move |entries: JsValue, _observer: JsValue| {
            let list: js_sys::Array =
                match entries.dyn_into::<web_sys::PerformanceObserverEntryList>() {
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
                let severity = if lcp_time < 2500.0 {
                    "✓ Good"
                } else if lcp_time < 4000.0 {
                    "⚠ Needs Improvement"
                } else {
                    "✗ Poor"
                };
                web_sys::console::log_1(
                    &format!("[LCP] {:.0}ms {} - {}", lcp_time, severity, entry.name()).into(),
                );
            }
        });
    if let Ok(observer) = web_sys::PerformanceObserver::new(cb.as_ref().unchecked_ref()) {
        let opts = crate::bindings::PerformanceObserveOptions::new();
        opts.set_type("largest-contentful-paint");
        opts.set_buffered(true);
        observer.observe(&opts.unchecked_into());
        cb.forget();
    }
}
