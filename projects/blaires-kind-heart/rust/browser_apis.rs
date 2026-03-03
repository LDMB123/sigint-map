use crate::dom;
use js_sys::{Function, Promise};
use wasm_bindgen::closure::Closure;
use wasm_bindgen::{JsCast, UnwrapThrowExt};
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::JsFuture;
use web_sys::AbortController;
pub async fn scheduler_yield() {
    // Try scheduler.yield() first (Prioritized Task Scheduling API — Safari 26.2+)
    let global = js_sys::global();
    if let Ok(sched) = js_sys::Reflect::get(&global, &"scheduler".into()) {
        if !sched.is_undefined() && !sched.is_null() {
            if let Ok(yield_fn) = js_sys::Reflect::get(&sched, &"yield".into()) {
                if let Ok(f) = yield_fn.dyn_into::<js_sys::Function>() {
                    if let Ok(result) = f.call0(&sched) {
                        if let Ok(promise) = result.dyn_into::<js_sys::Promise>() {
                            let _ = JsFuture::from(promise).await;
                            return;
                        }
                    }
                }
            }
        }
    }
    // Fallback: queueMicrotask
    yield_microtask().await;
}
async fn yield_microtask() {
    let promise = Promise::new(&mut |resolve, _reject| {
        let global = js_sys::global().unchecked_into::<web_sys::Window>();
        let queue_fn = js_sys::Reflect::get(&global, &"queueMicrotask".into()).ok();
        if let Some(func) = queue_fn.and_then(|v| v.dyn_into::<js_sys::Function>().ok()) {
            let _ = func.call1(&JsValue::NULL, &resolve);
        } else {
            /* Fallback: setTimeout(resolve, 0) */
            let _ = global.set_timeout_with_callback_and_timeout_and_arguments_0(&resolve, 0);
        }
    });
    let _ = JsFuture::from(promise).await;
}
#[derive(Copy, Clone)]
pub enum LockMode {
    Exclusive,
    Shared,
}
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
    let (tx, rx) = futures::channel::oneshot::channel::<Result<T, JsValue>>();
    let lock_name = name.to_string();
    let mode_str = match mode {
        LockMode::Exclusive => "exclusive",
        LockMode::Shared => "shared",
    };
    let callback = Closure::<dyn FnMut(JsValue) -> Promise>::once(move |_lock: JsValue| {
        let (resolve_fn, promise) = new_promise_with_resolver();
        let lock_start = now_ms();
        let lock_name_inner = lock_name;
        let mode_str_inner = mode_str;
        wasm_bindgen_futures::spawn_local(async move {
            let result = operation().await;
            let lock_duration = now_ms() - lock_start;
            if lock_duration > 500.0 {
                dom::warn(&format!("[web_locks] Lock '{lock_name_inner}' ({mode_str_inner}) held for {lock_duration:.0}ms (contention warning)"));
            }
            let _ = tx.send(result);
            let _ = resolve_fn.call0(&JsValue::NULL);
        });
        promise
    });
    let cb_fn: &Function = callback.as_ref().unchecked_ref();
    let lock_promise: Promise = match mode {
        LockMode::Exclusive => lock_mgr.request_with_callback(name, cb_fn),
        LockMode::Shared => {
            let opts = js_sys::Object::new();
            let _ = js_sys::Reflect::set(&opts, &"mode".into(), &"shared".into());
            lock_mgr.request_with_options(name, &opts, cb_fn)
        }
    };
    callback.forget();
    let _ = JsFuture::from(lock_promise).await;
    rx.await
        .map_err(|_| JsValue::from_str("Web Lock cancelled"))?
}
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
    let promise = Promise::new(&mut cb); /* Safe: Promise::new() calls its callback synchronously per the JS spec, so the resolver is always set by the time we reach this line. */
    let resolve = resolve_holder
        .borrow_mut()
        .take()
        .unwrap_throw();
    (resolve, promise)
}
pub struct AbortHandle {
    controller: AbortController,
}
impl AbortHandle {
    pub fn abort(&self) {
        self.controller.abort();
    }
    pub fn signal(&self) -> web_sys::AbortSignal {
        self.controller.signal()
    }
}
impl Drop for AbortHandle {
    fn drop(&mut self) {
        self.abort();
    }
}
pub fn new_abort_handle() -> Option<AbortHandle> {
    Some(AbortHandle {
        controller: AbortController::new().ok()?,
    })
}
pub async fn sleep_ms(ms: i32) {
    let promise = Promise::new(&mut |resolve, _reject| {
        let _ = dom::window().set_timeout_with_callback_and_timeout_and_arguments_0(&resolve, ms);
    });
    let _ = JsFuture::from(promise).await;
}
pub fn now_ms() -> f64 {
    dom::window()
        .performance()
        .map_or_else(js_sys::Date::now, |p| p.now())
}
pub fn is_document_visible() -> bool {
    dom::document().visibility_state() == web_sys::VisibilityState::Visible
}
pub fn on_visibility_change(callback: impl Fn(bool) + 'static) {
    let cb = Closure::<dyn FnMut(web_sys::Event)>::new(move |_event: web_sys::Event| {
        callback(dom::document().visibility_state() == web_sys::VisibilityState::Visible);
    });
    let _ = dom::document()
        .add_event_listener_with_callback("visibilitychange", cb.as_ref().unchecked_ref());
    cb.forget();
}
pub fn spawn_local_logged<F>(label: &'static str, future: F)
where
    F: std::future::Future<Output = Result<(), JsValue>> + 'static,
{
    wasm_bindgen_futures::spawn_local(async move {
        if let Err(err) = future.await {
            let msg = err.as_string().unwrap_or_else(|| format!("{err:?}"));
            dom::warn(&format!("[{label}] error: {msg}"));
        }
    });
}
