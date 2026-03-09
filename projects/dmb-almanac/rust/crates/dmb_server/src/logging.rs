use std::env;

pub(crate) fn resolve_log_filter() -> String {
    let rust_log = env::var("RUST_LOG")
        .ok()
        .map(|value| value.trim().to_string());
    if let Some(value) = rust_log.filter(|value| !value.is_empty()) {
        return value;
    }
    let dmb_level = env::var("DMB_LOG_LEVEL")
        .ok()
        .map(|value| value.trim().to_string());
    if let Some(value) = dmb_level.filter(|value| !value.is_empty()) {
        return value;
    }
    "info".to_string()
}

pub(crate) fn init_tracing() {
    let log_filter = resolve_log_filter();
    tracing_subscriber::fmt()
        .with_env_filter(log_filter.as_str())
        .init();
    tracing::info!(log_filter = %log_filter, "tracing initialized");
}
