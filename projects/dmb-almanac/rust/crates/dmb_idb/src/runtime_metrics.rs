use wasm_bindgen::JsValue;

#[derive(Debug, Clone, Default, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IdbRuntimeMetrics {
    pub open_blocked_count: u64,
    pub open_blocked_last_ms: Option<f64>,
    pub version_change_count: u64,
    pub version_change_last_ms: Option<f64>,
}

#[cfg(target_arch = "wasm32")]
const IDB_OPEN_BLOCKED_COUNT_KEY: &str = "dmb-idb-open-blocked-count";
#[cfg(target_arch = "wasm32")]
const IDB_OPEN_BLOCKED_LAST_KEY: &str = "dmb-idb-open-blocked-last";
#[cfg(target_arch = "wasm32")]
const IDB_VERSIONCHANGE_COUNT_KEY: &str = "dmb-idb-versionchange-count";
#[cfg(target_arch = "wasm32")]
const IDB_VERSIONCHANGE_LAST_KEY: &str = "dmb-idb-versionchange-last";

#[cfg(target_arch = "wasm32")]
fn with_local_storage(mut f: impl FnMut(&web_sys::Storage)) {
    let Some(window) = web_sys::window() else {
        return;
    };
    let Ok(Some(storage)) = window.local_storage() else {
        return;
    };
    f(&storage);
}

#[cfg(target_arch = "wasm32")]
fn read_storage_u64(key: &str) -> u64 {
    let mut current = 0;
    with_local_storage(|storage| {
        current = storage
            .get_item(key)
            .ok()
            .flatten()
            .and_then(|raw| raw.parse::<u64>().ok())
            .unwrap_or(0);
    });
    current
}

#[cfg(target_arch = "wasm32")]
fn read_storage_f64(key: &str) -> Option<f64> {
    let mut value = None;
    with_local_storage(|storage| {
        value = storage
            .get_item(key)
            .ok()
            .flatten()
            .and_then(|raw| raw.parse::<f64>().ok());
    });
    value
}

#[cfg(target_arch = "wasm32")]
fn write_storage_value(key: &str, value: &str) {
    with_local_storage(|storage| {
        let _ = storage.set_item(key, value);
    });
}

#[cfg(target_arch = "wasm32")]
fn bump_storage_counter(key: &str) {
    let next = read_storage_u64(key).saturating_add(1);
    write_storage_value(key, &next.to_string());
}

#[cfg(target_arch = "wasm32")]
pub(crate) fn record_open_blocked() {
    bump_storage_counter(IDB_OPEN_BLOCKED_COUNT_KEY);
    write_storage_value(IDB_OPEN_BLOCKED_LAST_KEY, &js_sys::Date::now().to_string());
}

#[cfg(target_arch = "wasm32")]
pub(crate) fn record_version_change() {
    bump_storage_counter(IDB_VERSIONCHANGE_COUNT_KEY);
    write_storage_value(IDB_VERSIONCHANGE_LAST_KEY, &js_sys::Date::now().to_string());
}

#[cfg(target_arch = "wasm32")]
pub fn idb_runtime_metrics() -> Result<IdbRuntimeMetrics, JsValue> {
    Ok(IdbRuntimeMetrics {
        open_blocked_count: read_storage_u64(IDB_OPEN_BLOCKED_COUNT_KEY),
        open_blocked_last_ms: read_storage_f64(IDB_OPEN_BLOCKED_LAST_KEY),
        version_change_count: read_storage_u64(IDB_VERSIONCHANGE_COUNT_KEY),
        version_change_last_ms: read_storage_f64(IDB_VERSIONCHANGE_LAST_KEY),
    })
}

#[cfg(target_arch = "wasm32")]
pub fn idb_runtime_metrics_js() -> Result<JsValue, JsValue> {
    let metrics = idb_runtime_metrics()?;
    serde_wasm_bindgen::to_value(&metrics).map_err(|err| JsValue::from_str(&format!("{err:?}")))
}

#[cfg(not(target_arch = "wasm32"))]
pub fn idb_runtime_metrics() -> Result<IdbRuntimeMetrics, JsValue> {
    Err(JsValue::from_str(
        "IndexedDB runtime metrics only available in wasm32",
    ))
}

#[cfg(not(target_arch = "wasm32"))]
pub fn idb_runtime_metrics_js() -> Result<JsValue, JsValue> {
    Err(JsValue::from_str(
        "IndexedDB runtime metrics only available in wasm32",
    ))
}
