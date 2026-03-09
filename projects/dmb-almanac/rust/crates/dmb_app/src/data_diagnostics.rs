#[cfg(feature = "hydrate")]
use super::*;

#[path = "data_diagnostics_cache.rs"]
pub(super) mod cache;
#[path = "data_diagnostics_sqlite.rs"]
mod sqlite;

#[derive(Clone, Debug, Default)]
pub struct ManifestDiff {
    pub version: String,
    pub total_changed: usize,
    pub changed: Vec<ManifestDiffEntry>,
}

#[derive(Clone, Debug, Default)]
pub struct ManifestDiffEntry {
    pub name: String,
    pub before: u64,
    pub after: u64,
    pub delta: i64,
}

#[derive(Clone, Debug, Default)]
pub struct IntegrityReport {
    pub total_mismatches: usize,
    pub mismatches: Vec<IntegrityReportEntry>,
}

#[derive(Clone, Debug, Default)]
pub struct IntegrityReportEntry {
    pub store: String,
    pub expected: u64,
    pub actual: u64,
}

#[derive(Clone, Debug, Default)]
pub struct SqliteParityReport {
    pub available: bool,
    pub total_mismatches: usize,
    pub mismatches: Vec<SqliteParityEntry>,
    pub missing_tables: Vec<String>,
    pub idb_count_failures: Vec<String>,
}

#[derive(Clone, Debug, Default)]
pub struct SqliteParitySummaryReport {
    pub available: bool,
    pub sqlite_tables_present: usize,
    pub sqlite_tables_expected: usize,
    pub missing_tables: Vec<String>,
}

#[derive(Clone, Debug, Default)]
pub struct SqliteParityEntry {
    pub store: String,
    pub sqlite_table: String,
    pub idb_count: u64,
    pub sqlite_count: u64,
}

#[cfg(feature = "hydrate")]
const INTEGRITY_REPORT_CACHE_TTL_MS: f64 = 10_000.0;

#[cfg(feature = "hydrate")]
cache::define_thread_ttl_cache!(
    INTEGRITY_REPORT_CACHE,
    IntegrityReport,
    INTEGRITY_REPORT_CACHE_TTL_MS,
    read_integrity_report_cache,
    write_integrity_report_cache,
    clear_integrity_report_cache
);

#[cfg(feature = "hydrate")]
pub async fn fetch_integrity_report() -> Option<IntegrityReport> {
    cache::cached_thread_ttl_value(
        read_integrity_report_cache,
        write_integrity_report_cache,
        || async {
            let manifest = fetch_json::<DataManifest>("/data/manifest.json").await?;
            let dry_run = fetch_json::<DryRunReport>("/data/idb-migration-dry-run.json").await;
            let mismatches = verify_import_integrity(&manifest, dry_run.as_ref()).await?;
            let entries = mismatches
                .into_iter()
                .map(|entry| IntegrityReportEntry {
                    store: entry.store,
                    expected: entry.expected,
                    actual: entry.actual,
                })
                .collect::<Vec<_>>();
            let total_mismatches = entries.len();
            Some(IntegrityReport {
                total_mismatches,
                mismatches: entries,
            })
        },
    )
    .await
}

#[cfg(not(feature = "hydrate"))]
#[allow(clippy::unused_async)]
pub async fn fetch_integrity_report() -> Option<IntegrityReport> {
    None
}

pub async fn fetch_sqlite_parity_report() -> Option<SqliteParityReport> {
    sqlite::fetch_sqlite_parity_report().await
}

pub async fn fetch_sqlite_parity_summary_report() -> Option<SqliteParitySummaryReport> {
    sqlite::fetch_sqlite_parity_summary_report().await
}

pub fn clear_parity_diagnostics_cache() {
    #[cfg(feature = "hydrate")]
    {
        sqlite::clear_sqlite_parity_diagnostics_cache();
        clear_integrity_report_cache();
    }
}
