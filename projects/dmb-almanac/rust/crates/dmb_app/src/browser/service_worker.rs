#[cfg(feature = "hydrate")]
use wasm_bindgen::JsCast;
#[cfg(feature = "hydrate")]
use wasm_bindgen::JsValue;
#[cfg(feature = "hydrate")]
use wasm_bindgen_futures::JsFuture;
#[cfg(feature = "hydrate")]
use web_sys::{RegistrationOptions, ServiceWorkerContainer, ServiceWorkerUpdateViaCache};

#[cfg(any(feature = "hydrate", test))]
const DEFAULT_SW_SCRIPT_URL: &str = "/sw.js";

#[cfg(feature = "hydrate")]
pub fn service_worker_container() -> Option<ServiceWorkerContainer> {
    let window = web_sys::window()?;
    Some(window.navigator().service_worker())
}

#[cfg(feature = "hydrate")]
fn registration_options_update_via_cache_none() -> RegistrationOptions {
    let options = RegistrationOptions::new();
    options.set_update_via_cache(ServiceWorkerUpdateViaCache::None);
    options
}

#[cfg(feature = "hydrate")]
pub fn register_sw(script_url: &str) -> bool {
    let Some(container) = service_worker_container() else {
        return false;
    };

    let options = registration_options_update_via_cache_none();
    let promise = container.register_with_options(script_url, &options);

    leptos::task::spawn_local(async move {
        let _ = JsFuture::from(promise).await;
    });
    true
}

#[cfg(feature = "hydrate")]
pub fn register_default_sw() -> bool {
    register_sw(DEFAULT_SW_SCRIPT_URL)
}

#[cfg(not(feature = "hydrate"))]
pub fn register_default_sw() -> bool {
    false
}

#[cfg(feature = "hydrate")]
pub async fn current_registration(
    container: &ServiceWorkerContainer,
) -> Option<web_sys::ServiceWorkerRegistration> {
    let reg_val = JsFuture::from(container.get_registration()).await.ok()?;
    reg_val
        .dyn_into::<web_sys::ServiceWorkerRegistration>()
        .ok()
}

#[cfg(feature = "hydrate")]
pub fn has_controller(container: &ServiceWorkerContainer) -> bool {
    container.controller().is_some()
}

#[cfg(feature = "hydrate")]
pub fn controller(container: &ServiceWorkerContainer) -> Option<web_sys::ServiceWorker> {
    container.controller()
}

#[cfg(feature = "hydrate")]
pub fn worker_state(worker: &web_sys::ServiceWorker) -> Option<String> {
    crate::browser::runtime::property_or_undefined(worker.as_ref(), "state").as_string()
}

#[cfg(not(feature = "hydrate"))]
pub fn worker_state(_worker: &web_sys::ServiceWorker) -> Option<String> {
    None
}

#[cfg(feature = "hydrate")]
pub fn post_message_type(worker: &web_sys::ServiceWorker, message_type: &str) -> bool {
    let message = js_sys::Object::new();
    let _ = js_sys::Reflect::set(
        message.as_ref(),
        &JsValue::from_str("type"),
        &JsValue::from_str(message_type),
    );
    worker.post_message(&message).is_ok()
}

#[cfg(not(feature = "hydrate"))]
pub fn post_message_type(_worker: &web_sys::ServiceWorker, _message_type: &str) -> bool {
    false
}

#[cfg(feature = "hydrate")]
pub async fn cache_names() -> Option<Vec<String>> {
    let window = web_sys::window()?;
    let Ok(cache_storage) = window.caches() else {
        return None;
    };
    let Ok(keys) = JsFuture::from(cache_storage.keys()).await else {
        return None;
    };
    let keys: js_sys::Array = keys.dyn_into().unwrap_or_default();
    let mut names = Vec::with_capacity(keys.length() as usize);
    for key in keys.iter() {
        if let Some(name) = key.as_string() {
            names.push(name);
        }
    }
    Some(names)
}

#[cfg(not(feature = "hydrate"))]
pub async fn cache_names() -> Option<Vec<String>> {
    None
}

