use std::net::SocketAddr;

use axum::{
    body::Body,
    http::{header, HeaderName, HeaderValue, Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use leptos::context::provide_context;
use leptos_axum::{generate_route_list, LeptosRoutes};
use leptos_config::LeptosOptions;
use serde::Serialize;
use sqlx::sqlite::SqliteConnectOptions;
use sqlx::SqlitePool;
use std::collections::HashMap;
use std::env;
use tower_http::{
    compression::CompressionLayer,
    request_id::{MakeRequestUuid, PropagateRequestIdLayer, RequestId, SetRequestIdLayer},
    set_header::SetResponseHeaderLayer,
    trace::TraceLayer,
};

async fn cache_control_middleware(req: Request<Body>, next: Next) -> Response {
    let path = req.uri().path().to_string();
    let accepts_html = req
        .headers()
        .get(header::ACCEPT)
        .and_then(|v| v.to_str().ok())
        .map(|value| value.contains("text/html"))
        .unwrap_or(false);

    let mut res = next.run(req).await;

    // Avoid "stale bundle" loops where the browser HTTP cache serves old WASM/JS
    // and hydration fails. We want the SW + CacheStorage to be the primary cache.
    let is_no_cache = path == "/sw.js"
        || path.starts_with("/pkg/")
        || path == "/app.css"
        || path == "/webgpu.js"
        || path == "/webgpu-worker.js"
        || path.starts_with("/data/")
        || path == "/manifest.json";

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
    #[allow(dead_code)]
    db: Option<SqlitePool>,
}

impl axum::extract::FromRef<AppState> for LeptosOptions {
    fn from_ref(state: &AppState) -> Self {
        state.leptos.clone()
    }
}

async fn fetch_table_count(pool: &SqlitePool, table: &str) -> Option<u64> {
    let query = format!("SELECT COUNT(*) FROM {}", table);
    match sqlx::query_scalar::<_, i64>(&query).fetch_one(pool).await {
        Ok(value) => Some(value.max(0) as u64),
        Err(err) => {
            tracing::warn!(table, error = ?err, "failed to count sqlite table");
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

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt().with_env_filter("info").init();

    let leptos = LeptosOptions::builder()
        .output_name("dmb_app")
        .site_root("static")
        .site_pkg_dir("pkg")
        .build();

    let db = init_db_pool().await;
    let state = AppState {
        leptos: leptos.clone(),
        db: db.clone(),
    };
    let leptos_for_shell = leptos.clone();

    let routes = generate_route_list(dmb_app::App);

    let db_context = std::sync::Arc::new(db);

    let app = Router::new()
        .route("/api/health", get(api_health))
        .route("/api/ai-health", get(api_ai_health))
        .route("/api/analytics", post(api_analytics))
        .route("/api/data-parity", get(api_data_parity))
        .route("/api/telemetry/performance", post(api_telemetry))
        .route("/api/telemetry/errors", post(api_telemetry))
        .route("/api/telemetry/performance-metrics", post(api_telemetry))
        .route("/api/telemetry/business", post(api_telemetry))
        .route("/api/csp-report", post(api_csp_report))
        .route("/api/share-target", post(api_share_target))
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
                    if let Some(pool) = db_context.as_ref().clone() {
                        provide_context(pool);
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
    use std::convert::Infallible;
    use std::sync::Mutex;
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

    #[tokio::test]
    async fn ai_health_endpoint_smoke() {
        let leptos = LeptosOptions::builder()
            .output_name("dmb_app")
            .site_root("static")
            .site_pkg_dir("pkg")
            .build();
        let state = AppState { leptos, db: None };
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
    async fn request_id_is_propagated() {
        let leptos = LeptosOptions::builder()
            .output_name("dmb_app")
            .site_root("static")
            .site_pkg_dir("pkg")
            .build();
        let state = AppState { leptos, db: None };

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
            assert_eq!(response.status(), StatusCode::OK, "path {}", path);

            let body = to_bytes(response.into_body(), 2 * 1024 * 1024)
                .await
                .expect("read body");
            let text = String::from_utf8_lossy(&body);
            assert!(
                text.contains("Skip to content"),
                "missing app shell for {}",
                path
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
    if let Ok(path) = std::env::var("DMB_SQLITE_PATH") {
        let path = path.trim();
        if !path.is_empty() {
            if std::path::Path::new(path).exists() {
                let options = SqliteConnectOptions::new().filename(path).read_only(true);
                match SqlitePool::connect_with(options).await {
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

    let candidates = ["data/dmb-almanac.db"];
    for path in candidates {
        if !std::path::Path::new(path).exists() {
            continue;
        }
        let options = SqliteConnectOptions::new().filename(path).read_only(true);
        match SqlitePool::connect_with(options).await {
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
    let Some(pool) = state.db else {
        let response = DataParityResponse {
            available: false,
            counts: HashMap::new(),
            missing_tables: Vec::new(),
        };
        return (StatusCode::OK, Json(response));
    };
    let tables = [
        "venues",
        "songs",
        "tours",
        "shows",
        "setlist_entries",
        "guests",
        "guest_appearances",
        "liberation_list",
        "song_statistics",
        "releases",
        "release_tracks",
        "curated_lists",
        "curated_list_items",
    ];
    let mut counts = HashMap::new();
    let mut missing_tables = Vec::new();
    for table in tables {
        match fetch_table_count(&pool, table).await {
            Some(value) => {
                counts.insert(table.to_string(), value);
            }
            None => missing_tables.push(table.to_string()),
        }
    }
    let response = DataParityResponse {
        available: true,
        counts,
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

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DataParityResponse {
    available: bool,
    counts: HashMap<String, u64>,
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
            .map(|dir| dir.join("manifest.json").exists())
            .unwrap_or(false);
        let ai_config = static_data
            .as_ref()
            .map(|dir| dir.join("ai-config.json").exists())
            .unwrap_or(false);
        let migration = static_data
            .as_ref()
            .map(|dir| dir.join("idb-migration-dry-run.json").exists())
            .unwrap_or(false);
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

async fn api_analytics(Json(payload): Json<serde_json::Value>) -> impl IntoResponse {
    tracing::info!("analytics event: {}", payload);
    StatusCode::NO_CONTENT
}

async fn api_csp_report(Json(payload): Json<serde_json::Value>) -> impl IntoResponse {
    tracing::warn!("csp-report: {}", payload);
    StatusCode::NO_CONTENT
}

async fn api_share_target(Json(payload): Json<serde_json::Value>) -> impl IntoResponse {
    tracing::info!("share-target: {}", payload);
    (StatusCode::OK, Json(payload))
}

async fn api_telemetry(Json(payload): Json<serde_json::Value>) -> impl IntoResponse {
    tracing::info!("telemetry: {}", payload);
    StatusCode::NO_CONTENT
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
