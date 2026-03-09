use std::env;
use std::net::SocketAddr;
use std::path::{Path, PathBuf};

use leptos_config::LeptosOptions;
use sqlx::SqlitePool;

pub(crate) const MISSING_STATIC_ASSETS_HELP: &str = "required static assets missing; run `cargo run -p xtask -- build-hydrate-pkg` from rust/ and start dmb_server from rust/ so static/pkg resolves";

#[cfg(test)]
pub(crate) fn default_sqlite_candidates() -> &'static [&'static str] {
    crate::startup_sqlite::default_sqlite_candidates()
}

pub(crate) fn bind_addr_from_env(default: SocketAddr) -> SocketAddr {
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

pub(crate) fn missing_required_static_assets_from_cwd(
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

pub(crate) fn missing_required_static_assets(leptos: &LeptosOptions) -> Vec<PathBuf> {
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    missing_required_static_assets_from_cwd(leptos, &cwd)
}

pub(crate) async fn init_db_pool() -> Option<SqlitePool> {
    crate::startup_sqlite::init_db_pool().await
}
