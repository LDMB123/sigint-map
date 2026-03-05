use std::collections::HashMap;

#[derive(Clone, Default, serde::Serialize, serde::Deserialize, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WebgpuRuntimeTelemetry {
    #[serde(default)]
    pub counters: HashMap<String, u64>,
    #[serde(default)]
    pub last_event: Option<String>,
    #[serde(default)]
    pub last_event_ts: Option<f64>,
}

#[derive(Clone, Default, serde::Serialize, serde::Deserialize, PartialEq, Eq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AppleSiliconWorkgroup {
    #[serde(default)]
    pub dot: Option<usize>,
    #[serde(default)]
    pub score: Option<usize>,
}

#[derive(Clone, Default, serde::Serialize, serde::Deserialize, PartialEq, Eq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AppleSiliconWorkerProfile {
    #[serde(default)]
    pub threshold_floats: Option<usize>,
    #[serde(default)]
    pub max_floats: Option<usize>,
}

#[derive(Clone, Default, serde::Serialize, serde::Deserialize, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AppleSiliconProfile {
    #[serde(default)]
    pub is_apple_silicon: bool,
    #[serde(default)]
    pub cpu_cores: Option<f64>,
    #[serde(default)]
    pub device_memory_gb: Option<f64>,
    #[serde(default)]
    pub workgroup: Option<AppleSiliconWorkgroup>,
    #[serde(default)]
    pub worker: Option<AppleSiliconWorkerProfile>,
}

#[cfg(feature = "hydrate")]
use wasm_bindgen::prelude::wasm_bindgen;
#[cfg(feature = "hydrate")]
use wasm_bindgen::JsValue;

#[cfg(feature = "hydrate")]
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = window, js_name = dmbGetWebgpuTelemetry, catch)]
    fn js_get_webgpu_runtime_telemetry() -> Result<JsValue, JsValue>;

    #[wasm_bindgen(js_namespace = window, js_name = dmbResetWebgpuTelemetry, catch)]
    fn js_reset_webgpu_runtime_telemetry() -> Result<(), JsValue>;

    #[wasm_bindgen(js_namespace = window, js_name = dmbGetAppleSiliconProfile, catch)]
    fn js_get_apple_silicon_profile() -> Result<JsValue, JsValue>;
}

#[cfg(feature = "hydrate")]
fn has_window_function(name: &str) -> bool {
    crate::browser::runtime::window_property_or_undefined(name).is_function()
}

#[cfg(feature = "hydrate")]
pub fn load_runtime_telemetry() -> Option<WebgpuRuntimeTelemetry> {
    if !has_window_function("dmbGetWebgpuTelemetry") {
        return None;
    }
    let value = js_get_webgpu_runtime_telemetry().ok()?;
    serde_wasm_bindgen::from_value(value).ok()
}

#[cfg(not(feature = "hydrate"))]
pub fn load_runtime_telemetry() -> Option<WebgpuRuntimeTelemetry> {
    None
}

#[cfg(feature = "hydrate")]
pub fn reset_runtime_telemetry() {
    if !has_window_function("dmbResetWebgpuTelemetry") {
        return;
    }
    let _ = js_reset_webgpu_runtime_telemetry();
}

#[cfg(not(feature = "hydrate"))]
pub fn reset_runtime_telemetry() {}

#[cfg(feature = "hydrate")]
pub fn load_apple_silicon_profile() -> Option<AppleSiliconProfile> {
    if !has_window_function("dmbGetAppleSiliconProfile") {
        return None;
    }
    let value = js_get_apple_silicon_profile().ok()?;
    serde_wasm_bindgen::from_value(value).ok()
}

#[cfg(not(feature = "hydrate"))]
pub fn load_apple_silicon_profile() -> Option<AppleSiliconProfile> {
    None
}

#[cfg(test)]
mod tests {
    use super::{
        AppleSiliconProfile, AppleSiliconWorkerProfile, AppleSiliconWorkgroup,
        WebgpuRuntimeTelemetry,
    };

    #[test]
    fn diagnostics_types_use_camel_case_fields() {
        let telemetry_json =
            serde_json::to_value(WebgpuRuntimeTelemetry::default()).expect("serialize telemetry");
        let telemetry_obj = telemetry_json
            .as_object()
            .expect("telemetry should serialize as object");
        assert!(telemetry_obj.contains_key("counters"));
        assert!(telemetry_obj.contains_key("lastEvent"));
        assert!(telemetry_obj.contains_key("lastEventTs"));

        let profile_json = serde_json::to_value(AppleSiliconProfile {
            is_apple_silicon: true,
            cpu_cores: Some(10.0),
            device_memory_gb: Some(16.0),
            workgroup: Some(AppleSiliconWorkgroup {
                dot: Some(256),
                score: Some(256),
            }),
            worker: Some(AppleSiliconWorkerProfile {
                threshold_floats: Some(25_000),
                max_floats: Some(5_000_000),
            }),
        })
        .expect("serialize profile");

        let profile_obj = profile_json
            .as_object()
            .expect("profile should serialize as object");
        assert!(profile_obj.contains_key("isAppleSilicon"));
        assert!(profile_obj.contains_key("cpuCores"));
        assert!(profile_obj.contains_key("deviceMemoryGb"));
        assert!(profile_obj.contains_key("workgroup"));
        assert!(profile_obj.contains_key("worker"));
    }

    #[cfg(not(feature = "hydrate"))]
    #[test]
    fn diagnostics_apis_are_noops_without_hydrate() {
        assert_eq!(super::load_runtime_telemetry(), None);
        assert_eq!(super::load_apple_silicon_profile(), None);
        super::reset_runtime_telemetry();
    }
}
