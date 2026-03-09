use std::sync::Arc;

use axum::{
    http::{HeaderName, Request},
    routing::get,
    Router,
};
use leptos::context::provide_context;
use leptos_axum::{generate_route_list, LeptosRoutes};
use sqlx::SqlitePool;
use tower_http::{
    compression::CompressionLayer,
    request_id::{MakeRequestUuid, PropagateRequestIdLayer, RequestId, SetRequestIdLayer},
    trace::TraceLayer,
};

use crate::state::AppState;

pub(crate) fn build_app_router(state: AppState, db: Option<SqlitePool>) -> Router {
    let routes = generate_route_list(dmb_app::App);
    let leptos_for_shell = state.leptos.clone();
    let db_context = Arc::new(db);

    let app = crate::status_endpoints::attach_status_routes(Router::new())
        .route("/api/data-parity", get(crate::data_parity::api_data_parity))
        .route(
            "/api/data-parity-summary",
            get(crate::data_parity::api_data_parity_summary),
        )
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
        .layer(axum::middleware::from_fn(
            crate::http_policy::cache_control_middleware,
        ))
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

    let coop_enabled = crate::http_policy::coop_coep_enabled();
    let app = crate::http_policy::apply_baseline_security_headers(app);
    let app = crate::http_policy::apply_coop_headers(app, coop_enabled);
    if !coop_enabled {
        tracing::warn!(
            "COOP/COEP headers disabled. SharedArrayBuffer, WebGPU worker paths, and wasm threads may be unavailable."
        );
    }

    app
}
