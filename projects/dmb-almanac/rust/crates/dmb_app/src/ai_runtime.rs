use super::*;

#[path = "ai_runtime_backend.rs"]
mod backend;
#[path = "ai_runtime_config.rs"]
mod config;

#[cfg(feature = "hydrate")]
pub(crate) use backend::{
    WebgpuPolicyBackend, execute_webgpu_backend, webgpu_backend_label,
    webgpu_scores_subset_with_policy, webgpu_scores_with_policy,
};
#[cfg(feature = "hydrate")]
pub(crate) use config::{browser_runtime_supported, warm_webgpu_worker};
pub use config::{detect_ai_capabilities, preload_webgpu_runtime, probe_webgpu_device};
