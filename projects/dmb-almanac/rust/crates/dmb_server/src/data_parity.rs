use axum::{http::StatusCode, response::IntoResponse, Json};
use dmb_core::sqlite_parity_tables;
use serde::Serialize;
use std::collections::{HashMap, HashSet};

use crate::state::AppState;

pub(crate) type DataParityCache = crate::data_parity_cache::DataParityCache;
#[cfg(test)]
pub(crate) type DataParityCacheEntry = crate::data_parity_cache::DataParityCacheEntry;
#[cfg(test)]
pub(crate) const DATA_PARITY_CACHE_TTL: std::time::Duration =
    crate::data_parity_cache::DATA_PARITY_CACHE_TTL;

pub(crate) fn new_data_parity_cache() -> DataParityCache {
    crate::data_parity_cache::new_data_parity_cache()
}

#[cfg(test)]
pub(crate) fn build_table_counts_query(tables: &[&str]) -> Option<String> {
    crate::data_parity_sqlite::build_table_counts_query(tables)
}

pub(crate) async fn api_data_parity(
    axum::extract::State(state): axum::extract::State<AppState>,
) -> impl IntoResponse {
    if let Some(response) =
        crate::data_parity_cache::read_fresh_response(&state.data_parity_cache).await
    {
        return (StatusCode::OK, Json(response));
    }

    let Some(pool) = state.db.as_ref() else {
        let response = DataParityResponse {
            available: false,
            counts: HashMap::new(),
            missing_tables: Vec::new(),
        };
        return (StatusCode::OK, Json(response));
    };
    let existing_tables = crate::data_parity_sqlite::fetch_existing_tables(pool).await;
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
        crate::data_parity_sqlite::fetch_all_table_counts(pool)
            .await
            .unwrap_or_default()
    } else {
        crate::data_parity_sqlite::fetch_selected_table_counts(pool, &present_tables)
            .await
            .unwrap_or_default()
    };

    if counts.is_empty() && !present_tables.is_empty() {
        for table in present_tables {
            match crate::data_parity_sqlite::fetch_table_count(pool, table).await {
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
    crate::data_parity_cache::store_response(&state.data_parity_cache, &response).await;
    (StatusCode::OK, Json(response))
}

pub(crate) async fn api_data_parity_summary(
    axum::extract::State(state): axum::extract::State<AppState>,
) -> impl IntoResponse {
    let expected = sqlite_parity_tables().count();

    if let Some(cached_response) =
        crate::data_parity_cache::read_fresh_response(&state.data_parity_cache).await
    {
        let missing_tables = cached_response.missing_tables;
        let present = if cached_response.available {
            expected.saturating_sub(missing_tables.len())
        } else {
            0
        };
        let response = DataParitySummaryResponse {
            available: cached_response.available,
            sqlite_tables_present: present,
            sqlite_tables_expected: expected,
            missing_tables,
        };
        return (StatusCode::OK, Json(response));
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

    let existing_tables = crate::data_parity_sqlite::fetch_existing_tables(pool).await;
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

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DataParityResponse {
    pub(crate) available: bool,
    pub(crate) counts: HashMap<String, u64>,
    pub(crate) missing_tables: Vec<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DataParitySummaryResponse {
    available: bool,
    sqlite_tables_present: usize,
    sqlite_tables_expected: usize,
    missing_tables: Vec<String>,
}
