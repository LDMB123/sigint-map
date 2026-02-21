use std::net::SocketAddr;
use std::path::{Path, PathBuf};

use axum::{
    body::Body,
    http::{header, HeaderName, HeaderValue, Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use dmb_core::{is_supported_sqlite_parity_table, sqlite_parity_tables};
use leptos::context::provide_context;
use leptos_axum::{generate_route_list, LeptosRoutes};
use leptos_config::LeptosOptions;
use serde::Serialize;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::collections::{HashMap, HashSet};
use std::env;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tower_http::{
    compression::CompressionLayer,
    request_id::{MakeRequestUuid, PropagateRequestIdLayer, RequestId, SetRequestIdLayer},
    set_header::SetResponseHeaderLayer,
    trace::TraceLayer,
};

async fn cache_control_middleware(req: Request<Body>, next: Next) -> Response {
    let path = req.uri().path();
    let is_no_cache = path == "/sw.js"
        || path.starts_with("/pkg/")
        || path == "/app.css"
        || path == "/webgpu.js"
        || path == "/webgpu-worker.js"
        || path.starts_with("/data/")
        || path == "/manifest.json";
    let accepts_html = req
        .headers()
        .get(header::ACCEPT)
        .and_then(|v| v.to_str().ok())
        .is_some_and(|value| value.contains("text/html"));

    let mut res = next.run(req).await;

    if is_no_cache {
        res.headers_mut()
            .insert(header::CACHE_CONTROL, HeaderValue::from_static("no-cache"));
    } else if accepts_html {
        res.headers_mut()
            .insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
        res.headers_mut()
            .insert(header::VARY, HeaderValue::from_static("Accept"));
    }

    res
}

#[derive(Clone)]
struct AppState {
    leptos: LeptosOptions,
    db: Option<SqlitePool>,
    data_parity_cache: Arc<tokio::sync::RwLock<Option<DataParityCacheEntry>>>,
}

const DATA_PARITY_CACHE_TTL: Duration = Duration::from_secs(10);
const SQLITE_POOL_MAX_CONNECTIONS: u32 = 8;
const SQLITE_POOL_MIN_CONNECTIONS: u32 = 1;
const SQLITE_POOL_ACQUIRE_TIMEOUT: Duration = Duration::from_secs(5);
const SQLITE_POOL_IDLE_TIMEOUT: Duration = Duration::from_secs(600);
const SQLITE_POOL_MAX_LIFETIME: Duration = Duration::from_secs(1800);
const SQLITE_BUSY_TIMEOUT: Duration = Duration::from_secs(5);
const DEFAULT_SQLITE_CANDIDATES: &[&str] = &[
    "data/dmb-almanac.db",
    "../data/dmb-almanac.db",
    "../../data/dmb-almanac.db",
];

#[derive(Clone)]
struct DataParityCacheEntry {
    generated_at: Instant,
    response: DataParityResponse,
}

fn new_data_parity_cache() -> Arc<tokio::sync::RwLock<Option<DataParityCacheEntry>>> {
    Arc::new(tokio::sync::RwLock::new(None))
}

fn default_sqlite_candidates() -> &'static [&'static str] {
    DEFAULT_SQLITE_CANDIDATES
}

impl axum::extract::FromRef<AppState> for LeptosOptions {
    fn from_ref(state: &AppState) -> Self {
        state.leptos.clone()
    }
}

async fn fetch_table_count(pool: &SqlitePool, table: &str) -> Option<u64> {
    if !is_supported_sqlite_parity_table(table) {
        tracing::warn!(table, "unsupported sqlite table requested for parity count");
        return None;
    }

    let query = format!("SELECT COUNT(*) FROM {table}");
    match sqlx::query_scalar::<_, i64>(&query).fetch_one(pool).await {
        Ok(value) => Some(value.max(0) as u64),
        Err(err) => {
            tracing::warn!(table, error = ?err, "failed to count sqlite table");
            None
        }
    }
}

async fn fetch_existing_tables(pool: &SqlitePool) -> HashSet<String> {
    match sqlx::query_scalar::<_, String>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    )
    .fetch_all(pool)
    .await
    {
        Ok(rows) => rows.into_iter().collect(),
        Err(err) => {
            tracing::warn!(error = ?err, "failed to enumerate sqlite tables");
            HashSet::new()
        }
    }
}

async fn fetch_all_table_counts(pool: &SqlitePool) -> Option<HashMap<String, u64>> {
    let tables: Vec<&str> = sqlite_parity_tables().collect();
    fetch_selected_table_counts(pool, &tables).await
}

