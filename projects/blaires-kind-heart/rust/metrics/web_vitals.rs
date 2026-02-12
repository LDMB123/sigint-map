//! Web Vitals tracking using PerformanceObserver API.
//! Tracks LCP, FID, CLS, and INP for Safari 26.2.

use std::cell::RefCell;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::{JsCast, JsValue};
use web_sys::PerformanceObserver;

thread_local! {
    static WEB_VITALS: RefCell<WebVitals> = RefCell::new(WebVitals::new());
}

#[derive(Debug, Clone)]
pub struct WebVitals {
    pub lcp: Option<f64>,  // Largest Contentful Paint
    pub fid: Option<f64>,  // First Input Delay
    pub cls: Option<f64>,  // Cumulative Layout Shift
    pub inp: Option<f64>,  // Interaction to Next Paint
}

impl WebVitals {
    pub fn new() -> Self {
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
    observe_inp();
}

/// Get current Web Vitals snapshot (for debug panel).
pub fn get_vitals() -> WebVitals {
    WEB_VITALS.with(|v| v.borrow().clone())
}

// ── LCP (Largest Contentful Paint) ──

fn observe_lcp() {
    let callback = Closure::wrap(Box::new(move |list: JsValue, _observer: JsValue| {
        // PerformanceObserverEntryList.getEntries()
        if let Ok(entries) = js_sys::Reflect::get(&list, &JsValue::from_str("getEntries")) {
            if let Ok(func) = entries.dyn_into::<js_sys::Function>() {
                if let Ok(entries_arr) = func.call0(&list).and_then(|v| v.dyn_into::<js_sys::Array>()) {
                    if let Ok(last_entry) = entries_arr.at(entries_arr.length() as i32 - 1).dyn_into::<web_sys::PerformanceEntry>() {
                        let start_time = last_entry.start_time();
                        WEB_VITALS.with(|v| {
                            v.borrow_mut().lcp = Some(start_time);
                        });
                        web_sys::console::log_1(&format!("[web_vitals] LCP: {:.2}ms", start_time).into());
                    }
                }
            }
        }
    }) as Box<dyn FnMut(JsValue, JsValue)>);

    if let Ok(observer) = PerformanceObserver::new(callback.as_ref().unchecked_ref()) {
        let opts = crate::bindings::PerformanceObserveOptions::new();
        opts.set_type("largest-contentful-paint");
        opts.set_buffered(true);
        observer.observe(&opts.unchecked_into());
    }

    callback.forget();
}

// ── FID (First Input Delay) ──

fn observe_fid() {
    let callback = Closure::wrap(Box::new(move |list: JsValue, _observer: JsValue| {
        if let Ok(entries) = js_sys::Reflect::get(&list, &JsValue::from_str("getEntries")) {
            if let Ok(func) = entries.dyn_into::<js_sys::Function>() {
                if let Ok(entries_arr) = func.call0(&list).and_then(|v| v.dyn_into::<js_sys::Array>()) {
                    if let Ok(entry) = entries_arr.at(0).dyn_into::<web_sys::PerformanceEntry>() {
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
                        web_sys::console::log_1(&format!("[web_vitals] FID: {:.2}ms", fid).into());
                    }
                }
            }
        }
    }) as Box<dyn FnMut(JsValue, JsValue)>);

    if let Ok(observer) = PerformanceObserver::new(callback.as_ref().unchecked_ref()) {
        let opts = crate::bindings::PerformanceObserveOptions::new();
        opts.set_type("first-input");
        opts.set_buffered(true);
        observer.observe(&opts.unchecked_into());
    }

    callback.forget();
}

// ── CLS (Cumulative Layout Shift) ──

fn observe_cls() {
    let callback = Closure::wrap(Box::new(move |list: JsValue, _observer: JsValue| {
        let mut cls_score = WEB_VITALS.with(|v| v.borrow().cls.unwrap_or(0.0));

        if let Ok(entries) = js_sys::Reflect::get(&list, &JsValue::from_str("getEntries")) {
            if let Ok(func) = entries.dyn_into::<js_sys::Function>() {
                if let Ok(entries_arr) = func.call0(&list).and_then(|v| v.dyn_into::<js_sys::Array>()) {
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
                }
            }
        }

        WEB_VITALS.with(|v| {
            v.borrow_mut().cls = Some(cls_score);
        });
        web_sys::console::log_1(&format!("[web_vitals] CLS: {:.4}", cls_score).into());
    }) as Box<dyn FnMut(JsValue, JsValue)>);

    if let Ok(observer) = PerformanceObserver::new(callback.as_ref().unchecked_ref()) {
        let opts = crate::bindings::PerformanceObserveOptions::new();
        opts.set_type("layout-shift");
        opts.set_buffered(true);
        observer.observe(&opts.unchecked_into());
    }

    callback.forget();
}

// ── INP (Interaction to Next Paint) ──

fn observe_inp() {
    let callback = Closure::wrap(Box::new(move |list: JsValue, _observer: JsValue| {
        let mut max_inp = WEB_VITALS.with(|v| v.borrow().inp.unwrap_or(0.0));

        if let Ok(entries) = js_sys::Reflect::get(&list, &JsValue::from_str("getEntries")) {
            if let Ok(func) = entries.dyn_into::<js_sys::Function>() {
                if let Ok(entries_arr) = func.call0(&list).and_then(|v| v.dyn_into::<js_sys::Array>()) {
                    for i in 0..entries_arr.length() {
                        if let Ok(entry) = entries_arr.at(i as i32).dyn_into::<web_sys::PerformanceEntry>() {
                            let duration = entry.duration();
                            if duration > max_inp {
                                max_inp = duration;
                            }
                        }
                    }
                }
            }
        }

        WEB_VITALS.with(|v| {
            v.borrow_mut().inp = Some(max_inp);
        });
        web_sys::console::log_1(&format!("[web_vitals] INP: {:.2}ms", max_inp).into());
    }) as Box<dyn FnMut(JsValue, JsValue)>);

    if let Ok(observer) = PerformanceObserver::new(callback.as_ref().unchecked_ref()) {
        let opts = crate::bindings::PerformanceObserveOptions::new();
        opts.set_type("event");
        opts.set_buffered(true);
        opts.set_duration_threshold(40.0);  // Track interactions > 40ms
        observer.observe(&opts.unchecked_into());
    }

    callback.forget();
}
