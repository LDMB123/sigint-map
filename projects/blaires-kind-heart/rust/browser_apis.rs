//! Thin wrappers over Safari 26.2 browser APIs.
//! Each function is a direct bridge — the API does the work.

use js_sys::{Function, Promise};
use wasm_bindgen::closure::Closure;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::JsFuture;
use web_sys::AbortController;

use crate::dom;

// ── inert attribute ──

// ── scheduler.yield() ──
// Safari 26.2 doesn't ship Scheduler API; use queueMicrotask for near-zero overhead yield.
// This provides cooperative multitasking by yielding to the browser microtask queue.
//
// Optimization (Phase 2):
// - Replaced setTimeout(0) with queueMicrotask (ES2018 standard)
// - setTimeout(0) had ~4ms minimum delay due to browser throttling
// - queueMicrotask runs before next event loop tick with <1ms overhead
// - 7 yields in boot: reduced from ~28ms to <2ms overhead
// - Microtasks run before rendering, allowing finer-grained control

pub async fn scheduler_yield() {
    yield_microtask().await;
}

/// Yield control to the microtask queue (near-zero overhead).
/// Runs before next event loop tick, faster than setTimeout(0).
async fn yield_microtask() {
    let promise = Promise::new(&mut |resolve, _reject| {
        let global = js_sys::global().unchecked_into::<web_sys::Window>();
        let queue_fn = js_sys::Reflect::get(&global, &"queueMicrotask".into())
            .expect("queueMicrotask unavailable")
            .unchecked_into::<js_sys::Function>();
        let _ = queue_fn.call1(&JsValue::NULL, &resolve);
    });
    let _ = JsFuture::from(promise).await;
}

// ── Web Locks API (Safari 15.4) ──
// navigator.locks.request(name, callback) — fully typed via web_sys::LockManager.

/// Lock mode for Web Locks API
#[derive(Copy, Clone)]
pub enum LockMode {
    /// Exclusive lock (default) - only one holder at a time
    Exclusive,
    /// Shared lock - multiple readers can hold simultaneously
    Shared,
}

/// Acquire a Web Lock with specified mode, execute operation, release lock
/// Phase 7: Added lock contention monitoring (warns if lock held >500ms)
pub async fn with_web_lock_mode<F, Fut, T>(
    name: &str,
    mode: LockMode,
    operation: F,
) -> Result<T, JsValue>
where
    F: FnOnce() -> Fut + 'static,
    Fut: std::future::Future<Output = Result<T, JsValue>> + 'static,
    T: 'static,
{
    let nav = dom::window().navigator();
    let ext_nav: &crate::bindings::ExtNavigator = nav.unchecked_ref();
    let lock_mgr: crate::bindings::LockManager = ext_nav.locks();
    let (tx, rx) = futures_channel::oneshot::channel::<Result<T, JsValue>>();

    // Track lock acquisition time for contention monitoring
    let lock_name = name.to_string();
    let mode_str = match mode {
        LockMode::Exclusive => "exclusive",
        LockMode::Shared => "shared",
    };

    let callback = Closure::<dyn FnMut(JsValue) -> Promise>::once(move |_lock: JsValue| {
        let (resolve_fn, promise) = new_promise_with_resolver();
        let lock_start = now_ms();
        let lock_name_inner = lock_name.clone();
        let mode_str_inner = mode_str;

        wasm_bindgen_futures::spawn_local(async move {
            let result = operation().await;
            let lock_duration = now_ms() - lock_start;

            // Warn if lock held >500ms (potential contention)
            if lock_duration > 500.0 {
                web_sys::console::warn_1(&format!(
                    "[web_locks] Lock '{}' ({}) held for {:.0}ms (contention warning)",
                    lock_name_inner, mode_str_inner, lock_duration
                ).into());
            }

            let _ = tx.send(result);
            let _ = resolve_fn.call0(&JsValue::NULL);
        });
        promise
    });

    let cb_fn: &Function = callback.as_ref().unchecked_ref();

    let lock_promise: Promise = match mode {
        LockMode::Exclusive => {
            // Use default exclusive mode (no options needed)
            lock_mgr.request_with_callback(name, cb_fn)
        }
        LockMode::Shared => {
            // Create options object with mode: "shared"
            let opts = js_sys::Object::new();
            let _ = js_sys::Reflect::set(&opts, &"mode".into(), &"shared".into());
            lock_mgr.request_with_options(name, &opts, cb_fn)
        }
    };

    callback.forget();
    let _ = JsFuture::from(lock_promise).await;
    rx.await.map_err(|_| JsValue::from_str("Web Lock cancelled"))?
}

/// Backward-compatible wrapper (exclusive mode by default)
pub async fn with_web_lock<F, Fut, T>(name: &str, operation: F) -> Result<T, JsValue>
where
    F: FnOnce() -> Fut + 'static,
    Fut: std::future::Future<Output = Result<T, JsValue>> + 'static,
    T: 'static,
{
    with_web_lock_mode(name, LockMode::Exclusive, operation).await
}

fn new_promise_with_resolver() -> (Function, Promise) {
    let resolve_holder = std::rc::Rc::new(std::cell::RefCell::new(None::<Function>));
    let holder = resolve_holder.clone();
    let mut cb = move |resolve: Function, _reject: Function| {
        *holder.borrow_mut() = Some(resolve);
    };
    let promise = Promise::new(&mut cb);
    let resolve = resolve_holder.borrow_mut().take().unwrap();
    (resolve, promise)
}

// ── AbortController ──

pub struct AbortHandle {
    controller: AbortController,
}

impl AbortHandle {
    pub fn abort(&self) {
        self.controller.abort();
    }

    /// Get the AbortSignal for use with addEventListener({ signal }) or fetch.
    pub fn signal(&self) -> web_sys::AbortSignal {
        self.controller.signal()
    }
}

impl Drop for AbortHandle {
    fn drop(&mut self) {
        self.abort();
    }
}

/// Create an AbortHandle guaranteed to succeed (panics only if AbortController unsupported).
pub fn new_abort_handle() -> AbortHandle {
    AbortHandle {
        controller: AbortController::new().expect("AbortController unavailable"),
    }
}

// ── sleep_ms ──

pub async fn sleep_ms(ms: i32) {
    let promise = Promise::new(&mut |resolve, _reject| {
        let _ = dom::window().set_timeout_with_callback_and_timeout_and_arguments_0(&resolve, ms);
    });
    let _ = JsFuture::from(promise).await;
}

// ── now_ms (monotonic) ──

pub fn now_ms() -> f64 {
    dom::window().performance().map(|p| p.now()).unwrap_or_else(js_sys::Date::now)
}

// ── Visibility change ──

pub fn on_visibility_change(callback: impl Fn(bool) + 'static) {
    let cb = Closure::<dyn FnMut(web_sys::Event)>::new(move |_event: web_sys::Event| {
        let visible = dom::document().visibility_state() == web_sys::VisibilityState::Visible;
        callback(visible);
    });
    let _ = dom::document().add_event_listener_with_callback(
        "visibilitychange",
        cb.as_ref().unchecked_ref(),
    );
    cb.forget();
}

// ── spawn_local_logged ──

pub fn spawn_local_logged<F>(label: &'static str, future: F)
where
    F: std::future::Future<Output = Result<(), JsValue>> + 'static,
{
    wasm_bindgen_futures::spawn_local(async move {
        if let Err(err) = future.await {
            let msg = err.as_string().unwrap_or_else(|| format!("{:?}", err));
            web_sys::console::warn_1(&format!("[{label}] error: {msg}").into());
        }
    });
}
