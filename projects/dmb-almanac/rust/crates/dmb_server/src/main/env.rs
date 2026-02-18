use std::env;
use std::net::SocketAddr;
use std::path::{Path, PathBuf};

use axum::http::{HeaderName, HeaderValue};
use axum::Router;
use leptos_config::LeptosOptions;
use tower_http::set_header::SetResponseHeaderLayer;

pub(super) fn bind_addr_from_env(default: SocketAddr) -> SocketAddr {
    // This is intentionally separate from LeptosOptions so CI and staging environments
    // can control bind behavior (port collisions, container runtimes, etc.) without
    // changing app config files.
    if let Ok(raw) = env::var("DMB_SITE_ADDR") {
        match raw.parse::<SocketAddr>() {
            Ok(addr) => return addr,
            Err(err) => {
                tracing::warn!(value = %raw, error = ?err, "invalid DMB_SITE_ADDR; falling back to default");
            }
        }
    }

    // Common hosting convention: PORT. Keep the default IP, only override port.
    if let Ok(raw) = env::var("PORT").or_else(|_| env::var("DMB_PORT")) {
        match raw.parse::<u16>() {
            Ok(port) => return SocketAddr::from((default.ip(), port)),
            Err(err) => {
                tracing::warn!(value = %raw, error = ?err, "invalid PORT/DMB_PORT; falling back to default");
            }
        }
    }

    default
}

pub(super) fn missing_required_static_assets_from_cwd(
    leptos: &LeptosOptions,
    cwd: &Path,
) -> Vec<PathBuf> {
    let pkg_dir = cwd
        .join(leptos.site_root.as_ref())
        .join(leptos.site_pkg_dir.as_ref());
    ["dmb_app.js", "dmb_app_bg.wasm"]
        .into_iter()
        .map(|file| pkg_dir.join(file))
        .filter(|path| !path.exists())
        .collect()
}

pub(super) fn missing_required_static_assets(leptos: &LeptosOptions) -> Vec<PathBuf> {
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    missing_required_static_assets_from_cwd(leptos, &cwd)
}

pub(super) fn resolve_log_filter() -> String {
    fn non_empty_env(name: &str) -> Option<String> {
        env::var(name)
            .ok()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
    }

    non_empty_env("RUST_LOG")
        .or_else(|| non_empty_env("DMB_LOG_LEVEL"))
        .unwrap_or_else(|| "info".to_string())
}

pub(super) fn coop_coep_enabled() -> bool {
    match std::env::var("DMB_COOP_COEP") {
        Ok(value) => value != "0" && value.to_lowercase() != "false",
        Err(_) => true,
    }
}

pub(super) fn apply_coop_headers(app: Router, enabled: bool) -> Router {
    if enabled {
        app.layer(SetResponseHeaderLayer::if_not_present(
            HeaderName::from_static("cross-origin-opener-policy"),
            HeaderValue::from_static("same-origin"),
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            HeaderName::from_static("cross-origin-embedder-policy"),
            HeaderValue::from_static("require-corp"),
        ))
    } else {
        app
    }
}
