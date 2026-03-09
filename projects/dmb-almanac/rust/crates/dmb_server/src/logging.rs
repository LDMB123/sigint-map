use std::env;

fn normalized_log_value(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

pub(crate) fn resolve_log_filter_from_values(
    rust_log: Option<&str>,
    dmb_log_level: Option<&str>,
) -> String {
    if let Some(value) = normalized_log_value(rust_log) {
        return value;
    }
    if let Some(value) = normalized_log_value(dmb_log_level) {
        return value;
    }
    "info".to_string()
}

pub(crate) fn resolve_log_filter() -> String {
    resolve_log_filter_from_values(
        env::var("RUST_LOG").ok().as_deref(),
        env::var("DMB_LOG_LEVEL").ok().as_deref(),
    )
}

pub(crate) fn init_tracing() {
    let log_filter = resolve_log_filter();
    tracing_subscriber::fmt()
        .with_env_filter(log_filter.as_str())
        .init();
    tracing::info!(log_filter = %log_filter, "tracing initialized");
}
