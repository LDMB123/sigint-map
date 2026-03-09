use super::state::*;
use super::*;

macro_rules! hydrate_action {
    ($state:ident, $body:block) => {{
        #[cfg(feature = "hydrate")]
        $body
        #[cfg(not(feature = "hydrate"))]
        {
            let _ = $state;
        }
    }};
}

#[path = "pages_ai_diagnostics_actions_bench.rs"]
mod bench;
#[path = "pages_ai_diagnostics_actions_parity.rs"]
mod parity;
#[path = "pages_ai_diagnostics_actions_runtime.rs"]
mod runtime;

pub(crate) use bench::{
    action_cancel_benchmark, action_load_ann_caps, action_run_benchmark, action_run_tuning,
    action_run_worker_benchmark,
};
pub(crate) use parity::action_run_parity_refresh;
#[cfg(feature = "ai_diagnostics_full")]
pub(crate) use parity::initialize_ai_diagnostics_state;
pub(crate) use runtime::{
    action_apply_ann_cap_override, action_apply_worker_threshold, action_clear_ann_cap_override,
    action_clear_worker_cooldown, action_clear_worker_threshold, action_export_diagnostics,
    action_refresh_ai_config, action_refresh_runtime_metrics, action_reset_runtime_metrics,
    action_toggle_embedding_sample, action_toggle_webgpu,
};