fn build_table_counts_query(tables: &[&str]) -> Option<String> {
    if tables.is_empty() {
        return None;
    }

    let mut query = String::new();
    for (index, table) in tables.iter().enumerate() {
        if index > 0 {
            query.push_str("\nUNION ALL ");
        }
        query.push_str("SELECT '");
        query.push_str(table);
        query.push_str("', (SELECT COUNT(*) FROM ");
        query.push_str(table);
        query.push(')');
    }
    Some(query)
}

async fn fetch_selected_table_counts(
    pool: &SqlitePool,
    tables: &[&str],
) -> Option<HashMap<String, u64>> {
    let query = build_table_counts_query(tables)?;
    match sqlx::query_as::<_, (String, i64)>(&query)
        .fetch_all(pool)
        .await
    {
        Ok(rows) => {
            let mut counts = HashMap::with_capacity(rows.len());
            for (table, count) in rows {
                counts.insert(table, count.max(0) as u64);
            }
            Some(counts)
        }
        Err(err) => {
            tracing::warn!(
                error = ?err,
                "failed to fetch sqlite parity counts via selected aggregate query"
            );
            None
        }
    }
}

fn bind_addr_from_env(default: SocketAddr) -> SocketAddr {
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

fn missing_required_static_assets_from_cwd(leptos: &LeptosOptions, cwd: &Path) -> Vec<PathBuf> {
    let pkg_dir = cwd
        .join(leptos.site_root.as_ref())
        .join(leptos.site_pkg_dir.as_ref());
    ["dmb_app.js", "dmb_app_bg.wasm"]
        .into_iter()
        .map(|file| pkg_dir.join(file))
        .filter(|path| !path.exists())
        .collect()
}

fn missing_required_static_assets(leptos: &LeptosOptions) -> Vec<PathBuf> {
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    missing_required_static_assets_from_cwd(leptos, &cwd)
}

fn resolve_log_filter() -> String {
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

#[tokio::main]
async fn main() {
    let log_filter = resolve_log_filter();
    tracing_subscriber::fmt()
        .with_env_filter(log_filter.as_str())
        .init();
    tracing::info!(log_filter = %log_filter, "tracing initialized");

    let leptos = LeptosOptions::builder()
        .output_name("dmb_app")
        .site_root("static")
        .site_pkg_dir("pkg")
        .build();
    let missing_assets = missing_required_static_assets(&leptos);
    if !missing_assets.is_empty() {
        tracing::error!(
            missing_assets = ?missing_assets,
            "required static assets missing; start dmb_server from the rust/ directory so static/pkg is resolvable"
        );
        std::process::exit(1);
    }

    let db = init_db_pool().await;
    let state = AppState {
        leptos: leptos.clone(),
        db: db.clone(),
        data_parity_cache: new_data_parity_cache(),
    };
    let leptos_for_shell = leptos.clone();

    let routes = generate_route_list(dmb_app::App);

    let db_context = std::sync::Arc::new(db);

    let app = Router::new()
        .route("/api/health", get(api_health))
        .route("/api/ai-health", get(api_ai_health))
        .route("/api/data-parity", get(api_data_parity))
        .route("/api/data-parity-summary", get(api_data_parity_summary))
        .route("/sitemap.xml", get(sitemap))
        .route("/sitemap-static.xml", get(sitemap))
        .route("/sitemap-shows.xml", get(sitemap))
        .route("/sitemap-songs.xml", get(sitemap))
        .route("/sitemap-venues.xml", get(sitemap))
        .route("/sitemap-guests.xml", get(sitemap))
        .leptos_routes_with_context(
            &state,
            routes,
            {
                let db_context = db_context.clone();
                move || {
                    if let Some(pool) = db_context.as_ref() {
                        provide_context(pool.clone());
                    }
                }
            },
            move || dmb_app::shell(leptos_for_shell.clone()),
        )
        .fallback(leptos_axum::file_and_error_handler::<AppState, _>(
            dmb_app::shell,
        ))
        .layer(axum::middleware::from_fn(cache_control_middleware))
        .layer(CompressionLayer::new())
        .layer({
            TraceLayer::new_for_http().make_span_with(move |req: &Request<_>| {
                let request_id = req
                    .extensions()
                    .get::<RequestId>()
                    .and_then(|id| id.header_value().to_str().ok())
                    .unwrap_or("-");
                tracing::info_span!(
                    "http",
                    request_id = %request_id,
                    method = %req.method(),
                    uri = %req.uri()
                )
            })
        })
        .layer(PropagateRequestIdLayer::new(HeaderName::from_static(
            "x-request-id",
        )))
        .layer(SetRequestIdLayer::new(
            HeaderName::from_static("x-request-id"),
            MakeRequestUuid,
        ))
        .with_state(state);
    let coop_enabled = coop_coep_enabled();
    let app = apply_baseline_security_headers(app);
    let app = apply_coop_headers(app, coop_enabled);
    if !coop_enabled {
        tracing::warn!(
            "COOP/COEP headers disabled. SharedArrayBuffer, WebGPU worker paths, and wasm threads may be unavailable."
        );
    }

    let addr: SocketAddr = bind_addr_from_env(leptos.site_addr);
    tracing::info!("listening on http://{addr}");

    let listener = match tokio::net::TcpListener::bind(addr).await {
        Ok(listener) => listener,
        Err(err) => {
            tracing::error!(error = ?err, "failed to bind listener");
            return;
        }
    };

    if let Err(err) = axum::serve(listener, app.into_make_service()).await {
        tracing::error!(error = ?err, "server failed");
    }
}

fn coop_coep_enabled() -> bool {
    match std::env::var("DMB_COOP_COEP") {
        Ok(value) => value != "0" && value.to_lowercase() != "false",
        Err(_) => true,
    }
}

fn apply_baseline_security_headers(app: Router) -> Router {
    app.layer(SetResponseHeaderLayer::if_not_present(
        HeaderName::from_static("x-content-type-options"),
        HeaderValue::from_static("nosniff"),
    ))
    .layer(SetResponseHeaderLayer::if_not_present(
        HeaderName::from_static("x-frame-options"),
        HeaderValue::from_static("DENY"),
    ))
    .layer(SetResponseHeaderLayer::if_not_present(
        HeaderName::from_static("referrer-policy"),
        HeaderValue::from_static("strict-origin-when-cross-origin"),
    ))
    .layer(SetResponseHeaderLayer::if_not_present(
        HeaderName::from_static("permissions-policy"),
        HeaderValue::from_static(
            "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
        ),
    ))
}

fn apply_coop_headers(app: Router, enabled: bool) -> Router {
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

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::to_bytes;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use axum::response::Response;
    use serde_json::Value;
    use sqlx::sqlite::SqlitePoolOptions;
    use std::convert::Infallible;
    use std::fs;
    use std::sync::Mutex;
    use std::time::{SystemTime, UNIX_EPOCH};
    use tower::util::BoxCloneService;
    use tower::ServiceExt;

    static ENV_LOCK: Mutex<()> = Mutex::new(());

    fn with_env_var<T>(key: &str, value: &str, f: impl FnOnce() -> T) -> T {
        let _guard = ENV_LOCK.lock().unwrap();
        let original = std::env::var(key).ok();
        std::env::set_var(key, value);
        let result = f();
        if let Some(value) = original {
            std::env::set_var(key, value);
        } else {
            std::env::remove_var(key);
        }
        result
    }

    async fn parse_json_body(response: Response) -> Value {
        let body = to_bytes(response.into_body(), 2 * 1024 * 1024)
            .await
            .expect("read body");
        serde_json::from_slice(&body).expect("parse json body")
    }

    #[tokio::test]
    async fn coop_headers_enabled() {
        let app = apply_coop_headers(Router::new().route("/health", get(|| async { "ok" })), true);
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .expect("request body"),
            )
            .await
            .expect("response");
        assert_eq!(response.status(), StatusCode::OK);
        let headers = response.headers();
        assert_eq!(
            headers
                .get("cross-origin-opener-policy")
                .and_then(|v| v.to_str().ok()),
            Some("same-origin")
        );
        assert_eq!(
            headers
                .get("cross-origin-embedder-policy")
                .and_then(|v| v.to_str().ok()),
            Some("require-corp")
        );
    }

    #[tokio::test]
    async fn baseline_security_headers_enabled() {
        let app =
            apply_baseline_security_headers(Router::new().route("/health", get(|| async { "ok" })));
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .expect("request body"),
            )
            .await
            .expect("response");
        assert_eq!(response.status(), StatusCode::OK);
        let headers = response.headers();
        assert_eq!(
            headers
                .get("x-content-type-options")
                .and_then(|v| v.to_str().ok()),
            Some("nosniff")
        );
        assert_eq!(
            headers.get("x-frame-options").and_then(|v| v.to_str().ok()),
            Some("DENY")
        );
        assert_eq!(
            headers.get("referrer-policy").and_then(|v| v.to_str().ok()),
            Some("strict-origin-when-cross-origin")
        );
        assert_eq!(
            headers
                .get("permissions-policy")
                .and_then(|v| v.to_str().ok()),
            Some(
                "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
            )
        );
    }

    #[tokio::test]
    async fn coop_headers_disabled() {
        let app = apply_coop_headers(
            Router::new().route("/health", get(|| async { "ok" })),
            false,
        );
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .expect("request body"),
            )
            .await
            .expect("response");
        assert_eq!(response.status(), StatusCode::OK);
        let headers = response.headers();
        assert!(headers.get("cross-origin-opener-policy").is_none());
        assert!(headers.get("cross-origin-embedder-policy").is_none());
    }

    #[test]
    fn coop_coep_env_toggle() {
        with_env_var("DMB_COOP_COEP", "false", || {
            assert!(!coop_coep_enabled());
        });
        with_env_var("DMB_COOP_COEP", "0", || {
            assert!(!coop_coep_enabled());
        });
        with_env_var("DMB_COOP_COEP", "true", || {
            assert!(coop_coep_enabled());
        });
    }

    #[test]
    fn resolve_log_filter_prefers_rust_log() {
        let _guard = ENV_LOCK.lock().unwrap();
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
        let _guard = ENV_LOCK.lock().unwrap();
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
        let _guard = ENV_LOCK.lock().unwrap();
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

    #[test]
    fn build_table_counts_query_empty() {
        assert!(build_table_counts_query(&[]).is_none());
    }

    #[test]
    fn build_table_counts_query_subset() {
        let query =
            build_table_counts_query(&["songs", "shows"]).expect("expected generated query");
        assert!(query.contains("SELECT 'songs', (SELECT COUNT(*) FROM songs)"));
        assert!(query.contains("UNION ALL SELECT 'shows', (SELECT COUNT(*) FROM shows)"));
    }

    #[test]
    fn default_sqlite_candidates_include_common_workspace_layouts() {
        assert_eq!(
            default_sqlite_candidates(),
            &[
                "data/dmb-almanac.db",
                "../data/dmb-almanac.db",
                "../../data/dmb-almanac.db",
            ]
        );
    }

    fn unique_temp_dir(prefix: &str) -> std::path::PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("unix epoch")
            .as_nanos();
        let dir = std::env::temp_dir().join(format!(
            "dmb_server_{prefix}_{}_{}",
            std::process::id(),
            nanos
        ));
        fs::create_dir_all(&dir).expect("create temp dir");
        dir
    }

    #[test]
    fn static_asset_guard_reports_missing_files() {
        let cwd = unique_temp_dir("missing_assets");
        let leptos = LeptosOptions::builder()
            .output_name("dmb_app")
            .site_root("static")
            .site_pkg_dir("pkg")
            .build();
        let missing = missing_required_static_assets_from_cwd(&leptos, &cwd);
        let missing_paths: Vec<String> = missing
            .iter()
            .map(|path| path.to_string_lossy().into_owned())
            .collect();
        assert!(
            missing_paths
                .iter()
                .any(|path| path.ends_with("static/pkg/dmb_app.js")),
            "missing list should include dmb_app.js: {missing_paths:?}"
        );
        assert!(
            missing_paths
                .iter()
                .any(|path| path.ends_with("static/pkg/dmb_app_bg.wasm")),
            "missing list should include dmb_app_bg.wasm: {missing_paths:?}"
        );
        let _ = fs::remove_dir_all(cwd);
    }

    #[test]
    fn static_asset_guard_passes_when_pkg_files_exist() {
        let cwd = unique_temp_dir("present_assets");
        let pkg_dir = cwd.join("static").join("pkg");
        fs::create_dir_all(&pkg_dir).expect("create pkg dir");
        fs::write(pkg_dir.join("dmb_app.js"), b"// test").expect("write dmb_app.js");
        fs::write(pkg_dir.join("dmb_app_bg.wasm"), b"\0asm").expect("write dmb_app_bg.wasm");

        let leptos = LeptosOptions::builder()
            .output_name("dmb_app")
            .site_root("static")
            .site_pkg_dir("pkg")
            .build();
        let missing = missing_required_static_assets_from_cwd(&leptos, &cwd);
        assert!(
            missing.is_empty(),
            "expected no missing assets: {missing:?}"
        );
        let _ = fs::remove_dir_all(cwd);
    }

    #[tokio::test]
    async fn ai_health_endpoint_smoke() {
        let leptos = LeptosOptions::builder()
            .output_name("dmb_app")
            .site_root("static")
            .site_pkg_dir("pkg")
            .build();
        let state = AppState {
            leptos,
            db: None,
            data_parity_cache: new_data_parity_cache(),
        };
        let app = Router::new()
            .route("/api/ai-health", get(api_ai_health))
            .with_state(state);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/ai-health")
                    .body(Body::empty())
                    .expect("request body"),
            )
            .await
            .expect("response");
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn data_parity_unavailable_without_sqlite_pool() {
        let leptos = LeptosOptions::builder()
            .output_name("dmb_app")
            .site_root("static")
            .site_pkg_dir("pkg")
            .build();
        let state = AppState {
            leptos,
            db: None,
            data_parity_cache: new_data_parity_cache(),
        };
        let app = Router::new()
            .route("/api/data-parity", get(api_data_parity))
            .with_state(state);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/data-parity")
                    .body(Body::empty())
                    .expect("request body"),
            )
            .await
            .expect("response");
        assert_eq!(response.status(), StatusCode::OK);

        let payload = parse_json_body(response).await;
        assert_eq!(
            payload.get("available").and_then(Value::as_bool),
            Some(false)
        );
        assert_eq!(
            payload
                .get("counts")
                .and_then(Value::as_object)
                .map(serde_json::Map::len),
            Some(0)
        );
        assert_eq!(
            payload
                .get("missingTables")
                .and_then(Value::as_array)
                .map(Vec::len),
            Some(0)
        );
    }

    #[tokio::test]
    async fn data_parity_summary_unavailable_without_sqlite_pool() {
        let leptos = LeptosOptions::builder()
            .output_name("dmb_app")
            .site_root("static")
            .site_pkg_dir("pkg")
            .build();
        let state = AppState {
            leptos,
            db: None,
            data_parity_cache: new_data_parity_cache(),
        };
        let app = Router::new()
            .route("/api/data-parity-summary", get(api_data_parity_summary))
            .with_state(state);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/data-parity-summary")
                    .body(Body::empty())
                    .expect("request body"),
            )
            .await
            .expect("response");
        assert_eq!(response.status(), StatusCode::OK);

        let payload = parse_json_body(response).await;
        assert_eq!(
            payload.get("available").and_then(Value::as_bool),
            Some(false)
        );
        assert_eq!(
            payload.get("sqliteTablesPresent").and_then(Value::as_u64),
            Some(0)
        );
        assert!(
            payload
                .get("sqliteTablesExpected")
                .and_then(Value::as_u64)
                .is_some(),
            "expected sqliteTablesExpected in summary payload"
        );
    }

    #[tokio::test]
    async fn data_parity_summary_unavailable_from_cached_parity_response() {
        let leptos = LeptosOptions::builder()
            .output_name("dmb_app")
            .site_root("static")
            .site_pkg_dir("pkg")
            .build();
        let state = AppState {
            leptos,
            db: None,
            data_parity_cache: new_data_parity_cache(),
        };
        let app = Router::new()
            .route("/api/data-parity", get(api_data_parity))
            .route("/api/data-parity-summary", get(api_data_parity_summary))
            .with_state(state);

        let parity_response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/api/data-parity")
                    .body(Body::empty())
                    .expect("request body"),
            )
            .await
            .expect("parity response");
        assert_eq!(parity_response.status(), StatusCode::OK);

        let summary_response = app
            .oneshot(
                Request::builder()
                    .uri("/api/data-parity-summary")
                    .body(Body::empty())
                    .expect("request body"),
            )
            .await
            .expect("summary response");
        assert_eq!(summary_response.status(), StatusCode::OK);

        let payload = parse_json_body(summary_response).await;
        assert_eq!(
            payload.get("available").and_then(Value::as_bool),
            Some(false)
        );
        assert_eq!(
            payload.get("sqliteTablesPresent").and_then(Value::as_u64),
            Some(0)
        );
    }

    #[tokio::test]
    async fn data_parity_reports_counts_and_missing_tables_for_partial_schema() {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("sqlite pool");
        sqlx::query("CREATE TABLE songs (id INTEGER PRIMARY KEY)")
            .execute(&pool)
            .await
            .expect("create songs");
        sqlx::query("INSERT INTO songs (id) VALUES (1), (2)")
            .execute(&pool)
            .await
            .expect("insert songs");

        let leptos = LeptosOptions::builder()
            .output_name("dmb_app")
            .site_root("static")
            .site_pkg_dir("pkg")
            .build();
        let state = AppState {
            leptos,
            db: Some(pool),
            data_parity_cache: new_data_parity_cache(),
        };
        let app = Router::new()
            .route("/api/data-parity", get(api_data_parity))
            .with_state(state);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/data-parity")
                    .body(Body::empty())
                    .expect("request body"),
            )
            .await
            .expect("response");
        assert_eq!(response.status(), StatusCode::OK);

        let payload = parse_json_body(response).await;
        assert_eq!(
            payload.get("available").and_then(Value::as_bool),
            Some(true)
        );
        assert_eq!(
            payload
                .get("counts")
                .and_then(Value::as_object)
                .and_then(|counts| counts.get("songs"))
                .and_then(Value::as_u64),
            Some(2)
        );
        let missing_tables = payload
            .get("missingTables")
            .and_then(Value::as_array)
            .expect("missingTables array");
        let missing: Vec<&str> = missing_tables.iter().filter_map(Value::as_str).collect();
        assert!(missing.contains(&"shows"));
        assert!(missing.contains(&"venues"));
    }

    #[tokio::test]
    async fn data_parity_summary_reports_missing_tables_for_partial_schema() {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("sqlite pool");
        sqlx::query("CREATE TABLE songs (id INTEGER PRIMARY KEY)")
            .execute(&pool)
            .await
            .expect("create songs");

        let leptos = LeptosOptions::builder()
            .output_name("dmb_app")
            .site_root("static")
            .site_pkg_dir("pkg")
            .build();
        let state = AppState {
            leptos,
            db: Some(pool),
            data_parity_cache: new_data_parity_cache(),
        };
        let app = Router::new()
            .route("/api/data-parity-summary", get(api_data_parity_summary))
            .with_state(state);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/data-parity-summary")
                    .body(Body::empty())
                    .expect("request body"),
            )
            .await
            .expect("response");
        assert_eq!(response.status(), StatusCode::OK);

        let payload = parse_json_body(response).await;
        assert_eq!(
            payload.get("available").and_then(Value::as_bool),
            Some(true)
        );
        assert_eq!(
            payload.get("sqliteTablesPresent").and_then(Value::as_u64),
            Some(1)
        );
        let expected = payload
            .get("sqliteTablesExpected")
            .and_then(Value::as_u64)
            .expect("sqliteTablesExpected");
        assert!(expected > 1, "expected more than one parity table");

        let missing_tables = payload
            .get("missingTables")
            .and_then(Value::as_array)
            .expect("missingTables array");
        let missing: Vec<&str> = missing_tables.iter().filter_map(Value::as_str).collect();
        assert!(missing.contains(&"shows"));
        assert!(missing.contains(&"venues"));
    }

    #[tokio::test]
    async fn request_id_is_propagated() {
        let leptos = LeptosOptions::builder()
            .output_name("dmb_app")
            .site_root("static")
            .site_pkg_dir("pkg")
            .build();
        let state = AppState {
            leptos,
            db: None,
            data_parity_cache: new_data_parity_cache(),
        };

        let app = Router::new()
            .route("/api/health", get(api_health))
            .layer(PropagateRequestIdLayer::new(HeaderName::from_static(
                "x-request-id",
            )))
            .layer(SetRequestIdLayer::new(
                HeaderName::from_static("x-request-id"),
                MakeRequestUuid,
            ))
            .with_state(state);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/health")
                    .body(Body::empty())
                    .expect("request body"),
            )
            .await
            .expect("response");
        assert_eq!(response.status(), StatusCode::OK);
        assert!(
            response.headers().get("x-request-id").is_some(),
            "missing x-request-id"
        );
    }

    #[tokio::test]
    async fn data_parity_ignores_stale_cache_entries() {
        let leptos = LeptosOptions::builder()
            .output_name("dmb_app")
            .site_root("static")
            .site_pkg_dir("pkg")
            .build();
        let state = AppState {
            leptos,
            db: None,
            data_parity_cache: new_data_parity_cache(),
        };
        {
            let mut cache = state.data_parity_cache.write().await;
            *cache = Some(DataParityCacheEntry {
                generated_at: std::time::Instant::now()
                    .checked_sub(DATA_PARITY_CACHE_TTL + std::time::Duration::from_secs(1))
                    .expect("stale cache instant"),
                response: DataParityResponse {
                    available: true,
                    counts: [("songs".to_string(), 42_u64)].into_iter().collect(),
                    missing_tables: vec!["shows".to_string()],
                },
            });
        }

        let app = Router::new()
            .route("/api/data-parity", get(api_data_parity))
            .with_state(state);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/data-parity")
                    .body(Body::empty())
                    .expect("request body"),
            )
            .await
            .expect("response");
        assert_eq!(response.status(), StatusCode::OK);

        let payload = parse_json_body(response).await;
        assert_eq!(
            payload.get("available").and_then(Value::as_bool),
            Some(false)
        );
        assert_eq!(
            payload
                .get("counts")
                .and_then(Value::as_object)
                .map(serde_json::Map::len),
            Some(0)
        );
    }

    fn build_test_ssr_app() -> BoxCloneService<Request<Body>, Response, Infallible> {
        let leptos = LeptosOptions::builder()
            .output_name("dmb_app")
            .site_root("static")
            .site_pkg_dir("pkg")
            .build();
        let leptos_for_shell = leptos.clone();
        let state = AppState {
            leptos: leptos.clone(),
            db: None,
            data_parity_cache: new_data_parity_cache(),
        };
        let routes = generate_route_list(dmb_app::App);
        Router::new()
            .leptos_routes_with_context(
                &state,
                routes,
                || {},
                move || dmb_app::shell(leptos_for_shell.clone()),
            )
            .fallback(leptos_axum::file_and_error_handler::<AppState, _>(
                dmb_app::shell,
            ))
            .with_state(state)
            .boxed_clone()
    }

    #[tokio::test]
    async fn ssr_renders_core_pages() {
        let app = build_test_ssr_app();

        for path in ["/", "/search", "/ai-diagnostics"] {
            let response = app
                .clone()
                .oneshot(
                    Request::builder()
                        .uri(path)
                        .body(Body::empty())
                        .expect("request body"),
                )
                .await
                .expect("response");
            assert_eq!(response.status(), StatusCode::OK, "path {path}");

            let body = to_bytes(response.into_body(), 2 * 1024 * 1024)
                .await
                .expect("read body");
            let text = String::from_utf8_lossy(&body);
            assert!(
                text.contains("Skip to content"),
                "missing app shell for {path}"
            );
            if path == "/search" {
                assert!(text.contains("Search"), "missing search content");
            }
            if path == "/ai-diagnostics" {
                assert!(
                    text.contains("AI Diagnostics"),
                    "missing ai diagnostics content"
                );
            }
        }
    }
}

