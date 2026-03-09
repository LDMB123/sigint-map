#[cfg(feature = "hydrate")]
pub fn window_local_storage() -> Option<web_sys::Storage> {
    let window = web_sys::window()?;
    window.local_storage().ok().flatten()
}

#[cfg(not(feature = "hydrate"))]
pub fn window_local_storage() -> Option<web_sys::Storage> {
    None
}

#[cfg(feature = "hydrate")]
pub fn window_cache_storage() -> Option<web_sys::CacheStorage> {
    let window = web_sys::window()?;
    window.caches().ok()
}

#[cfg(not(feature = "hydrate"))]
pub fn window_cache_storage() -> Option<web_sys::CacheStorage> {
    None
}

#[cfg(feature = "hydrate")]
pub fn navigator_service_worker_container() -> Option<web_sys::ServiceWorkerContainer> {
    let window = web_sys::window()?;
    Some(window.navigator().service_worker())
}

#[cfg(not(feature = "hydrate"))]
pub fn navigator_service_worker_container() -> Option<web_sys::ServiceWorkerContainer> {
    None
}

#[cfg(feature = "hydrate")]
pub fn navigator_storage_manager() -> Option<web_sys::StorageManager> {
    let window = web_sys::window()?;
    Some(window.navigator().storage())
}

#[cfg(not(feature = "hydrate"))]
pub fn navigator_storage_manager() -> Option<web_sys::StorageManager> {
    None
}

#[cfg(feature = "hydrate")]
pub fn navigator_device_memory_gb() -> Option<f64> {
    super::reflect::navigator_property_or_undefined("deviceMemory").as_f64()
}

#[cfg(not(feature = "hydrate"))]
pub fn navigator_device_memory_gb() -> Option<f64> {
    None
}

#[cfg(feature = "hydrate")]
pub fn navigator_hardware_concurrency() -> Option<usize> {
    let window = web_sys::window()?;
    let concurrency = window.navigator().hardware_concurrency().max(1.0).trunc();
    if !concurrency.is_finite() {
        return None;
    }
    if concurrency > (usize::MAX as f64) {
        return Some(usize::MAX);
    }
    format!("{concurrency:.0}").parse::<usize>().ok()
}

#[cfg(not(feature = "hydrate"))]
pub fn navigator_hardware_concurrency() -> Option<usize> {
    None
}

#[cfg(feature = "hydrate")]
pub fn navigator_on_line() -> Option<bool> {
    let window = web_sys::window()?;
    Some(window.navigator().on_line())
}

#[cfg(not(feature = "hydrate"))]
pub fn navigator_on_line() -> Option<bool> {
    None
}

#[cfg(feature = "hydrate")]
fn normalize_non_empty(value: Option<String>) -> Option<String> {
    value
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
}

#[cfg(feature = "hydrate")]
pub(crate) fn navigator_platform() -> Option<String> {
    normalize_non_empty(super::reflect::navigator_property_or_undefined("platform").as_string())
}

#[cfg(not(feature = "hydrate"))]
#[allow(dead_code)]
pub(crate) fn navigator_platform() -> Option<String> {
    None
}

#[cfg(feature = "hydrate")]
pub(crate) fn navigator_user_agent() -> Option<String> {
    normalize_non_empty(super::reflect::navigator_property_or_undefined("userAgent").as_string())
}

#[cfg(not(feature = "hydrate"))]
#[allow(dead_code)]
pub(crate) fn navigator_user_agent() -> Option<String> {
    None
}
