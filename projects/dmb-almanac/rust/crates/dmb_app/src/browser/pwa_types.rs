use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LaunchPayload {
    pub source: String,
    pub route: String,
    #[serde(default)]
    pub label: Option<String>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OpenFileRequest {
    pub name: String,
    #[serde(default)]
    pub mime: String,
    pub size_bytes: u64,
    pub content: String,
    pub source: String,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProtocolPayload {
    #[serde(default)]
    pub raw: Option<String>,
    pub route: String,
    #[serde(default)]
    pub query: Option<String>,
    pub status: String,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct IngressDestination {
    pub route: String,
    #[serde(default)]
    pub query: Option<String>,
    pub label: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum IngressSource {
    SearchQuery(Option<String>),
    Protocol(ProtocolPayload),
    OpenFile(OpenFileRequest),
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct InstallPromptState {
    pub supported: bool,
    pub available: bool,
    pub installed: bool,
    #[serde(default)]
    pub dismissed_at_ms: Option<f64>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PwaCapabilityMatrix {
    pub service_worker: bool,
    pub file_handlers: bool,
    pub protocol_handlers: bool,
    pub share_target: bool,
    pub launch_queue: bool,
    pub install_prompt: bool,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WebgpuRuntimeConfig {
    pub is_apple_silicon: bool,
    pub score_workgroup_size: u32,
    pub power_preference: String,
    #[serde(default)]
    pub worker_threshold_floats: Option<usize>,
    #[serde(default)]
    pub worker_max_floats: Option<usize>,
    #[serde(default)]
    pub low_memory_guard_mb: Option<u32>,
    #[serde(default)]
    pub matrix_cache_max_bytes: Option<u32>,
    #[serde(default)]
    pub result_cache_max_bytes: Option<u32>,
    #[serde(default)]
    pub cache_idle_ms: Option<u32>,
    pub eager_warmup: bool,
    #[serde(default)]
    pub prime_matrix_on_worker_init: bool,
}