async fn init_db_pool() -> Option<SqlitePool> {
    async fn connect_sqlite(path: &str) -> Result<SqlitePool, sqlx::Error> {
        let options = SqliteConnectOptions::new()
            .filename(path)
            .read_only(true)
            .busy_timeout(SQLITE_BUSY_TIMEOUT)
            .pragma("query_only", "ON")
            .pragma("temp_store", "MEMORY")
            .pragma("cache_size", "-20000");

        SqlitePoolOptions::new()
            .max_connections(SQLITE_POOL_MAX_CONNECTIONS)
            .min_connections(SQLITE_POOL_MIN_CONNECTIONS)
            .acquire_timeout(SQLITE_POOL_ACQUIRE_TIMEOUT)
            .idle_timeout(Some(SQLITE_POOL_IDLE_TIMEOUT))
            .max_lifetime(Some(SQLITE_POOL_MAX_LIFETIME))
            .connect_with(options)
            .await
    }

    if let Ok(path) = std::env::var("DMB_SQLITE_PATH") {
        let path = path.trim();
        if !path.is_empty() {
            if std::path::Path::new(path).exists() {
                match connect_sqlite(path).await {
                    Ok(pool) => {
                        tracing::info!("connected to sqlite at {} (DMB_SQLITE_PATH)", path);
                        return Some(pool);
                    }
                    Err(err) => {
                        tracing::warn!("failed to open sqlite {} (DMB_SQLITE_PATH): {}", path, err);
                    }
                }
            } else {
                tracing::warn!(
                    "sqlite database not found at {} (DMB_SQLITE_PATH); falling back",
                    path
                );
            }
        }
    }

    for path in default_sqlite_candidates() {
        if !std::path::Path::new(path).exists() {
            continue;
        }
        match connect_sqlite(path).await {
            Ok(pool) => {
                tracing::info!("connected to sqlite at {}", path);
                return Some(pool);
            }
            Err(err) => {
                tracing::warn!("failed to open sqlite {}: {}", path, err);
            }
        }
    }
    tracing::warn!("sqlite database not found; SSR data will be limited");
    None
}

