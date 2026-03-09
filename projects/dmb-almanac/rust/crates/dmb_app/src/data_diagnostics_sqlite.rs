use super::*;

#[cfg(feature = "hydrate")]
use serde::Deserialize;
#[cfg(feature = "hydrate")]
use std::collections::{HashMap, HashSet};

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SqliteParityResponse {
    available: bool,
    #[serde(default)]
    counts: HashMap<String, u64>,
    #[serde(default)]
    missing_tables: Vec<String>,
}

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SqliteParitySummaryResponse {
    available: bool,
    #[serde(default)]
    sqlite_tables_present: usize,
    #[serde(default)]
    sqlite_tables_expected: usize,
    #[serde(default)]
    missing_tables: Vec<String>,
}

#[cfg(feature = "hydrate")]
const SQLITE_PARITY_CACHE_TTL_MS: f64 = 10_000.0;

#[cfg(feature = "hydrate")]
super::cache::define_thread_ttl_cache!(
    SQLITE_PARITY_CACHE,
    SqliteParityReport,
    SQLITE_PARITY_CACHE_TTL_MS,
    read_sqlite_parity_cache,
    write_sqlite_parity_cache,
    clear_sqlite_parity_cache
);

#[cfg(feature = "hydrate")]
const SQLITE_PARITY_SUMMARY_CACHE_TTL_MS: f64 = 10_000.0;

#[cfg(feature = "hydrate")]
super::cache::define_thread_ttl_cache!(
    SQLITE_PARITY_SUMMARY_CACHE,
    SqliteParitySummaryReport,
    SQLITE_PARITY_SUMMARY_CACHE_TTL_MS,
    read_sqlite_parity_summary_cache,
    write_sqlite_parity_summary_cache,
    clear_sqlite_parity_summary_cache
);

#[cfg(feature = "hydrate")]
pub(super) async fn fetch_sqlite_parity_report() -> Option<SqliteParityReport> {
    super::cache::cached_thread_ttl_value(
        read_sqlite_parity_cache,
        write_sqlite_parity_cache,
        || async {
            let response = fetch_json::<SqliteParityResponse>("/api/data-parity").await?;
            if !response.available {
                return Some(SqliteParityReport {
                    available: false,
                    total_mismatches: 0,
                    mismatches: Vec::new(),
                    missing_tables: response.missing_tables,
                    idb_count_failures: Vec::new(),
                });
            }

            let stores: Vec<&str> = SQLITE_PARITY_STORE_TABLE_MAPPINGS
                .iter()
                .map(|(store, _)| *store)
                .collect();
            let (idb_counts, known_missing_stores) = dmb_idb::count_stores_with_missing(&stores)
                .await
                .map(|(entries, missing)| {
                    let counts = entries
                        .into_iter()
                        .map(|(name, count)| (name, count as u64))
                        .collect::<HashMap<_, _>>();
                    let missing = missing.into_iter().collect::<HashSet<_>>();
                    (counts, missing)
                })
                .unwrap_or_else(|err| {
                    tracing::warn!(
                        error = ?err,
                        "sqlite parity: IndexedDB store counting failed; marking all stores unavailable"
                    );
                    let missing = stores
                        .iter()
                        .map(|store| (*store).to_string())
                        .collect::<HashSet<_>>();
                    (HashMap::new(), missing)
                });

            let mut mismatches = Vec::new();
            let mut idb_count_failures = Vec::new();
            for &(store, table) in SQLITE_PARITY_STORE_TABLE_MAPPINGS.iter() {
                if known_missing_stores.contains(store) {
                    idb_count_failures.push(store.to_string());
                    continue;
                }

                let Some(idb_count) = idb_counts.get(store).copied() else {
                    idb_count_failures.push(store.to_string());
                    continue;
                };
                let sqlite_count = response.counts.get(table).copied().unwrap_or(0);
                if idb_count != sqlite_count {
                    mismatches.push(SqliteParityEntry {
                        store: store.to_string(),
                        sqlite_table: table.to_string(),
                        idb_count,
                        sqlite_count,
                    });
                }
            }
            idb_count_failures.sort_unstable();
            idb_count_failures.dedup();

            let total_mismatches = mismatches.len();
            Some(SqliteParityReport {
                available: true,
                total_mismatches,
                mismatches,
                missing_tables: response.missing_tables,
                idb_count_failures,
            })
        },
    )
    .await
}

#[cfg(not(feature = "hydrate"))]
#[allow(clippy::unused_async)]
pub(super) async fn fetch_sqlite_parity_report() -> Option<SqliteParityReport> {
    None
}

#[cfg(feature = "hydrate")]
pub(super) async fn fetch_sqlite_parity_summary_report() -> Option<SqliteParitySummaryReport> {
    super::cache::cached_thread_ttl_value(
        read_sqlite_parity_summary_cache,
        write_sqlite_parity_summary_cache,
        || async {
            let response =
                fetch_json::<SqliteParitySummaryResponse>("/api/data-parity-summary").await?;
            Some(SqliteParitySummaryReport {
                available: response.available,
                sqlite_tables_present: response.sqlite_tables_present,
                sqlite_tables_expected: response.sqlite_tables_expected,
                missing_tables: response.missing_tables,
            })
        },
    )
    .await
}

#[cfg(not(feature = "hydrate"))]
#[allow(clippy::unused_async)]
pub(super) async fn fetch_sqlite_parity_summary_report() -> Option<SqliteParitySummaryReport> {
    None
}

#[cfg(feature = "hydrate")]
pub(super) fn clear_sqlite_parity_diagnostics_cache() {
    clear_sqlite_parity_cache();
    clear_sqlite_parity_summary_cache();
}
