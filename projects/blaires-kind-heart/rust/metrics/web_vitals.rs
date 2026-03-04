//! Web Vitals tracking using PerformanceObserver API.
//! Tracks LCP, FID, CLS, and INP for Safari 26.2.

use std::cell::RefCell;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::{JsCast, JsValue};
use web_sys::PerformanceObserver;

thread_local! {
    static WEB_VITALS: RefCell<WebVitals> = const { RefCell::new(WebVitals::new()) };
}

#[derive(Debug, Clone)]
pub struct WebVitals {
    pub lcp: Option<f64>, // Largest Contentful Paint
    pub fid: Option<f64>, // First Input Delay
    pub cls: Option<f64>, // Cumulative Layout Shift
    pub inp: Option<f64>, // Interaction to Next Paint
}

impl WebVitals {
    pub const fn new() -> Self {
        Self {
            lcp: None,
            fid: None,
            cls: None,
            inp: None,
        }
    }
}

/// Initialize Web Vitals tracking with PerformanceObserver.
pub fn init() {
    observe_lcp();
    observe_fid();
    observe_cls();
    if runtime_diagnostics_available() {
        #[cfg(debug_assertions)]
        web_sys::console::log_1(
            &"[web_vitals] Skipping Rust INP observer (runtime diagnostics owns INP)".into(),
        );
    } else {
        observe_inp();
    }
}

/// Get current Web Vitals snapshot (for debug panel).
#[allow(dead_code)] // Called from debug::tabs::performance — compiler can't trace gesture-triggered path
pub fn get_vitals() -> WebVitals {
    refresh_inp_from_runtime_diagnostics();
    WEB_VITALS.with(|v| v.borrow().clone())
}

fn runtime_diagnostics_available() -> bool {
    let global = js_sys::global();
    js_sys::Reflect::get(
        &global,
        &JsValue::from_str("__BKH_RUNTIME_DIAGNOSTICS__"),
    )
    .ok()
    .is_some_and(|value| !value.is_undefined() && !value.is_null())
}

fn refresh_inp_from_runtime_diagnostics() {
    if !runtime_diagnostics_available() {
        return;
    }

    let global = js_sys::global();
    let Ok(diag) = js_sys::Reflect::get(&global, &JsValue::from_str("__BKH_RUNTIME_DIAGNOSTICS__"))
    else {
        return;
    };
    let Ok(events_fn) = js_sys::Reflect::get(&diag, &JsValue::from_str("events"))
        .and_then(|value| value.dyn_into::<js_sys::Function>())
    else {
        return;
    };
    let Ok(events_value) = events_fn.call1(&diag, &JsValue::from_str("wasm-init")) else {
        return;
    };
    let Ok(events) = events_value.dyn_into::<js_sys::Array>() else {
        return;
    };

    let mut max_inp = 0.0;
    for idx in 0..events.length() {
        let event = events.get(idx);
        let kind = js_sys::Reflect::get(&event, &JsValue::from_str("kind"))
            .ok()
            .and_then(|value| value.as_string());
        if kind.as_deref() != Some("inp") {
            continue;
        }
        let duration = js_sys::Reflect::get(&event, &JsValue::from_str("durationMs"))
            .ok()
            .and_then(|value| value.as_f64())
            .unwrap_or(0.0);
        if duration > max_inp {
            max_inp = duration;
        }
    }

    if max_inp > 0.0 {
        WEB_VITALS.with(|v| {
            v.borrow_mut().inp = Some(max_inp);
        });
    }
}

fn observer_entries(list: &JsValue) -> Option<js_sys::Array> {
    let entries = js_sys::Reflect::get(list, &JsValue::from_str("getEntries")).ok()?;
    let func = entries.dyn_into::<js_sys::Function>().ok()?;
    func.call0(list).ok()?.dyn_into::<js_sys::Array>().ok()
}

fn observe_performance(
    entry_type: &str,
    buffered: bool,
    duration_threshold: Option<f64>,
    callback: &Closure<dyn FnMut(JsValue, JsValue)>,
) {
    let Ok(observer) = PerformanceObserver::new(callback.as_ref().unchecked_ref()) else {
        return;
    };
    let opts = crate::bindings::PerformanceObserveOptions::new();
    opts.set_type(entry_type);
    opts.set_buffered(buffered);
    if let Some(threshold) = duration_threshold {
        opts.set_duration_threshold(threshold);
    }
    observer.observe(&opts.unchecked_into());
}