async fn api_data_parity(
    axum::extract::State(state): axum::extract::State<AppState>,
) -> impl IntoResponse {
    if let Some(cache_entry) = state.data_parity_cache.read().await.as_ref().cloned() {
        if cache_entry.generated_at.elapsed() <= DATA_PARITY_CACHE_TTL {
            return (StatusCode::OK, Json(cache_entry.response));
        }
    }

    let Some(pool) = state.db.as_ref() else {
        let response = DataParityResponse {
            available: false,
            counts: HashMap::new(),
            missing_tables: Vec::new(),
        };
        return (StatusCode::OK, Json(response));
    };
    let existing_tables = fetch_existing_tables(pool).await;
    let mut missing_set = HashSet::new();
    let parity_tables: Vec<&str> = sqlite_parity_tables().collect();
    let mut present_tables = Vec::with_capacity(parity_tables.len());
    for table in &parity_tables {
        if existing_tables.contains(*table) {
            present_tables.push(*table);
        } else {
            missing_set.insert((*table).to_string());
        }
    }

    let mut counts = if present_tables.len() == parity_tables.len() {
        fetch_all_table_counts(pool).await.unwrap_or_default()
    } else {
        fetch_selected_table_counts(pool, &present_tables)
            .await
            .unwrap_or_default()
    };

    if counts.is_empty() && !present_tables.is_empty() {
        for table in present_tables {
            match fetch_table_count(pool, table).await {
                Some(value) => {
                    counts.insert(table.to_string(), value);
                }
                None => {
                    missing_set.insert(table.to_string());
                }
            }
        }
    }

    let mut missing_tables: Vec<String> = missing_set.into_iter().collect();
    missing_tables.sort_unstable();

    let response = DataParityResponse {
        available: true,
        counts,
        missing_tables,
    };
    {
        let mut cache = state.data_parity_cache.write().await;
        *cache = Some(DataParityCacheEntry {
            generated_at: Instant::now(),
            response: response.clone(),
        });
    }
    (StatusCode::OK, Json(response))
}

