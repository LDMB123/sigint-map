use axum::{Json, Router, response::IntoResponse, routing::get};
use serde::Serialize;

use crate::state::AppState;

pub(crate) fn attach_status_routes(router: Router<AppState>) -> Router<AppState> {
    router
        .route("/api/health", get(api_health))
        .route("/api/ai-health", get(api_ai_health))
        .route("/sitemap.xml", get(sitemap))
        .route("/sitemap-static.xml", get(sitemap))
        .route("/sitemap-shows.xml", get(sitemap))
        .route("/sitemap-songs.xml", get(sitemap))
        .route("/sitemap-venues.xml", get(sitemap))
        .route("/sitemap-guests.xml", get(sitemap))
}

#[derive(Serialize)]
pub(crate) struct HealthResponse {
    status: &'static str,
    version: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AiHealthResponse {
    status: &'static str,
    version: &'static str,
    coop_coep_enabled: bool,
    sqlite_available: bool,
    static_manifest_present: bool,
    static_ai_config_present: bool,
    static_idb_migration_present: bool,
}

pub(crate) async fn api_health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        version: dmb_core::CORE_SCHEMA_VERSION,
    })
}

pub(crate) async fn api_ai_health(
    axum::extract::State(state): axum::extract::State<AppState>,
) -> Json<AiHealthResponse> {
    let coop = crate::http_policy::coop_coep_enabled();
    let assets = crate::ai_health_assets::probe_ai_static_assets(state.leptos.site_root.as_ref());

    Json(AiHealthResponse {
        status: "ok",
        version: dmb_core::CORE_SCHEMA_VERSION,
        coop_coep_enabled: coop,
        sqlite_available: state.db.is_some(),
        static_manifest_present: assets.manifest_present,
        static_ai_config_present: assets.ai_config_present,
        static_idb_migration_present: assets.migration_present,
    })
}

pub(crate) async fn sitemap() -> impl IntoResponse {
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
