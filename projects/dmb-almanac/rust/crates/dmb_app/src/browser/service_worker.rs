#[cfg(feature = "hydrate")]
use wasm_bindgen_futures::JsFuture;
#[cfg(feature = "hydrate")]
use web_sys::{RegistrationOptions, ServiceWorkerContainer, ServiceWorkerUpdateViaCache};

#[cfg(any(feature = "hydrate", test))]
const DEFAULT_SW_SCRIPT_URL: &str = "/sw.js";

#[cfg(feature = "hydrate")]
fn service_worker_container() -> Option<ServiceWorkerContainer> {
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
}
