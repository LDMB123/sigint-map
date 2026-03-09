use std::collections::HashMap;

#[path = "pipeline_support_json.rs"]
mod json;

pub(crate) fn env_u64_or_warn(name: &str) -> Option<u64> {
    match std::env::var(name) {
        Ok(raw) => match raw.parse::<u64>() {
            Ok(value) => Some(value),
            Err(err) => {
                tracing::warn!(
                    env = name,
                    value = raw,
                    error = %err,
                    "invalid u64 env var; ignoring"
                );
                None
            }
        },
        Err(std::env::VarError::NotUnicode(_)) => {
            tracing::warn!(env = name, "env var is not valid unicode; ignoring");
            None
        }
        Err(std::env::VarError::NotPresent) => None,
    }
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub(crate) struct EmbeddingInput {
    pub(crate) id: i32,
    pub(crate) kind: String,
    pub(crate) text: Option<String>,
    pub(crate) slug: Option<String>,
    pub(crate) label: Option<String>,
    pub(crate) vector: Option<Vec<f32>>,
}

pub(crate) use json::{json_i32_optional, json_i32_or_warn, json_i64_or_warn};

#[derive(Debug)]
pub(crate) struct WarningReport {
    pub(crate) empty: u64,
    pub(crate) missing: u64,
    pub(crate) missing_by_field: HashMap<String, u64>,
    pub(crate) missing_by_context: HashMap<String, u64>,
    pub(crate) empty_by_selector: HashMap<String, u64>,
    pub(crate) empty_by_context: HashMap<String, u64>,
    pub(crate) endpoint_timings_ms: HashMap<String, u64>,
    pub(crate) endpoint_retries: HashMap<String, u64>,
    pub(crate) endpoint_retries_total: u64,
    pub(crate) top_endpoint_retries: Vec<EndpointRetrySummary>,
    pub(crate) warning_events_summary: HashMap<String, u64>,
    pub(crate) signature: Option<String>,
}

#[derive(Debug)]
pub(crate) struct EndpointRetrySummary {
    pub(crate) endpoint: String,
    pub(crate) count: u64,
}
