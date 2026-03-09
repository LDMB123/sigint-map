use super::*;

#[path = "ai_embedding_fetch.rs"]
mod fetch;
#[path = "ai_embedding_load.rs"]
mod load;
#[path = "ai_embedding_meta.rs"]
mod meta;
#[path = "ai_embedding_policy.rs"]
mod policy;

pub(crate) use fetch::webgpu_probe_ok;
#[cfg(feature = "hydrate")]
use meta::fetch_json;
pub use meta::load_ai_telemetry_snapshot;
#[cfg(feature = "hydrate")]
pub(crate) use meta::store_ai_telemetry_snapshot;
#[cfg(feature = "hydrate")]
pub use meta::{
    AiConfigMeta, AiConfigMetaReconcile, ai_config_mismatch_status_message,
    ai_config_remote_meta_label, fetch_ai_config_meta, fetch_and_reconcile_ai_config_meta,
    load_ai_tuning, load_ann_meta, load_embedding_manifest_meta, reconcile_ai_config_meta,
    sync_ai_config_meta,
};
#[cfg(test)]
pub(crate) use policy::CapPolicy;
#[cfg(any(feature = "hydrate", test))]
pub(crate) use policy::cap_embedding_index_with_policy;
pub(crate) use policy::cap_policy_from_navigator;
pub(crate) use policy::webgpu_matrix_allowed;
#[cfg(any(feature = "hydrate", test))]
use policy::{ivf_cap_bytes_for_matrix, max_vectors_for_cap_bytes};

#[cfg(feature = "hydrate")]
static EMBEDDING_INDEX: OnceCell<Arc<EmbeddingIndex>> = OnceCell::new();

#[cfg(feature = "hydrate")]
static ANN_CAP_DIAGNOSTICS: OnceCell<AnnCapDiagnostics> = OnceCell::new();

#[cfg(feature = "hydrate")]
static WEBGPU_PROBE_CACHE: OnceCell<bool> = OnceCell::new();

#[must_use]
pub fn ann_cap_diagnostics() -> Option<AnnCapDiagnostics> {
    #[cfg(feature = "hydrate")]
    {
        ANN_CAP_DIAGNOSTICS.get().cloned()
    }
    #[cfg(not(feature = "hydrate"))]
    {
        None
    }
}
pub use load::load_embedding_index;