async fn api_data_parity_summary(
    axum::extract::State(state): axum::extract::State<AppState>,
) -> impl IntoResponse {
    let expected = sqlite_parity_tables().count();

    if let Some(cache_entry) = state.data_parity_cache.read().await.as_ref().cloned() {
        if cache_entry.generated_at.elapsed() <= DATA_PARITY_CACHE_TTL {
            let missing_tables = cache_entry.response.missing_tables;
            let present = if cache_entry.response.available {
                expected.saturating_sub(missing_tables.len())
            } else {
                0
            };
            let response = DataParitySummaryResponse {
                available: cache_entry.response.available,
                sqlite_tables_present: present,
                sqlite_tables_expected: expected,
                missing_tables,
            };
            return (StatusCode::OK, Json(response));
        }
    }

    let Some(pool) = state.db.as_ref() else {
        let response = DataParitySummaryResponse {
            available: false,
            sqlite_tables_present: 0,
            sqlite_tables_expected: expected,
            missing_tables: Vec::new(),
        };
        return (StatusCode::OK, Json(response));
    };

    let existing_tables = fetch_existing_tables(pool).await;
    let mut missing_tables = Vec::new();
    let mut present = 0usize;
    for table in sqlite_parity_tables() {
        if existing_tables.contains(table) {
            present += 1;
        } else {
            missing_tables.push(table.to_string());
        }
    }
    missing_tables.sort_unstable();

    let response = DataParitySummaryResponse {
        available: true,
        sqlite_tables_present: present,
        sqlite_tables_expected: expected,
        missing_tables,
    };
    (StatusCode::OK, Json(response))
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    version: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AiHealthResponse {
    status: &'static str,
    version: &'static str,
    coop_coep_enabled: bool,
    sqlite_available: bool,
    static_manifest_present: bool,
    static_ai_config_present: bool,
    static_idb_migration_present: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DataParityResponse {
    available: bool,
    counts: HashMap<String, u64>,
    missing_tables: Vec<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DataParitySummaryResponse {
    available: bool,
    sqlite_tables_present: usize,
    sqlite_tables_expected: usize,
    missing_tables: Vec<String>,
}

async fn api_health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        version: dmb_core::CORE_SCHEMA_VERSION,
    })
}

