use super::*;

pub(in super::super) fn shorten_script_url(url: &str) -> String {
    url.rsplit('/')
        .next()
        .map_or_else(|| url.to_string(), std::string::ToString::to_string)
}

#[cfg(feature = "hydrate")]
pub(in super::super) fn schedule_window_timeout(
    timeout_ms: i32,
    callback: impl FnOnce() + 'static,
) {
    let _ = crate::browser::runtime::set_timeout_once(timeout_ms, callback);
}

#[cfg(not(feature = "hydrate"))]
pub(in super::super) fn schedule_window_timeout(
    _timeout_ms: i32,
    _callback: impl FnOnce() + 'static,
) {
}

#[cfg(feature = "hydrate")]
pub(in super::super) fn deferred_status_tasks_delay_ms() -> i32 {
    if crate::browser::runtime::navigator_property_or_undefined("webdriver")
        .as_bool()
        .unwrap_or(false)
    {
        0
    } else {
        DEFERRED_IMPORT_START_DELAY_MS
    }
}

#[cfg(not(feature = "hydrate"))]
pub(in super::super) const fn deferred_status_tasks_delay_ms() -> i32 {
    DEFERRED_IMPORT_START_DELAY_MS
}

#[cfg(feature = "hydrate")]
pub(super) fn set_local_storage_item(key: &str, value: &str) {
    storage::set_local_storage_item(key, value);
}

#[cfg(not(feature = "hydrate"))]
pub(super) fn set_local_storage_item(_key: &str, _value: &str) {}

#[cfg(feature = "hydrate")]
pub(in super::super) fn remove_local_storage_item(key: &str) {
    storage::remove_local_storage_item(key);
}

#[cfg(not(feature = "hydrate"))]
pub(in super::super) fn remove_local_storage_item(_key: &str) {}

#[cfg(feature = "hydrate")]
pub(in super::super) fn local_storage_item_by_key(key: &str) -> Option<String> {
    storage::local_storage_item(key)
}

#[cfg(not(feature = "hydrate"))]
pub(in super::super) fn local_storage_item_by_key(_key: &str) -> Option<String> {
    None
}

#[cfg(feature = "hydrate")]
pub(in super::super) fn local_storage_f64_by_key(key: &str) -> Option<f64> {
    storage::local_storage_f64(key)
}

#[cfg(not(feature = "hydrate"))]
pub(in super::super) fn local_storage_f64_by_key(_key: &str) -> Option<f64> {
    None
}

#[cfg(feature = "hydrate")]
pub(in super::super) fn set_local_storage_f64_item(key: &str, value: f64) {
    storage::set_local_storage_f64(key, value);
}

#[cfg(not(feature = "hydrate"))]
pub(in super::super) fn set_local_storage_f64_item(_key: &str, _value: f64) {}

#[cfg(feature = "hydrate")]
pub(super) fn should_auto_check_for_updates(now_ms: f64) -> bool {
    let Some(last_checked) = local_storage_f64_by_key(UPDATE_CHECKED_AT_KEY) else {
        return true;
    };

    now_ms <= last_checked || (now_ms - last_checked) >= AUTO_UPDATE_CHECK_INTERVAL_MS
}

#[cfg(not(feature = "hydrate"))]
pub(super) fn should_auto_check_for_updates(_now_ms: f64) -> bool {
    false
}

#[cfg(feature = "hydrate")]
pub(super) fn has_previous_cache_cleanup_marker() -> bool {
    local_storage_f64_by_key(PREVIOUS_CACHE_CLEANED_AT_KEY).is_some()
}

#[cfg(not(feature = "hydrate"))]
pub(super) fn has_previous_cache_cleanup_marker() -> bool {
    false
}
