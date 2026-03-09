use axum::body::Body;
use axum::body::to_bytes;
use axum::http::{HeaderName, Request, StatusCode};
use axum::response::Response;
use axum::{Router, routing::get};
use leptos_axum::{LeptosRoutes, generate_route_list};
use leptos_config::LeptosOptions;
use serde_json::Value;
use sqlx::sqlite::SqlitePoolOptions;
use std::convert::Infallible;
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};
use tower::ServiceExt;
use tower::util::BoxCloneService;
use tower_http::request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer};

use crate::data_parity::{
    DATA_PARITY_CACHE_TTL, DataParityCacheEntry, DataParityResponse, api_data_parity,
    api_data_parity_summary, build_table_counts_query, new_data_parity_cache,
};
use crate::http_policy::{apply_baseline_security_headers, apply_coop_headers};
use crate::startup::{self, MISSING_STATIC_ASSETS_HELP};
use crate::state::AppState;
use crate::status_endpoints::{api_ai_health, api_health};

mod data_parity_tests;
mod http_policy_tests;
mod logging_tests;
mod ssr_tests;
mod startup_tests;

pub(super) async fn parse_json_body(response: Response) -> Value {
    let body = match to_bytes(response.into_body(), 2 * 1024 * 1024).await {
        Ok(bytes) => bytes,
        Err(err) => panic!("read body: {err}"),
    };
    match serde_json::from_slice(&body) {
        Ok(value) => value,
        Err(err) => panic!("parse json body: {err}"),
    }
}

pub(super) fn unique_temp_dir(prefix: &str) -> std::path::PathBuf {
    let nanos = match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => duration.as_nanos(),
        Err(err) => panic!("unix epoch: {err}"),
    };
    let dir = std::env::temp_dir().join(format!(
        "dmb_server_{prefix}_{}_{}",
        std::process::id(),
        nanos
    ));
    if let Err(err) = fs::create_dir_all(&dir) {
        panic!("create temp dir: {err}");
    }
    dir
}

pub(super) fn build_test_ssr_app() -> BoxCloneService<Request<Body>, Response, Infallible> {
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
