use crate::logging::resolve_log_filter_from_values;

#[test]
fn resolve_log_filter_prefers_rust_log() {
    let value = resolve_log_filter_from_values(Some("debug,dmb_server=trace"), Some("warn"));
    assert_eq!(value, "debug,dmb_server=trace");
}

#[test]
fn resolve_log_filter_falls_back_to_dmb_log_level() {
    let value = resolve_log_filter_from_values(None, Some("debug"));
    assert_eq!(value, "debug");
}

#[test]
fn resolve_log_filter_defaults_to_info() {
    let value = resolve_log_filter_from_values(None, None);
    assert_eq!(value, "info");
}
