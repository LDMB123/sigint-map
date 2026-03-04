#[cfg(feature = "hydrate")]
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};
#[cfg(feature = "hydrate")]
use wasm_bindgen_futures::JsFuture;

#[cfg(any(feature = "hydrate", test))]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum SchedulerBackend {
    Yield,
    PostTask,
    Timeout,
}

#[cfg(any(feature = "hydrate", test))]
fn choose_backend(yield_supported: bool, post_task_supported: bool) -> SchedulerBackend {
    if yield_supported {
        SchedulerBackend::Yield
    } else if post_task_supported {
        SchedulerBackend::PostTask
    } else {
        SchedulerBackend::Timeout
    }
}

#[cfg(feature = "hydrate")]
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = scheduler, js_name = "yield", catch)]
    fn scheduler_yield() -> Result<js_sys::Promise, JsValue>;

    #[wasm_bindgen(js_namespace = scheduler, js_name = postTask, catch)]
    fn scheduler_post_task(
        callback: &js_sys::Function,
        options: &JsValue,
    ) -> Result<js_sys::Promise, JsValue>;
}

#[cfg(feature = "hydrate")]
fn timeout_promise(delay_ms: i32) -> js_sys::Promise {
    let delay_ms = delay_ms.max(0);
    js_sys::Promise::new(&mut move |resolve, _reject| {
        if let Some(window) = web_sys::window() {
            let _ =
                window.set_timeout_with_callback_and_timeout_and_arguments_0(&resolve, delay_ms);
            return;
        }
        let _ = resolve.call0(&JsValue::UNDEFINED);
    })
}

#[cfg(feature = "hydrate")]
fn post_task(delay_ms: i32) -> Option<js_sys::Promise> {
    let options = js_sys::Object::new();
    let _ = js_sys::Reflect::set(
        options.as_ref(),
        &JsValue::from_str("delay"),
        &JsValue::from_f64(f64::from(delay_ms.max(0))),
    );
    let callback = js_sys::Function::new_no_args("");
    scheduler_post_task(&callback, options.as_ref()).ok()
}

#[cfg(feature = "hydrate")]
async fn await_promise(promise: js_sys::Promise) {
    let _ = JsFuture::from(promise).await;
}

#[cfg(feature = "hydrate")]
pub async fn yield_now() {
    let yield_promise = scheduler_yield().ok();
    let post_task_promise = if yield_promise.is_none() {
        post_task(0)
    } else {
        None
    };

    match choose_backend(yield_promise.is_some(), post_task_promise.is_some()) {
        SchedulerBackend::Yield => {
            if let Some(promise) = yield_promise {
                await_promise(promise).await;
                return;
            }
        }
        SchedulerBackend::PostTask => {
            if let Some(promise) = post_task_promise {
                await_promise(promise).await;
                return;
            }
        }
        SchedulerBackend::Timeout => {}
    }

    await_promise(timeout_promise(0)).await;
}

#[cfg(not(feature = "hydrate"))]
#[allow(clippy::unused_async)]
pub async fn yield_now() {}

#[cfg(feature = "hydrate")]
pub async fn delay_ms(delay_ms: i32) {
    if let Some(promise) = post_task(delay_ms) {
        await_promise(promise).await;
        return;
    }
    await_promise(timeout_promise(delay_ms)).await;
}

#[cfg(not(feature = "hydrate"))]
#[allow(clippy::unused_async)]
pub async fn delay_ms(_delay_ms: i32) {}

#[cfg(test)]
mod tests {
    use super::{choose_backend, SchedulerBackend};

    #[test]
    fn choose_backend_prefers_scheduler_yield() {
        assert_eq!(
            choose_backend(true, true),
            SchedulerBackend::Yield,
            "scheduler.yield should win over postTask"
        );
    }

    #[test]
    fn choose_backend_uses_post_task_when_yield_missing() {
        assert_eq!(
            choose_backend(false, true),
            SchedulerBackend::PostTask,
            "postTask should be used when scheduler.yield is unavailable"
        );
    }

    #[test]
    fn choose_backend_falls_back_to_timeout() {
        assert_eq!(
            choose_backend(false, false),
            SchedulerBackend::Timeout,
            "timeout fallback should be selected when scheduler APIs are unavailable"
        );
    }
}
