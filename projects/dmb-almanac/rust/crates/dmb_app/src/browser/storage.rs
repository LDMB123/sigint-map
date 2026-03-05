#[cfg(feature = "hydrate")]
use serde::Deserialize;
use serde::Serialize;

#[cfg(feature = "hydrate")]
use wasm_bindgen_futures::JsFuture;

#[cfg(feature = "hydrate")]
pub fn local_storage() -> Option<web_sys::Storage> {
    crate::browser::runtime::window_local_storage()
}

#[cfg(not(feature = "hydrate"))]
pub fn local_storage() -> Option<()> {
    None
}

#[cfg(feature = "hydrate")]
pub fn with_local_storage<T>(callback: impl FnOnce(&web_sys::Storage) -> T) -> Option<T> {
    local_storage().map(|storage| callback(&storage))
}

#[cfg(not(feature = "hydrate"))]
pub fn with_local_storage<T>(_callback: impl FnOnce(&()) -> T) -> Option<T> {
    None
}

#[cfg(feature = "hydrate")]
pub fn storage_item(storage: &web_sys::Storage, key: &str) -> Option<String> {
    storage.get_item(key).ok().flatten()
}

#[cfg(feature = "hydrate")]
pub fn set_storage_item(storage: &web_sys::Storage, key: &str, value: &str) {
    let _ = storage.set_item(key, value);
}

#[cfg(feature = "hydrate")]
pub fn set_storage_json<T>(storage: &web_sys::Storage, key: &str, value: &T)
where
    T: Serialize + ?Sized,
{
    if let Ok(payload) = serde_json::to_string(value) {
        set_storage_item(storage, key, &payload);
    }
}

#[cfg(feature = "hydrate")]
pub fn remove_storage_item(storage: &web_sys::Storage, key: &str) {
    let _ = storage.remove_item(key);
}

#[cfg(feature = "hydrate")]
pub fn storage_flag_enabled(storage: &web_sys::Storage, key: &str) -> bool {
    parse_flag(storage_item(storage, key).as_deref())
}

pub fn parse_flag(value: Option<&str>) -> bool {
    matches!(value, Some("1"))
}

#[cfg(feature = "hydrate")]
pub fn local_storage_item(key: &str) -> Option<String> {
    with_local_storage(|storage| storage_item(storage, key)).flatten()
}

#[cfg(not(feature = "hydrate"))]
pub fn local_storage_item(_key: &str) -> Option<String> {
    None
}

#[cfg(feature = "hydrate")]
pub fn local_storage_json<T>(key: &str) -> Option<T>
where
    T: serde::de::DeserializeOwned,
{
    local_storage_item(key).and_then(|payload| serde_json::from_str(&payload).ok())
}

#[cfg(not(feature = "hydrate"))]
pub fn local_storage_json<T>(_key: &str) -> Option<T>
where
    T: serde::de::DeserializeOwned,
{
    None
}

#[cfg(feature = "hydrate")]
pub fn local_storage_parse<T>(key: &str) -> Option<T>
where
    T: std::str::FromStr,
{
    local_storage_item(key)?.parse::<T>().ok()
}

#[cfg(not(feature = "hydrate"))]
pub fn local_storage_parse<T>(_key: &str) -> Option<T>
where
    T: std::str::FromStr,
{
    None
}

#[cfg(feature = "hydrate")]
pub fn set_local_storage_item(key: &str, value: &str) {
    let _ = with_local_storage(|storage| set_storage_item(storage, key, value));
}

#[cfg(not(feature = "hydrate"))]
pub fn set_local_storage_item(_key: &str, _value: &str) {}

#[cfg(feature = "hydrate")]
pub fn set_local_storage_json<T>(key: &str, value: &T)
where
    T: Serialize + ?Sized,
{
    let _ = with_local_storage(|storage| set_storage_json(storage, key, value));
}

#[cfg(not(feature = "hydrate"))]
pub fn set_local_storage_json<T>(_key: &str, _value: &T)
where
    T: Serialize + ?Sized,
{
}

#[cfg(feature = "hydrate")]
pub fn remove_local_storage_item(key: &str) {
    let _ = with_local_storage(|storage| remove_storage_item(storage, key));
}

#[cfg(not(feature = "hydrate"))]
pub fn remove_local_storage_item(_key: &str) {}

pub fn local_storage_flag_enabled(key: &str) -> bool {
    parse_flag(local_storage_item(key).as_deref())
}

pub fn set_local_storage_flag(key: &str, enabled: bool) {
    set_local_storage_item(key, if enabled { "1" } else { "0" });
}

pub fn local_storage_f64(key: &str) -> Option<f64> {
    parse_f64(local_storage_item(key).as_deref())
}

pub fn set_local_storage_f64(key: &str, value: f64) {
    set_local_storage_item(key, &value.to_string());
}

pub fn parse_f64(value: Option<&str>) -> Option<f64> {
    value.and_then(|raw| raw.parse::<f64>().ok())
}

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, Copy, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StorageEstimateValue {
    #[serde(default)]
    usage: Option<f64>,
    #[serde(default)]
    quota: Option<f64>,
}

#[cfg(feature = "hydrate")]
pub async fn estimate_usage_quota() -> Option<(Option<f64>, Option<f64>)> {
    let manager = crate::browser::runtime::navigator_storage_manager()?;
    let estimate = JsFuture::from(manager.estimate().ok()?).await.ok()?;
    let parsed = serde_wasm_bindgen::from_value::<StorageEstimateValue>(estimate).ok()?;
    Some((parsed.usage, parsed.quota))
}

#[cfg(not(feature = "hydrate"))]
pub async fn estimate_usage_quota() -> Option<(Option<f64>, Option<f64>)> {
    None
}

#[cfg(test)]
mod tests {
    use super::{parse_f64, parse_flag};

    #[test]
    fn parse_flag_enabled_only_for_one() {
        assert!(parse_flag(Some("1")));
        assert!(!parse_flag(Some("0")));
        assert!(!parse_flag(Some("true")));
        assert!(!parse_flag(None));
    }

    #[test]
    fn parse_f64_handles_valid_and_invalid_values() {
        assert_eq!(parse_f64(Some("42.5")), Some(42.5));
        assert_eq!(parse_f64(Some("not-a-number")), None);
        assert_eq!(parse_f64(None), None);
    }

    #[cfg(not(feature = "hydrate"))]
    #[test]
    fn estimate_usage_quota_is_noop_without_hydrate() {
        let _ = super::estimate_usage_quota;
    }
}
