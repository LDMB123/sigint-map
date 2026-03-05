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
fn detect_apple_silicon() -> bool {
    let platform = crate::browser::runtime::navigator_platform().unwrap_or_default();
    let user_agent = crate::browser::runtime::navigator_user_agent().unwrap_or_default();
    let user_agent_lower = user_agent.to_ascii_lowercase();

    let is_mac = platform.contains("Mac") || user_agent_lower.contains("mac");
    let looks_intel = platform.contains("Intel")
        || user_agent.contains("x86_64")
        || user_agent.contains("i386")
        || user_agent.contains("i486")
        || user_agent.contains("i586")
        || user_agent.contains("i686");
    is_mac && !looks_intel
}

#[cfg(feature = "hydrate")]
pub fn load_runtime_telemetry() -> Option<WebgpuRuntimeTelemetry> {
    let snapshot = crate::ai::load_webgpu_policy_snapshot()?;
    Some(WebgpuRuntimeTelemetry {
        counters: snapshot.telemetry.counters,
        last_event: snapshot.telemetry.last_event,
        last_event_ts: snapshot.telemetry.last_event_ts,
    })
}

#[cfg(not(feature = "hydrate"))]
pub fn load_runtime_telemetry() -> Option<WebgpuRuntimeTelemetry> {
    None
}

#[cfg(feature = "hydrate")]
pub fn reset_runtime_telemetry() {
    crate::ai::reset_webgpu_policy_telemetry();
}

#[cfg(not(feature = "hydrate"))]
pub fn reset_runtime_telemetry() {}

#[cfg(feature = "hydrate")]
pub fn load_apple_silicon_profile() -> Option<AppleSiliconProfile> {
    let is_apple_silicon = detect_apple_silicon();
    Some(AppleSiliconProfile {
        is_apple_silicon,
        cpu_cores: crate::browser::runtime::navigator_hardware_concurrency()
            .map(|cores| cores as f64),
        device_memory_gb: crate::browser::runtime::navigator_device_memory_gb(),
        workgroup: Some(AppleSiliconWorkgroup {
            dot: Some(if is_apple_silicon { 256 } else { 64 }),
            score: Some(if is_apple_silicon { 256 } else { 64 }),
        }),
        worker: Some(AppleSiliconWorkerProfile {
            threshold_floats: crate::ai::worker_threshold_value(),
            max_floats: crate::ai::worker_max_floats_value(),
        }),
    })
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
        let telemetry_json = match serde_json::to_value(WebgpuRuntimeTelemetry::default()) {
            Ok(value) => value,
            Err(err) => panic!("serialize telemetry: {err}"),
        };
        let Some(telemetry_obj) = telemetry_json.as_object() else {
            panic!("telemetry should serialize as object");
        };
        assert!(telemetry_obj.contains_key("counters"));
        assert!(telemetry_obj.contains_key("lastEvent"));
        assert!(telemetry_obj.contains_key("lastEventTs"));

        let profile_json = match serde_json::to_value(AppleSiliconProfile {
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
        }) {
            Ok(value) => value,
            Err(err) => panic!("serialize profile: {err}"),
        };

        let Some(profile_obj) = profile_json.as_object() else {
            panic!("profile should serialize as object");
        };
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