#[cfg(feature = "hydrate")]
pub async fn count_all_cache_entries() -> Option<usize> {
    let window = web_sys::window()?;
    let Ok(cache_storage) = window.caches() else {
        return None;
    };
    let names = cache_names().await?;
    let mut total = 0usize;
    for name in names {
        let cache_val = JsFuture::from(cache_storage.open(&name)).await.ok()?;
        let cache: web_sys::Cache = cache_val.dyn_into().ok()?;
        let requests = JsFuture::from(cache.keys()).await.ok()?;
        let requests: js_sys::Array = requests.dyn_into().ok()?;
        total = total.saturating_add(requests.length() as usize);
    }
    Some(total)
}

#[cfg(not(feature = "hydrate"))]
pub async fn count_all_cache_entries() -> Option<usize> {
    None
}

#[cfg(feature = "hydrate")]
pub async fn delete_cache_by_name(name: &str) -> bool {
    let Some(window) = web_sys::window() else {
        return false;
    };
    let Ok(cache_storage) = window.caches() else {
        return false;
    };
    match JsFuture::from(cache_storage.delete(name)).await {
        Ok(result) => result.as_bool().unwrap_or(false),
        Err(_) => false,
    }
}

#[cfg(not(feature = "hydrate"))]
pub async fn delete_cache_by_name(_name: &str) -> bool {
    false
}

#[cfg(feature = "hydrate")]
pub async fn delete_paths_from_data_caches(paths: &[&str]) -> usize {
    let Some(window) = web_sys::window() else {
        return 0;
    };
    let Ok(cache_storage) = window.caches() else {
        return 0;
    };
    let Ok(keys) = JsFuture::from(cache_storage.keys()).await else {
        return 0;
    };
    let keys: js_sys::Array = keys.dyn_into().unwrap_or_default();
    let mut deleted = 0usize;

    for key in keys.iter() {
        let Some(name) = key.as_string() else {
            continue;
        };
        if !name.contains("-data-") {
            continue;
        }
        let Ok(cache_val) = JsFuture::from(cache_storage.open(&name)).await else {
            continue;
        };
        let Ok(cache) = cache_val.dyn_into::<web_sys::Cache>() else {
            continue;
        };
        for path in paths {
            if let Ok(result) = JsFuture::from(cache.delete_with_str(path)).await {
                if result.as_bool().unwrap_or(false) {
                    deleted = deleted.saturating_add(1);
                }
            }
        }
    }
    deleted
}

#[cfg(not(feature = "hydrate"))]
pub async fn delete_paths_from_data_caches(_paths: &[&str]) -> usize {
    0
}

#[cfg(feature = "hydrate")]
pub async fn delete_all_caches() -> usize {
    let mut deleted = 0usize;
    if let Some(names) = cache_names().await {
        for name in names {
            if delete_cache_by_name(&name).await {
                deleted = deleted.saturating_add(1);
            }
        }
    }
    deleted
}

#[cfg(not(feature = "hydrate"))]
pub async fn delete_all_caches() -> usize {
    0
}

#[cfg(test)]
mod tests {
    use super::DEFAULT_SW_SCRIPT_URL;

    #[test]
    fn default_sw_script_url_is_stable() {
        assert_eq!(DEFAULT_SW_SCRIPT_URL, "/sw.js");
    }

    #[cfg(not(feature = "hydrate"))]
    #[test]
    fn register_default_sw_is_noop_without_hydrate() {
        assert!(!super::register_default_sw());
    }

    #[cfg(not(feature = "hydrate"))]
    #[test]
    fn service_worker_helpers_are_noops_without_hydrate() {
        // Keep helper APIs linked and deterministic in non-hydrate builds.
        let _ = super::worker_state;
        let _ = super::post_message_type;
        let _ = super::cache_names;
        let _ = super::count_all_cache_entries;
        let _ = super::delete_cache_by_name;
        let _ = super::delete_paths_from_data_caches;
        let _ = super::delete_all_caches;
    }
}