async fn api_ai_health(
    axum::extract::State(state): axum::extract::State<AppState>,
) -> Json<AiHealthResponse> {
    let coop = coop_coep_enabled();

    // Compute presence of key static data artifacts without leaking filesystem paths.
    let (manifest_present, ai_config_present, migration_present) = {
        let cwd = std::env::current_dir().ok();
        let site_root = state.leptos.site_root.clone();
        let static_data = cwd.map(|cwd| cwd.join(site_root.as_ref()).join("data"));
        let manifest = static_data
            .as_ref()
            .is_some_and(|dir| dir.join("manifest.json").exists());
        let ai_config = static_data
            .as_ref()
            .is_some_and(|dir| dir.join("ai-config.json").exists());
        let migration = static_data
            .as_ref()
            .is_some_and(|dir| dir.join("idb-migration-dry-run.json").exists());
        (manifest, ai_config, migration)
    };

    Json(AiHealthResponse {
        status: "ok",
        version: dmb_core::CORE_SCHEMA_VERSION,
        coop_coep_enabled: coop,
        sqlite_available: state.db.is_some(),
        static_manifest_present: manifest_present,
        static_ai_config_present: ai_config_present,
        static_idb_migration_present: migration_present,
    })
}

async fn sitemap() -> impl IntoResponse {
    let body = r#"<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">
  <url><loc>/</loc></url>
</urlset>"#;
    (
        [(
            axum::http::header::CONTENT_TYPE,
            "application/xml; charset=utf-8",
        )],
        body,
    )
}
