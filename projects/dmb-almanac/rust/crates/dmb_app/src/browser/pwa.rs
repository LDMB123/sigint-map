const STAGED_OPEN_FILE_KEY: &str = "pwa_open_file_request_v1";
pub const INSTALL_DISMISSED_AT_KEY: &str = "pwa_install_dismissed_at";

#[path = "pwa_ingress.rs"]
mod ingress;
#[path = "pwa_platform.rs"]
mod platform;
#[path = "pwa_types.rs"]
mod types;

#[cfg(test)]
use ingress::normalized_app_route;
pub(crate) use ingress::normalized_item_route;
pub use ingress::{
    build_search_location, current_search_destination, current_search_query_seed,
    describe_open_file_request, open_file_destination, parse_protocol_payload,
    protocol_destination, resolve_ingress_destination,
};
pub use platform::{
    capability_matrix, clear_staged_open_file_request, dismiss_install_prompt_now,
    initialize_runtime, install_prompt_available, install_prompt_installed, install_prompt_state,
    install_prompt_supported, prompt_install, read_import_file_from_event,
    register_install_prompt_callbacks, stage_open_file_request, staged_open_file_request,
    take_pending_launch_file,
};
pub use types::{
    IngressDestination, IngressSource, InstallPromptState, LaunchPayload, OpenFileRequest,
    ProtocolPayload, PwaCapabilityMatrix, WebgpuRuntimeConfig,
};

#[cfg(test)]
#[path = "pwa_tests.rs"]
mod tests;
