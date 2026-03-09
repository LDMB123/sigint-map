use super::*;

#[test]
fn resolve_log_filter_prefers_rust_log() {
    let _guard = env_lock_guard();
    let original_rust_log = std::env::var("RUST_LOG").ok();
    let original_dmb_log_level = std::env::var("DMB_LOG_LEVEL").ok();
    std::env::set_var("RUST_LOG", "debug,dmb_server=trace");
    std::env::set_var("DMB_LOG_LEVEL", "warn");
    let value = resolve_log_filter();
    assert_eq!(value, "debug,dmb_server=trace");
    if let Some(value) = original_rust_log {
        std::env::set_var("RUST_LOG", value);
    } else {
        std::env::remove_var("RUST_LOG");
    }
    if let Some(value) = original_dmb_log_level {
        std::env::set_var("DMB_LOG_LEVEL", value);
    } else {
        std::env::remove_var("DMB_LOG_LEVEL");
    }
}

#[test]
fn resolve_log_filter_falls_back_to_dmb_log_level() {
    let _guard = env_lock_guard();
    let original_rust_log = std::env::var("RUST_LOG").ok();
    let original_dmb_log_level = std::env::var("DMB_LOG_LEVEL").ok();
    std::env::remove_var("RUST_LOG");
    std::env::set_var("DMB_LOG_LEVEL", "debug");
    let value = resolve_log_filter();
    assert_eq!(value, "debug");
    if let Some(value) = original_rust_log {
        std::env::set_var("RUST_LOG", value);
    } else {
        std::env::remove_var("RUST_LOG");
    }
    if let Some(value) = original_dmb_log_level {
        std::env::set_var("DMB_LOG_LEVEL", value);
    } else {
        std::env::remove_var("DMB_LOG_LEVEL");
    }
}

#[test]
fn resolve_log_filter_defaults_to_info() {
    let _guard = env_lock_guard();
    let original_rust_log = std::env::var("RUST_LOG").ok();
    let original_dmb_log_level = std::env::var("DMB_LOG_LEVEL").ok();
    std::env::remove_var("RUST_LOG");
    std::env::remove_var("DMB_LOG_LEVEL");
    let value = resolve_log_filter();
    assert_eq!(value, "info");
    if let Some(value) = original_rust_log {
        std::env::set_var("RUST_LOG", value);
    } else {
        std::env::remove_var("RUST_LOG");
    }
    if let Some(value) = original_dmb_log_level {
        std::env::set_var("DMB_LOG_LEVEL", value);
    } else {
        std::env::remove_var("DMB_LOG_LEVEL");
    }
}