// ── LCP (Largest Contentful Paint) ──

fn observe_lcp() {
    let callback = Closure::wrap(Box::new(move |list: JsValue, _observer: JsValue| {
        let Some(entries_arr) = observer_entries(&list) else {
            return;
        };
        let Ok(last_entry) = entries_arr
            .at(entries_arr.length() as i32 - 1)
            .dyn_into::<web_sys::PerformanceEntry>()
        else {
            return;
        };
        let start_time = last_entry.start_time();
        WEB_VITALS.with(|v| {
            v.borrow_mut().lcp = Some(start_time);
        });
        #[cfg(debug_assertions)]
        web_sys::console::log_1(&format!("[web_vitals] LCP: {start_time:.2}ms").into());
    }) as Box<dyn FnMut(JsValue, JsValue)>);

    observe_performance("largest-contentful-paint", true, None, &callback);

    callback.forget();
}

// ── FID (First Input Delay) ──

fn observe_fid() {
    let callback = Closure::wrap(Box::new(move |list: JsValue, _observer: JsValue| {
        let Some(entries_arr) = observer_entries(&list) else {
            return;
        };
        let Ok(entry) = entries_arr.at(0).dyn_into::<web_sys::PerformanceEntry>() else {
            return;
        };
        // FID = processingStart - startTime
        let processing_start = js_sys::Reflect::get(&entry, &JsValue::from_str("processingStart"))
            .ok()
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        let start_time = entry.start_time();
        let fid = processing_start - start_time;

        WEB_VITALS.with(|v| {
            v.borrow_mut().fid = Some(fid);
        });
        #[cfg(debug_assertions)]
        web_sys::console::log_1(&format!("[web_vitals] FID: {fid:.2}ms").into());
    }) as Box<dyn FnMut(JsValue, JsValue)>);

    observe_performance("first-input", true, None, &callback);

    callback.forget();
}

// ── CLS (Cumulative Layout Shift) ──

fn observe_cls() {
    let callback = Closure::wrap(Box::new(move |list: JsValue, _observer: JsValue| {
        let mut cls_score = WEB_VITALS.with(|v| v.borrow().cls.unwrap_or(0.0));

        let Some(entries_arr) = observer_entries(&list) else {
            return;
        };
        for i in 0..entries_arr.length() {
            if let Ok(entry) = entries_arr.at(i as i32).dyn_into::<web_sys::PerformanceEntry>() {
                // Check hadRecentInput property
                let had_recent_input = js_sys::Reflect::get(&entry, &JsValue::from_str("hadRecentInput"))
                    .ok()
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);

                if !had_recent_input {
                    let value = js_sys::Reflect::get(&entry, &JsValue::from_str("value"))
                        .ok()
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.0);
                    cls_score += value;
                }
            }
        }

        WEB_VITALS.with(|v| {
            v.borrow_mut().cls = Some(cls_score);
        });
        #[cfg(debug_assertions)]
        web_sys::console::log_1(&format!("[web_vitals] CLS: {cls_score:.4}").into());
    }) as Box<dyn FnMut(JsValue, JsValue)>);

    observe_performance("layout-shift", true, None, &callback);

    callback.forget();
}

// ── INP (Interaction to Next Paint) ──

fn observe_inp() {
    let callback = Closure::wrap(Box::new(move |list: JsValue, _observer: JsValue| {
        let mut max_inp = WEB_VITALS.with(|v| v.borrow().inp.unwrap_or(0.0));

        let Some(entries_arr) = observer_entries(&list) else {
            return;
        };
        for i in 0..entries_arr.length() {
            if let Ok(entry) = entries_arr.at(i as i32).dyn_into::<web_sys::PerformanceEntry>() {
                let duration = entry.duration();
                if duration > max_inp {
                    max_inp = duration;
                }
            }
        }

        WEB_VITALS.with(|v| {
            v.borrow_mut().inp = Some(max_inp);
        });
        #[cfg(debug_assertions)]
        web_sys::console::log_1(&format!("[web_vitals] INP: {max_inp:.2}ms").into());
    }) as Box<dyn FnMut(JsValue, JsValue)>);

    observe_performance("event", true, Some(40.0), &callback); // Track interactions > 40ms

    callback.forget();
}
