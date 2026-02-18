use std::collections::{HashMap, HashSet};
use std::time::Instant;

use axum::{http::StatusCode, response::IntoResponse, Json};
use dmb_core::sqlite_parity_tables;
use serde::Serialize;

use super::env::coop_coep_enabled;
use super::parity::{fetch_existing_tables, fetch_selected_table_counts, fetch_table_count};
use super::{AppState, DataParityCacheEntry, DATA_PARITY_CACHE_TTL};

#[derive(Serialize)]
pub(super) struct HealthResponse {
    status: &'static str,
    version: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct AiHealthResponse {
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
pub(super) struct DataParityResponse {
    pub(super) available: bool,
    pub(super) counts: HashMap<String, u64>,
    pub(super) missing_tables: Vec<String>,
}

pub(super) async fn api_data_parity(
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
    let (present_tables, missing_tables): (Vec<_>, Vec<_>) =
        sqlite_parity_tables().partition(|table| existing_tables.contains(*table));
    let mut missing_set: HashSet<String> = missing_tables
        .into_iter()
        .map(|table| table.to_string())
        .collect();

    let mut counts = fetch_selected_table_counts(pool, &present_tables)
        .await
        .unwrap_or_default();

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

pub(super) async fn api_health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        version: dmb_core::CORE_SCHEMA_VERSION,
    })
}

pub(super) async fn api_ai_health(
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

pub(super) async fn sitemap() -> impl IntoResponse {
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
