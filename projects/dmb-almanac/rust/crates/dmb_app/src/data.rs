#[cfg(feature = "hydrate")]
use std::cell::RefCell;
#[cfg(feature = "hydrate")]
use std::collections::{HashMap, HashSet};
#[cfg(feature = "hydrate")]
use std::future::Future;
#[cfg(feature = "hydrate")]
use std::sync::OnceLock;

#[cfg(feature = "hydrate")]
use leptos::prelude::GetUntracked;
use leptos::prelude::RwSignal;
#[cfg(feature = "hydrate")]
use leptos::prelude::Set;
#[cfg(feature = "hydrate")]
use serde::{Deserialize, Serialize};

#[cfg(feature = "hydrate")]
use dmb_core::SQLITE_PARITY_STORE_TABLE_MAPPINGS;
#[cfg(feature = "hydrate")]
use dmb_idb::{
    TABLE_CURATED_LISTS, TABLE_CURATED_LIST_ITEMS, TABLE_GUESTS, TABLE_GUEST_APPEARANCES,
    TABLE_LIBERATION_LIST, TABLE_RELEASES, TABLE_RELEASE_TRACKS, TABLE_SETLIST_ENTRIES,
    TABLE_SHOWS, TABLE_SONGS, TABLE_SONG_STATS, TABLE_TOURS, TABLE_VENUES,
};
#[cfg(feature = "hydrate")]
use js_sys::Array;
#[cfg(feature = "hydrate")]
use wasm_bindgen::JsValue;

#[derive(Clone, Debug, Default)]
pub struct ImportStatus {
    pub message: String,
    pub progress: f32,
    pub done: bool,
    pub error: Option<String>,
    pub can_reset: bool,
    pub tuning: Option<ImportTuningSnapshot>,
}

#[derive(Clone, Debug, Default)]
pub struct ImportTuningSnapshot {
    pub chunk_records: usize,
    pub tx_batch_size: usize,
    pub last_chunk_ms: f64,
    pub long_task_count: u32,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum SeedDataState {
    Ready,
    #[default]
    Importing,
}

#[derive(Clone, Debug, Default)]
pub struct StorageInfo {
    pub usage: Option<f64>,
    pub quota: Option<f64>,
}

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
    // If any IndexedDB store counts fail, the parity check is incomplete.
    // We avoid defaulting to `0` (which creates misleading "mismatch" alerts) and instead
    // surface these failures separately in the diagnostics UI.
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
#[derive(Debug, Clone, Deserialize)]
struct DataManifest {
    version: String,
    #[serde(default, alias = "recordCounts")]
    record_counts: HashMap<String, u64>,
    #[serde(default)]
    files: Vec<ManifestFile>,
}

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, Deserialize)]
struct ManifestFile {
    name: String,
    #[serde(default, alias = "recordCount")]
    count: Option<u64>,
}

#[cfg(any(feature = "hydrate", test))]
fn compute_manifest_diff(
    previous: &std::collections::HashMap<String, u64>,
    next: &std::collections::HashMap<String, u64>,
) -> Vec<ManifestDiffEntry> {
    let mut out = Vec::new();
    for (name, &after) in next {
        let before = previous.get(name).copied().unwrap_or(0);
        if before != after {
            let delta = after as i64 - before as i64;
            out.push(ManifestDiffEntry {
                name: name.clone(),
                before,
                after,
                delta,
            });
        }
    }
    out.sort_by(|a, b| b.delta.abs().cmp(&a.delta.abs()));
    out
}

#[cfg(feature = "hydrate")]
impl DataManifest {
    fn record_counts_map(&self) -> HashMap<String, u64> {
        if !self.record_counts.is_empty() {
            return self.record_counts.clone();
        }

        let mut counts = HashMap::new();
        let mut setlist_single_count = None;
        let mut setlist_chunk_count = 0u64;

        for file in &self.files {
            let Some(count) = file.count else { continue };
            let Some(stem) = manifest_name_stem(&file.name) else {
                continue;
            };
            if stem == "setlist-entries" {
                let total = setlist_single_count.unwrap_or(0u64).saturating_add(count);
                setlist_single_count = Some(total);
                continue;
            }
            if stem.starts_with(SETLIST_CHUNK_PREFIX) {
                setlist_chunk_count = setlist_chunk_count.saturating_add(count);
                continue;
            }

            let name = stem.to_string();
            *counts.entry(name).or_insert(0) += count;
        }

        if let Some(single_count) = setlist_single_count {
            counts.insert("setlist-entries".to_string(), single_count);
        } else if setlist_chunk_count > 0 {
            counts.insert("setlist-entries".to_string(), setlist_chunk_count);
        }
        counts
    }

    fn chunk_files_with_prefix(&self, prefix: &str) -> Vec<String> {
        let mut files = self
            .files
            .iter()
            .filter_map(|file| {
                let stem = manifest_name_stem(&file.name)?;
                if stem.starts_with(prefix) {
                    Some(file.name.clone())
                } else {
                    None
                }
            })
            .collect::<Vec<_>>();
        files.sort();
        files
    }
}

#[cfg(feature = "hydrate")]
async fn fetch_json<T: serde::de::DeserializeOwned>(url: &str) -> Option<T> {
    crate::browser::http::fetch_json(url).await
}

#[cfg(feature = "hydrate")]
async fn fetch_json_array(url: &str) -> Result<Array, JsValue> {
    crate::browser::http::fetch_json_array(url).await
}

#[cfg(feature = "hydrate")]
pub async fn fetch_manifest_diff() -> Option<ManifestDiff> {
    let manifest = fetch_json::<DataManifest>("/data/manifest.json").await?;
    let marker = dmb_idb::get_sync_meta::<ImportMarker>(IMPORT_MARKER_ID)
        .await
        .ok()
        .flatten();
    let previous = marker.map(|m| m.record_counts).unwrap_or_default();
    let next = manifest.record_counts_map();
    let changed = compute_manifest_diff(&previous, &next);
    let total_changed = changed.len();
    Some(ManifestDiff {
        version: manifest.version,
        total_changed,
        changed,
    })
}

#[cfg(not(feature = "hydrate"))]
#[allow(clippy::unused_async)]
pub async fn fetch_manifest_diff() -> Option<ManifestDiff> {
    None
}

#[cfg(feature = "hydrate")]
type ThreadTtlCache<T> = RefCell<Option<(f64, T)>>;

#[cfg(feature = "hydrate")]
fn read_thread_ttl_cache<T: Clone>(
    cache: &'static std::thread::LocalKey<ThreadTtlCache<T>>,
    ttl_ms: f64,
) -> Option<T> {
    let now = js_sys::Date::now();
    cache.with(|cache| {
        let mut cached = cache.borrow_mut();
        if let Some((timestamp_ms, value)) = cached.as_ref() {
            if now - *timestamp_ms <= ttl_ms {
                return Some(value.clone());
            }
        }
        *cached = None;
        None
    })
}

#[cfg(feature = "hydrate")]
fn write_thread_ttl_cache<T: Clone>(
    cache: &'static std::thread::LocalKey<ThreadTtlCache<T>>,
    value: &T,
) {
    cache.with(|cache| {
        *cache.borrow_mut() = Some((js_sys::Date::now(), value.clone()));
    });
}

#[cfg(feature = "hydrate")]
fn clear_thread_ttl_cache<T>(cache: &'static std::thread::LocalKey<ThreadTtlCache<T>>) {
    cache.with(|cache| {
        *cache.borrow_mut() = None;
    });
}

#[cfg(feature = "hydrate")]
async fn cached_thread_ttl_value<T, F, Fut>(
    read_cached: fn() -> Option<T>,
    write_cached: fn(&T),
    load: F,
) -> Option<T>
where
    T: Clone,
    F: FnOnce() -> Fut,
    Fut: Future<Output = Option<T>>,
{
    if let Some(cached) = read_cached() {
        return Some(cached);
    }

    let value = load().await?;
    write_cached(&value);
    Some(value)
}

#[cfg(feature = "hydrate")]
macro_rules! define_thread_ttl_cache {
    (
        $cache:ident,
        $value:ty,
        $ttl_ms:ident,
        $read_fn:ident,
        $write_fn:ident,
        $clear_fn:ident
    ) => {
        thread_local! {
            static $cache: RefCell<Option<(f64, $value)>> = const { RefCell::new(None) };
        }

        fn $read_fn() -> Option<$value> {
            read_thread_ttl_cache(&$cache, $ttl_ms)
        }

        fn $write_fn(value: &$value) {
            write_thread_ttl_cache(&$cache, value);
        }

        fn $clear_fn() {
            clear_thread_ttl_cache(&$cache);
        }
    };
}

#[cfg(feature = "hydrate")]
const INTEGRITY_REPORT_CACHE_TTL_MS: f64 = 10_000.0;

#[cfg(feature = "hydrate")]
define_thread_ttl_cache!(
    INTEGRITY_REPORT_CACHE,
    IntegrityReport,
    INTEGRITY_REPORT_CACHE_TTL_MS,
    read_integrity_report_cache,
    write_integrity_report_cache,
    clear_integrity_report_cache
);

#[cfg(feature = "hydrate")]
pub async fn fetch_integrity_report() -> Option<IntegrityReport> {
    cached_thread_ttl_value(
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

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SqliteParityResponse {
    available: bool,
    #[serde(default)]
    counts: std::collections::HashMap<String, u64>,
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
define_thread_ttl_cache!(
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
define_thread_ttl_cache!(
    SQLITE_PARITY_SUMMARY_CACHE,
    SqliteParitySummaryReport,
    SQLITE_PARITY_SUMMARY_CACHE_TTL_MS,
    read_sqlite_parity_summary_cache,
    write_sqlite_parity_summary_cache,
    clear_sqlite_parity_summary_cache
);

#[cfg(feature = "hydrate")]
pub async fn fetch_sqlite_parity_report() -> Option<SqliteParityReport> {
    cached_thread_ttl_value(
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
pub async fn fetch_sqlite_parity_report() -> Option<SqliteParityReport> {
    None
}

#[cfg(feature = "hydrate")]
pub async fn fetch_sqlite_parity_summary_report() -> Option<SqliteParitySummaryReport> {
    cached_thread_ttl_value(
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
pub async fn fetch_sqlite_parity_summary_report() -> Option<SqliteParitySummaryReport> {
    None
}

pub fn clear_parity_diagnostics_cache() {
    #[cfg(feature = "hydrate")]
    {
        clear_sqlite_parity_cache();
        clear_integrity_report_cache();
        clear_sqlite_parity_summary_cache();
    }
}

#[cfg(feature = "hydrate")]
fn manifest_name_stem(name: &str) -> Option<&str> {
    name.strip_suffix(".json.br")
        .or_else(|| name.strip_suffix(".json.gz"))
        .or_else(|| name.strip_suffix(".json"))
}

#[cfg(feature = "hydrate")]
fn normalized_manifest_name(name: &str) -> Option<String> {
    let stem = manifest_name_stem(name)?;
    if stem.starts_with(SETLIST_CHUNK_PREFIX) {
        Some("setlist-entries".to_string())
    } else {
        Some(stem.to_string())
    }
}

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ImportMarker {
    id: String,
    manifest_version: String,
    imported_at: String,
    record_counts: HashMap<String, u64>,
}

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ImportCheckpoint {
    id: String,
    manifest_version: String,
    file_index: usize,
    chunk_index: usize,
    #[serde(default)]
    record_offset: Option<usize>,
    total_files: usize,
    chunk_total: usize,
    updated_at: String,
    completed: bool,
}

#[cfg(feature = "hydrate")]
struct ImportSpec {
    file: &'static str,
    store: &'static str,
    chunk_prefix: Option<&'static str>,
}

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone)]
struct ImportWorkItem {
    label: String,
    url: String,
    store: &'static str,
}

#[cfg(feature = "hydrate")]
struct ImportWorkContext<'a> {
    manifest_version: &'a str,
    file_index: usize,
    total_work_items: usize,
    total_files: f32,
}

#[cfg(feature = "hydrate")]
const IMPORT_MARKER_ID: &str = "data_import_v1";
#[cfg(feature = "hydrate")]
const IMPORT_CHECKPOINT_ID: &str = "data_import_checkpoint_v1";
#[cfg(feature = "hydrate")]
const SETLIST_CHUNK_PREFIX: &str = "setlist-entries-chunk-";
#[cfg(feature = "hydrate")]
pub const IMPORT_TUNING_FLAG_KEY: &str = "pwa_import_tuning_v2";
#[cfg(feature = "hydrate")]
const DEFAULT_IMPORT_CHUNK_SIZE: usize = 1000;
#[cfg(feature = "hydrate")]
const LARGE_IMPORT_CHUNK_SIZE: usize = 10_000;
#[cfg(feature = "hydrate")]
const LARGE_IMPORT_RECORD_THRESHOLD: usize = 20_000;
#[cfg(feature = "hydrate")]
const CHECKPOINT_INTERVAL_CHUNKS: usize = 4;
#[cfg(feature = "hydrate")]
const ADAPTIVE_CHECKPOINT_INTERVAL_CHUNKS: usize = 2;
#[cfg(feature = "hydrate")]
const CHECKPOINT_INTERVAL_MS: f64 = 1_500.0;
#[cfg(feature = "hydrate")]
const ADAPTIVE_CHUNK_RECORDS_START: usize = 1_000;
#[cfg(feature = "hydrate")]
const ADAPTIVE_TX_BATCH_START: usize = 750;
#[cfg(feature = "hydrate")]
const ADAPTIVE_CHUNK_RECORDS_MIN: usize = 250;
#[cfg(feature = "hydrate")]
const ADAPTIVE_CHUNK_RECORDS_MAX: usize = 8_000;
#[cfg(feature = "hydrate")]
const ADAPTIVE_TX_BATCH_MIN: usize = 128;
#[cfg(feature = "hydrate")]
const ADAPTIVE_TX_BATCH_MAX: usize = 1_500;
#[cfg(feature = "hydrate")]
const ADAPTIVE_TARGET_CHUNK_MS: f64 = 45.0;
#[cfg(feature = "hydrate")]
const ADAPTIVE_SLOW_CHUNK_MS: f64 = 75.0;
#[cfg(feature = "hydrate")]
const ADAPTIVE_FAST_CHUNK_MS: f64 = 25.0;
#[cfg(feature = "hydrate")]
const ADAPTIVE_FAST_STREAK_REQUIRED: usize = 3;
pub const STORAGE_PRESSURE_THRESHOLD: f64 = 0.85;
#[cfg(feature = "hydrate")]
const AI_CACHE_PATHS: [&str; 4] = [
    "/data/ann-index.bin",
    "/data/ann-index.json",
    "/data/ann-index.ivf.json",
    "/data/embedding-manifest.json",
];

#[cfg(feature = "hydrate")]
#[inline]
fn import_chunk_size(total_records: usize) -> usize {
    if total_records >= LARGE_IMPORT_RECORD_THRESHOLD {
        LARGE_IMPORT_CHUNK_SIZE
    } else {
        DEFAULT_IMPORT_CHUNK_SIZE
    }
}

#[cfg(feature = "hydrate")]
fn parse_boolean_flag(raw: &str) -> Option<bool> {
    match raw.trim().to_ascii_lowercase().as_str() {
        "1" | "true" | "yes" | "on" => Some(true),
        "0" | "false" | "no" | "off" => Some(false),
        _ => None,
    }
}

#[cfg(feature = "hydrate")]
fn import_tuning_enabled() -> bool {
    if let Some(raw) = crate::browser::storage::local_storage_item(IMPORT_TUNING_FLAG_KEY) {
        if let Some(enabled) = parse_boolean_flag(&raw) {
            return enabled;
        }
    }

    // Rollout default: ON for dev-like hosts, OFF otherwise.
    match crate::browser::runtime::location_hostname() {
        Some(host) => matches!(
            host.to_ascii_lowercase().as_str(),
            "localhost" | "127.0.0.1" | "::1"
        ),
        None => false,
    }
}

#[cfg(feature = "hydrate")]
fn performance_now_ms() -> f64 {
    crate::browser::runtime::performance_now_ms().unwrap_or_else(js_sys::Date::now)
}

#[cfg(feature = "hydrate")]
struct AdaptiveImportGovernor {
    chunk_records: usize,
    tx_batch_size: usize,
    fast_streak: usize,
}

#[cfg(feature = "hydrate")]
impl AdaptiveImportGovernor {
    fn new() -> Self {
        Self {
            chunk_records: ADAPTIVE_CHUNK_RECORDS_START,
            tx_batch_size: ADAPTIVE_TX_BATCH_START,
            fast_streak: 0,
        }
    }

    fn snapshot(&self, last_chunk_ms: f64, long_task_count: u32) -> ImportTuningSnapshot {
        ImportTuningSnapshot {
            chunk_records: self.chunk_records,
            tx_batch_size: self.tx_batch_size,
            last_chunk_ms,
            long_task_count,
        }
    }

    fn next_chunk_records(&self, remaining_records: usize) -> usize {
        self.chunk_records.min(remaining_records.max(1))
    }

    fn update_after_chunk(&mut self, chunk_ms: f64, no_pending_interaction: bool) {
        let slow_chunk = chunk_ms > ADAPTIVE_SLOW_CHUNK_MS;
        let fast_chunk = chunk_ms < ADAPTIVE_FAST_CHUNK_MS;

        if slow_chunk {
            self.fast_streak = 0;
            self.chunk_records = ((self.chunk_records as f64) * 0.75).round() as usize;
            self.tx_batch_size = ((self.tx_batch_size as f64) * 0.75).round() as usize;
        } else if fast_chunk && no_pending_interaction {
            self.fast_streak = self.fast_streak.saturating_add(1);
            if self.fast_streak >= ADAPTIVE_FAST_STREAK_REQUIRED {
                self.chunk_records = ((self.chunk_records as f64) * 1.15).round() as usize;
                self.tx_batch_size = ((self.tx_batch_size as f64) * 1.15).round() as usize;
                self.fast_streak = 0;
            }
        } else {
            self.fast_streak = 0;
            if chunk_ms > ADAPTIVE_TARGET_CHUNK_MS && no_pending_interaction {
                self.chunk_records = ((self.chunk_records as f64) * 0.9).round() as usize;
                self.tx_batch_size = ((self.tx_batch_size as f64) * 0.9).round() as usize;
            }
        }

        self.chunk_records = self
            .chunk_records
            .clamp(ADAPTIVE_CHUNK_RECORDS_MIN, ADAPTIVE_CHUNK_RECORDS_MAX);
        self.tx_batch_size = self
            .tx_batch_size
            .clamp(ADAPTIVE_TX_BATCH_MIN, ADAPTIVE_TX_BATCH_MAX);
    }
}

#[cfg(feature = "hydrate")]
pub async fn detect_seed_data_state() -> SeedDataState {
    if dmb_idb::get_sync_meta::<ImportMarker>(IMPORT_MARKER_ID)
        .await
        .ok()
        .flatten()
        .is_some()
    {
        return SeedDataState::Ready;
    }

    if let Ok(Some(checkpoint)) =
        dmb_idb::get_sync_meta::<ImportCheckpoint>(IMPORT_CHECKPOINT_ID).await
    {
        if checkpoint.completed {
            return SeedDataState::Ready;
        }
        return SeedDataState::Importing;
    }

    SeedDataState::Importing
}

#[cfg(not(feature = "hydrate"))]
#[allow(clippy::unused_async)]
pub async fn detect_seed_data_state() -> SeedDataState {
    SeedDataState::Ready
}

#[cfg(feature = "hydrate")]
const IMPORT_SPECS: &[ImportSpec] = &[
    ImportSpec {
        file: "venues.json",
        store: TABLE_VENUES,
        chunk_prefix: None,
    },
    ImportSpec {
        file: "songs.json",
        store: TABLE_SONGS,
        chunk_prefix: None,
    },
    ImportSpec {
        file: "tours.json",
        store: TABLE_TOURS,
        chunk_prefix: None,
    },
    ImportSpec {
        file: "shows.json",
        store: TABLE_SHOWS,
        chunk_prefix: None,
    },
    ImportSpec {
        file: "setlist-entries.json",
        store: TABLE_SETLIST_ENTRIES,
        chunk_prefix: Some(SETLIST_CHUNK_PREFIX),
    },
    ImportSpec {
        file: "guests.json",
        store: TABLE_GUESTS,
        chunk_prefix: None,
    },
    ImportSpec {
        file: "guest-appearances.json",
        store: TABLE_GUEST_APPEARANCES,
        chunk_prefix: None,
    },
    ImportSpec {
        file: "liberation-list.json",
        store: TABLE_LIBERATION_LIST,
        chunk_prefix: None,
    },
    ImportSpec {
        file: "song-statistics.json",
        store: TABLE_SONG_STATS,
        chunk_prefix: None,
    },
    ImportSpec {
        file: "releases.json",
        store: TABLE_RELEASES,
        chunk_prefix: None,
    },
    ImportSpec {
        file: "release-tracks.json",
        store: TABLE_RELEASE_TRACKS,
        chunk_prefix: None,
    },
    ImportSpec {
        file: "curated-lists.json",
        store: TABLE_CURATED_LISTS,
        chunk_prefix: None,
    },
    ImportSpec {
        file: "curated-list-items.json",
        store: TABLE_CURATED_LIST_ITEMS,
        chunk_prefix: None,
    },
];

#[cfg(feature = "hydrate")]
fn build_import_work_items(manifest: &DataManifest) -> Vec<ImportWorkItem> {
    let mut items = Vec::with_capacity(IMPORT_SPECS.len() + manifest.files.len());
    for spec in IMPORT_SPECS {
        if let Some(prefix) = spec.chunk_prefix {
            let chunk_files = manifest.chunk_files_with_prefix(prefix);
            if !chunk_files.is_empty() {
                for name in chunk_files {
                    items.push(ImportWorkItem {
                        label: name.clone(),
                        url: format!("/data/{name}"),
                        store: spec.store,
                    });
                }
                continue;
            }
        }

        items.push(ImportWorkItem {
            label: spec.file.to_string(),
            url: format!("/data/{}", spec.file),
            store: spec.store,
        });
    }
    items
}

#[cfg(feature = "hydrate")]
fn set_import_progress(status: RwSignal<ImportStatus>, message: impl Into<String>, progress: f32) {
    let tuning = status.get_untracked().tuning;
    status.set(ImportStatus {
        message: message.into(),
        progress: progress.clamp(0.0, 1.0),
        done: false,
        error: None,
        can_reset: false,
        tuning,
    });
}

#[cfg(feature = "hydrate")]
fn set_import_progress_with_tuning(
    status: RwSignal<ImportStatus>,
    message: impl Into<String>,
    progress: f32,
    tuning: Option<ImportTuningSnapshot>,
) {
    status.set(ImportStatus {
        message: message.into(),
        progress: progress.clamp(0.0, 1.0),
        done: false,
        error: None,
        can_reset: false,
        tuning,
    });
}

#[cfg(feature = "hydrate")]
fn import_error_status(message: String, progress: f32, error: String) -> ImportStatus {
    ImportStatus {
        message,
        progress: progress.clamp(0.0, 1.0),
        done: false,
        error: Some(error),
        can_reset: true,
        tuning: None,
    }
}

#[cfg(feature = "hydrate")]
fn set_import_ready(status: RwSignal<ImportStatus>) {
    status.set(ImportStatus {
        message: "Offline data ready".to_string(),
        progress: 1.0,
        done: true,
        error: None,
        can_reset: false,
        tuning: None,
    });
}

#[cfg(feature = "hydrate")]
async fn migrate_previous_version_data(status: RwSignal<ImportStatus>) {
    set_import_progress(status, "Checking previous-version data…", 0.0);
    match dmb_idb::migrate_previous_db().await {
        Ok(true) => set_import_progress(status, "Migrated previous-version data", 0.05),
        Ok(false) => {}
        Err(err) => {
            set_import_progress(
                status,
                "Previous-version migration failed; proceeding with fresh import",
                0.05,
            );
            web_sys::console::warn_1(&JsValue::from_str(&format!(
                "previous-version migration failed: {err:?}"
            )));
        }
    }
}

#[cfg(feature = "hydrate")]
async fn load_seed_manifest(
    status: RwSignal<ImportStatus>,
) -> Option<(DataManifest, Option<DryRunReport>)> {
    let manifest = fetch_json::<DataManifest>("/data/manifest.json").await?;
    let dry_run = fetch_json::<DryRunReport>("/data/idb-migration-dry-run.json").await;
    if manifest.version.is_empty() {
        status.set(import_error_status(
            "Offline manifest missing".to_string(),
            0.0,
            "Missing /data/manifest.json".to_string(),
        ));
        return None;
    }
    Some((manifest, dry_run))
}

#[cfg(feature = "hydrate")]
async fn clear_seed_stores_for_repair() {
    for spec in IMPORT_SPECS {
        if let Err(err) = dmb_idb::clear_store(spec.store).await {
            tracing::warn!(
                store = spec.store,
                error = ?err,
                "failed to clear store during repair"
            );
        }
    }
    let _ = dmb_idb::delete_sync_meta(IMPORT_MARKER_ID).await;
    let _ = dmb_idb::delete_sync_meta(IMPORT_CHECKPOINT_ID).await;
}

#[cfg(feature = "hydrate")]
async fn check_existing_manifest_integrity(
    status: RwSignal<ImportStatus>,
    manifest: &DataManifest,
    dry_run: Option<&DryRunReport>,
) -> bool {
    let Ok(Some(marker)) = dmb_idb::get_sync_meta::<ImportMarker>(IMPORT_MARKER_ID).await else {
        return false;
    };
    if marker.manifest_version != manifest.version {
        return false;
    }

    if let Some(mismatches) = verify_import_integrity(manifest, dry_run).await {
        if mismatches.is_empty() {
            set_import_ready(status);
            return true;
        }
        // Auto-repair: this typically means the IDB schema drifted (missing stores)
        // or the previous import was interrupted. Clear seed stores and re-import.
        tracing::warn!(
            mismatch_count = mismatches.len(),
            "integrity check failed for current manifest; clearing seed stores and reimporting"
        );
        set_import_progress(
            status,
            "Offline data integrity check failed; repairing…",
            0.02,
        );
        clear_seed_stores_for_repair().await;
        return false;
    }

    set_import_ready(status);
    true
}

#[cfg(feature = "hydrate")]
async fn load_resume_position(
    manifest: &DataManifest,
    total_work_items: usize,
) -> (usize, usize, Option<usize>) {
    let Ok(Some(checkpoint)) =
        dmb_idb::get_sync_meta::<ImportCheckpoint>(IMPORT_CHECKPOINT_ID).await
    else {
        return (0, 0, None);
    };
    if checkpoint.manifest_version != manifest.version || checkpoint.completed {
        return (0, 0, None);
    }
    (
        checkpoint.file_index.min(total_work_items),
        checkpoint.chunk_index,
        checkpoint.record_offset,
    )
}

#[cfg(feature = "hydrate")]
fn chunk_values(values: &Array, start: usize, end: usize) -> Vec<JsValue> {
    let mut chunk: Vec<JsValue> = Vec::with_capacity(end.saturating_sub(start));
    for idx in start..end {
        chunk.push(values.get(idx as u32));
    }
    chunk
}

#[cfg(feature = "hydrate")]
fn resolve_resume_record_offset(
    start_record_offset_hint: Option<usize>,
    start_chunk_hint: usize,
    total_records: usize,
) -> usize {
    if let Some(offset) = start_record_offset_hint {
        return offset.min(total_records);
    }
    if start_chunk_hint > 0 {
        return (start_chunk_hint * ADAPTIVE_CHUNK_RECORDS_START).min(total_records);
    }
    0
}

#[cfg(feature = "hydrate")]
async fn persist_import_checkpoint(
    manifest_version: &str,
    file_index: usize,
    chunk_number: usize,
    record_offset: Option<usize>,
    total_work_items: usize,
    chunk_total: usize,
) {
    let checkpoint = ImportCheckpoint {
        id: IMPORT_CHECKPOINT_ID.to_string(),
        manifest_version: manifest_version.to_string(),
        file_index,
        chunk_index: chunk_number,
        record_offset,
        total_files: total_work_items,
        chunk_total,
        updated_at: js_sys::Date::new_0().to_string().into(),
        completed: false,
    };
    let _ = dmb_idb::put_sync_meta(&checkpoint).await;
}

#[cfg(feature = "hydrate")]
async fn yield_to_browser_scheduler() {
    crate::browser::scheduler::yield_now().await;
}

#[cfg(feature = "hydrate")]
async fn import_single_work_item(
    status: RwSignal<ImportStatus>,
    manifest_version: &str,
    work_item: &ImportWorkItem,
    file_index: usize,
    total_work_items: usize,
    total_files: f32,
    start_chunk_hint: usize,
) -> Result<(), ImportStatus> {
    let file_number = file_index + 1;
    let progress_base = file_index as f32 / total_files;
    set_import_progress(
        status,
        format!(
            "Importing {} ({}/{})",
            work_item.label, file_number, total_work_items
        ),
        progress_base,
    );

    let values = fetch_json_array(&work_item.url).await.map_err(|err| {
        import_error_status(
            format!("Failed to load {}", work_item.label),
            progress_base,
            err.as_string().unwrap_or_default(),
        )
    })?;
    let total_records = values.length() as usize;
    let chunk_size = import_chunk_size(total_records);
    let chunk_total = total_records.div_ceil(chunk_size).max(1);
    let start_chunk = start_chunk_hint.min(chunk_total.saturating_sub(1));

    for chunk_index in start_chunk..chunk_total {
        let chunk_progress = (chunk_index + 1) as f32 / chunk_total as f32;
        let progress = progress_base + (1.0 / total_files) * chunk_progress;
        set_import_progress(
            status,
            format!(
                "Importing {} ({}/{}) • chunk {}/{}",
                work_item.label,
                file_number,
                total_work_items,
                chunk_index + 1,
                chunk_total
            ),
            progress,
        );

        let start = chunk_index * chunk_size;
        let end = (start + chunk_size).min(total_records);
        let chunk = chunk_values(&values, start, end);

        if let Err(err) = dmb_idb::bulk_put(work_item.store, &chunk).await {
            return Err(import_error_status(
                format!("Import failed: {}", work_item.label),
                progress,
                format!("{err:?}"),
            ));
        }

        let chunk_number = chunk_index + 1;
        let should_persist_checkpoint = chunk_total <= CHECKPOINT_INTERVAL_CHUNKS
            || chunk_number == chunk_total
            || chunk_number.is_multiple_of(CHECKPOINT_INTERVAL_CHUNKS);
        if should_persist_checkpoint {
            persist_import_checkpoint(
                manifest_version,
                file_index,
                chunk_number,
                Some(end),
                total_work_items,
                chunk_total,
            )
            .await;
        }

        yield_to_browser_scheduler().await;
    }

    Ok(())
}

#[cfg(feature = "hydrate")]
async fn import_work_items_with_resume(
    status: RwSignal<ImportStatus>,
    manifest_version: &str,
    import_work: &[ImportWorkItem],
    resume_file_index: usize,
    resume_chunk_index: usize,
) -> Result<(), ImportStatus> {
    let total_work_items = import_work.len();
    let total_files = total_work_items.max(1) as f32;

    for (file_index, work_item) in import_work.iter().enumerate() {
        if file_index < resume_file_index {
            continue;
        }
        let start_chunk = if file_index == resume_file_index {
            resume_chunk_index
        } else {
            0
        };
        import_single_work_item(
            status,
            manifest_version,
            work_item,
            file_index,
            total_work_items,
            total_files,
            start_chunk,
        )
        .await?;
    }

    Ok(())
}

#[cfg(feature = "hydrate")]
async fn import_single_work_item_adaptive(
    status: RwSignal<ImportStatus>,
    ctx: &ImportWorkContext<'_>,
    work_item: &ImportWorkItem,
    start_chunk_hint: usize,
    start_record_offset_hint: Option<usize>,
    governor: &mut AdaptiveImportGovernor,
) -> Result<(), ImportStatus> {
    let file_number = ctx.file_index + 1;
    let progress_base = ctx.file_index as f32 / ctx.total_files;
    set_import_progress(
        status,
        format!(
            "Importing {} ({}/{})",
            work_item.label, file_number, ctx.total_work_items
        ),
        progress_base,
    );

    let values = fetch_json_array(&work_item.url).await.map_err(|err| {
        import_error_status(
            format!("Failed to load {}", work_item.label),
            progress_base,
            err.as_string().unwrap_or_default(),
        )
    })?;
    let total_records = values.length() as usize;
    if total_records == 0 {
        persist_import_checkpoint(
            ctx.manifest_version,
            ctx.file_index,
            start_chunk_hint,
            Some(0),
            ctx.total_work_items,
            0,
        )
        .await;
        return Ok(());
    }

    let mut chunk_number = start_chunk_hint;
    let mut record_offset =
        resolve_resume_record_offset(start_record_offset_hint, start_chunk_hint, total_records);
    let mut last_checkpoint_at = performance_now_ms();

    while record_offset < total_records {
        let remaining = total_records.saturating_sub(record_offset);
        let chunk_records = governor.next_chunk_records(remaining);
        let start = record_offset;
        let end = (start + chunk_records).min(total_records);
        chunk_number = chunk_number.saturating_add(1);

        let chunk = chunk_values(&values, start, end);
        let chunk_started_at = performance_now_ms();
        let write_stats = dmb_idb::bulk_put_with_options(
            work_item.store,
            &chunk,
            dmb_idb::BulkPutOptions {
                tx_batch_size: governor.tx_batch_size,
            },
        )
        .await
        .map_err(|err| {
            import_error_status(
                format!("Import failed: {}", work_item.label),
                progress_base,
                format!("{err:?}"),
            )
        })?;
        let chunk_elapsed_ms = (performance_now_ms() - chunk_started_at).max(0.0);
        let tuning_chunk_ms = chunk_elapsed_ms.max(write_stats.max_tx_ms);
        let long_task_count = crate::browser::perf::latest_inp_metrics_snapshot()
            .map(|metrics| metrics.long_frame_count)
            .unwrap_or(0);
        let tuning = governor.snapshot(tuning_chunk_ms, long_task_count);

        let chunk_progress = end as f32 / total_records as f32;
        let progress = progress_base + (1.0 / ctx.total_files) * chunk_progress;
        set_import_progress_with_tuning(
            status,
            format!(
                "Importing {} ({}/{}) • chunk {} • {} rows • {:.0}ms chunk / {:.0}ms tx ({} tx)",
                work_item.label,
                file_number,
                ctx.total_work_items,
                chunk_number,
                write_stats.inserted,
                chunk_elapsed_ms,
                write_stats.max_tx_ms,
                write_stats.transaction_count
            ),
            progress,
            Some(tuning),
        );

        let now = performance_now_ms();
        let is_last_chunk = end >= total_records;
        let should_persist_checkpoint = is_last_chunk
            || chunk_number.is_multiple_of(ADAPTIVE_CHECKPOINT_INTERVAL_CHUNKS)
            || (now - last_checkpoint_at) >= CHECKPOINT_INTERVAL_MS;

        if should_persist_checkpoint {
            persist_import_checkpoint(
                ctx.manifest_version,
                ctx.file_index,
                chunk_number,
                Some(end),
                ctx.total_work_items,
                total_records.div_ceil(governor.chunk_records.max(1)),
            )
            .await;
            last_checkpoint_at = now;
        }

        yield_to_browser_scheduler().await;

        let no_pending_interaction = !crate::browser::perf::has_recent_interaction(150.0);
        governor.update_after_chunk(tuning_chunk_ms, no_pending_interaction);
        record_offset = end;
    }

    Ok(())
}

#[cfg(feature = "hydrate")]
async fn import_work_items_with_adaptive_resume(
    status: RwSignal<ImportStatus>,
    manifest_version: &str,
    import_work: &[ImportWorkItem],
    resume_file_index: usize,
    resume_chunk_index: usize,
    resume_record_offset: Option<usize>,
) -> Result<(), ImportStatus> {
    let total_work_items = import_work.len();
    let total_files = total_work_items.max(1) as f32;
    let mut governor = AdaptiveImportGovernor::new();

    for (file_index, work_item) in import_work.iter().enumerate() {
        if file_index < resume_file_index {
            continue;
        }
        let start_chunk_hint = if file_index == resume_file_index {
            resume_chunk_index
        } else {
            0
        };
        let start_record_offset = if file_index == resume_file_index {
            resume_record_offset
        } else {
            None
        };
        let ctx = ImportWorkContext {
            manifest_version,
            file_index,
            total_work_items,
            total_files,
        };

        import_single_work_item_adaptive(
            status,
            &ctx,
            work_item,
            start_chunk_hint,
            start_record_offset,
            &mut governor,
        )
        .await?;
    }

    Ok(())
}

#[cfg(feature = "hydrate")]
async fn persist_import_completion(manifest: &DataManifest, total_work_items: usize) {
    let manifest_version = manifest.version.clone();
    let marker = ImportMarker {
        id: IMPORT_MARKER_ID.to_string(),
        manifest_version: manifest_version.clone(),
        imported_at: js_sys::Date::new_0().to_string().into(),
        record_counts: manifest.record_counts_map(),
    };
    let _ = dmb_idb::put_sync_meta(&marker).await;

    let checkpoint = ImportCheckpoint {
        id: IMPORT_CHECKPOINT_ID.to_string(),
        manifest_version,
        file_index: total_work_items,
        chunk_index: 0,
        record_offset: None,
        total_files: total_work_items,
        chunk_total: 0,
        updated_at: js_sys::Date::new_0().to_string().into(),
        completed: true,
    };
    let _ = dmb_idb::put_sync_meta(&checkpoint).await;
}

#[cfg(feature = "hydrate")]
fn integrity_failure_status(mismatches: &[IntegrityMismatch]) -> ImportStatus {
    import_error_status(
        format!("Integrity check failed for {} stores", mismatches.len()),
        1.0,
        format!("{mismatches:?}"),
    )
}

#[cfg(feature = "hydrate")]
pub async fn ensure_seed_data(status: RwSignal<ImportStatus>) {
    clear_parity_diagnostics_cache();
    set_import_progress(status, "Checking offline data…", 0.0);
    migrate_previous_version_data(status).await;

    let Some((manifest, dry_run)) = load_seed_manifest(status).await else {
        status.set(import_error_status(
            "Offline manifest missing".to_string(),
            0.0,
            "Missing /data/manifest.json".to_string(),
        ));
        return;
    };

    if check_existing_manifest_integrity(status, &manifest, dry_run.as_ref()).await {
        return;
    }

    let import_work = build_import_work_items(&manifest);
    let total_work_items = import_work.len();
    let (resume_file_index, resume_chunk_index, resume_record_offset) =
        load_resume_position(&manifest, total_work_items).await;
    let tuning_enabled = import_tuning_enabled();
    // Start perf observers lazily on first real import demand so both tuned and untuned
    // paths expose comparable responsiveness metrics.
    crate::browser::perf::ensure_perf_observers_started();

    let import_result = if tuning_enabled {
        import_work_items_with_adaptive_resume(
            status,
            &manifest.version,
            &import_work,
            resume_file_index,
            resume_chunk_index,
            resume_record_offset,
        )
        .await
    } else {
        import_work_items_with_resume(
            status,
            &manifest.version,
            &import_work,
            resume_file_index,
            resume_chunk_index,
        )
        .await
    };

    if let Err(err_status) = import_result {
        status.set(err_status);
        return;
    }

    persist_import_completion(&manifest, total_work_items).await;

    if let Some(mismatches) = verify_import_integrity(&manifest, dry_run.as_ref()).await {
        if !mismatches.is_empty() {
            status.set(integrity_failure_status(&mismatches));
            return;
        }
    }

    set_import_ready(status);
}

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone)]
struct IntegrityMismatch {
    store: String,
    expected: u64,
    actual: u64,
}

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct DryRunReport {
    #[serde(default)]
    file_counts: std::collections::HashMap<String, u64>,
}

#[cfg(feature = "hydrate")]
fn dry_run_store_counts(report: &DryRunReport) -> std::collections::HashMap<String, u64> {
    let mut store_counts = std::collections::HashMap::new();
    let chunk_specs: Vec<(&'static str, &'static str)> = IMPORT_SPECS
        .iter()
        .filter_map(|spec| spec.chunk_prefix.map(|prefix| (prefix, spec.store)))
        .collect();
    let mut chunk_totals: std::collections::HashMap<&'static str, u64> =
        std::collections::HashMap::new();

    for (name, count) in &report.file_counts {
        let Some(stem) = manifest_name_stem(name) else {
            continue;
        };
        for (prefix, store) in &chunk_specs {
            if stem.starts_with(prefix) {
                *chunk_totals.entry(*store).or_insert(0) += *count;
                break;
            }
        }
    }

    for spec in IMPORT_SPECS {
        if let Some(chunk_total) = chunk_totals.get(spec.store).copied() {
            if chunk_total > 0 {
                store_counts.insert(spec.store.to_string(), chunk_total);
                continue;
            }
        }
        if let Some(count) = report.file_counts.get(spec.file) {
            store_counts.insert(spec.store.to_string(), *count);
        }
    }
    store_counts
}

#[cfg(feature = "hydrate")]
async fn collect_integrity_mismatches_for_checks(
    checks: &[(String, u64)],
    counted: &mut HashMap<String, u64>,
    missing_stores: &HashSet<String>,
    mismatches: &mut Vec<IntegrityMismatch>,
    scope: &'static str,
) {
    for (store, expected_count) in checks {
        if missing_stores.contains(store.as_str()) {
            mismatches.push(IntegrityMismatch {
                store: store.clone(),
                expected: *expected_count,
                actual: 0,
            });
            continue;
        }

        let actual = if let Some(value) = counted.get(store.as_str()).copied() {
            value
        } else {
            match dmb_idb::count_store(store).await {
                Ok(value) => {
                    let value = value as u64;
                    counted.insert(store.clone(), value);
                    value
                }
                Err(err) => {
                    tracing::warn!(
                        store,
                        expected_count = *expected_count,
                        scope,
                        error = ?err,
                        "integrity: failed to count store; treating as mismatch"
                    );
                    mismatches.push(IntegrityMismatch {
                        store: store.clone(),
                        expected: *expected_count,
                        actual: 0,
                    });
                    continue;
                }
            }
        };

        if actual != *expected_count {
            mismatches.push(IntegrityMismatch {
                store: store.clone(),
                expected: *expected_count,
                actual,
            });
        }
    }
}

#[cfg(feature = "hydrate")]
fn import_store_lookup_by_manifest_name() -> &'static HashMap<String, &'static str> {
    static LOOKUP: OnceLock<HashMap<String, &'static str>> = OnceLock::new();
    LOOKUP.get_or_init(|| {
        IMPORT_SPECS
            .iter()
            .filter_map(|spec| normalized_manifest_name(spec.file).map(|name| (name, spec.store)))
            .collect()
    })
}

#[cfg(feature = "hydrate")]
fn build_manifest_checks(expected: HashMap<String, u64>) -> Vec<(String, u64)> {
    let stores_by_manifest_name = import_store_lookup_by_manifest_name();
    expected
        .into_iter()
        .filter_map(|(name, expected_count)| {
            stores_by_manifest_name
                .get(&name)
                .map(|store| ((*store).to_string(), expected_count))
        })
        .collect()
}

#[cfg(feature = "hydrate")]
fn dedupe_integrity_mismatches(mut mismatches: Vec<IntegrityMismatch>) -> Vec<IntegrityMismatch> {
    let mut unique = Vec::with_capacity(mismatches.len());
    for mismatch in mismatches.drain(..) {
        let already_seen = unique.iter().any(|existing: &IntegrityMismatch| {
            existing.store == mismatch.store
                && existing.expected == mismatch.expected
                && existing.actual == mismatch.actual
        });
        if !already_seen {
            unique.push(mismatch);
        }
    }
    unique
}

#[cfg(feature = "hydrate")]
async fn verify_import_integrity(
    manifest: &DataManifest,
    dry_run: Option<&DryRunReport>,
) -> Option<Vec<IntegrityMismatch>> {
    let expected = manifest.record_counts_map();
    if expected.is_empty() && dry_run.is_none() {
        return None;
    }

    let manifest_checks = build_manifest_checks(expected);

    let dry_run_checks = dry_run.map(dry_run_store_counts).unwrap_or_default();
    let dry_run_check_entries: Vec<(String, u64)> = dry_run_checks
        .iter()
        .map(|(store, count)| (store.clone(), *count))
        .collect();

    let mut stores_to_count: HashSet<&str> = manifest_checks
        .iter()
        .map(|(store, _)| store.as_str())
        .collect();
    stores_to_count.extend(
        dry_run_check_entries
            .iter()
            .map(|(store, _)| store.as_str()),
    );

    let mut counted: HashMap<String, u64> = HashMap::new();
    let mut missing_stores: HashSet<String> = HashSet::new();
    if !stores_to_count.is_empty() {
        let store_refs: Vec<&str> = stores_to_count.into_iter().collect();
        match dmb_idb::count_stores_with_missing(&store_refs).await {
            Ok((entries, missing)) => {
                for (store, count) in entries {
                    counted.insert(store, count as u64);
                }
                missing_stores.extend(missing);
            }
            Err(err) => {
                tracing::warn!(
                    error = ?err,
                    "integrity: batched store counting failed; falling back to per-store counts"
                );
            }
        }
    }

    let mut mismatches = Vec::new();
    collect_integrity_mismatches_for_checks(
        &manifest_checks,
        &mut counted,
        &missing_stores,
        &mut mismatches,
        "manifest",
    )
    .await;
    collect_integrity_mismatches_for_checks(
        &dry_run_check_entries,
        &mut counted,
        &missing_stores,
        &mut mismatches,
        "dry-run",
    )
    .await;

    Some(dedupe_integrity_mismatches(mismatches))
}

#[cfg(not(feature = "hydrate"))]
#[allow(clippy::unused_async)]
pub async fn ensure_seed_data(_status: RwSignal<ImportStatus>) {}

#[cfg(feature = "hydrate")]
pub fn current_import_tuning_enabled() -> bool {
    import_tuning_enabled()
}

#[cfg(not(feature = "hydrate"))]
pub fn current_import_tuning_enabled() -> bool {
    false
}

#[cfg(feature = "hydrate")]
pub async fn estimate_storage() -> Option<StorageInfo> {
    let (usage, quota) = crate::browser::storage::estimate_usage_quota().await?;
    Some(StorageInfo { usage, quota })
}

#[cfg(feature = "hydrate")]
pub async fn handle_storage_pressure() -> Option<bool> {
    let info = estimate_storage().await?;
    let usage = info.usage.unwrap_or(0.0);
    let quota = info.quota.unwrap_or(0.0);
    if quota <= 0.0 {
        return Some(false);
    }
    let ratio = usage / quota;
    if ratio < STORAGE_PRESSURE_THRESHOLD {
        return Some(false);
    }

    let _ = crate::browser::service_worker::delete_paths_from_data_caches(&AI_CACHE_PATHS).await;

    let _ = dmb_idb::delete_ann_index("default").await;
    Some(true)
}

#[cfg(not(feature = "hydrate"))]
#[allow(clippy::unused_async)]
pub async fn estimate_storage() -> Option<StorageInfo> {
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn manifest_diff_reports_deltas() {
        let mut previous = HashMap::new();
        previous.insert("songs".to_string(), 10);
        previous.insert("shows".to_string(), 5);
        let mut next = HashMap::new();
        next.insert("songs".to_string(), 12);
        next.insert("shows".to_string(), 5);
        next.insert("venues".to_string(), 2);

        let diff = compute_manifest_diff(&previous, &next);
        assert_eq!(diff.len(), 2);
        let songs = diff.iter().find(|d| d.name == "songs").unwrap();
        assert_eq!(songs.before, 10);
        assert_eq!(songs.after, 12);
        assert_eq!(songs.delta, 2);
        let venues = diff.iter().find(|d| d.name == "venues").unwrap();
        assert_eq!(venues.before, 0);
        assert_eq!(venues.after, 2);
        assert_eq!(venues.delta, 2);
    }

    #[test]
    fn integrity_report_default_empty() {
        let report = IntegrityReport::default();
        assert_eq!(report.total_mismatches, 0);
        assert!(report.mismatches.is_empty());
    }

    #[test]
    fn sqlite_parity_report_default_empty() {
        let report = SqliteParityReport::default();
        assert!(!report.available);
        assert_eq!(report.total_mismatches, 0);
        assert!(report.mismatches.is_empty());
    }

    #[cfg(feature = "hydrate")]
    #[test]
    fn adaptive_governor_reduces_on_slow_chunks() {
        let mut governor = AdaptiveImportGovernor::new();
        governor.update_after_chunk(ADAPTIVE_SLOW_CHUNK_MS + 5.0, true);
        assert!(governor.chunk_records < ADAPTIVE_CHUNK_RECORDS_START);
        assert!(governor.tx_batch_size < ADAPTIVE_TX_BATCH_START);
    }

    #[cfg(feature = "hydrate")]
    #[test]
    fn adaptive_governor_increases_after_fast_streak_without_pending_interaction() {
        let mut governor = AdaptiveImportGovernor::new();
        for _ in 0..ADAPTIVE_FAST_STREAK_REQUIRED {
            governor.update_after_chunk(ADAPTIVE_FAST_CHUNK_MS - 5.0, true);
        }
        assert!(governor.chunk_records > ADAPTIVE_CHUNK_RECORDS_START);
        assert!(governor.tx_batch_size > ADAPTIVE_TX_BATCH_START);
    }

    #[cfg(feature = "hydrate")]
    #[test]
    fn adaptive_governor_does_not_increase_when_interaction_pending() {
        let mut governor = AdaptiveImportGovernor::new();
        for _ in 0..(ADAPTIVE_FAST_STREAK_REQUIRED + 1) {
            governor.update_after_chunk(ADAPTIVE_FAST_CHUNK_MS - 5.0, false);
        }
        assert_eq!(governor.chunk_records, ADAPTIVE_CHUNK_RECORDS_START);
        assert_eq!(governor.tx_batch_size, ADAPTIVE_TX_BATCH_START);
    }

    #[cfg(feature = "hydrate")]
    #[test]
    fn adaptive_governor_state_can_carry_across_work_items() {
        let mut governor = AdaptiveImportGovernor::new();
        governor.update_after_chunk(ADAPTIVE_SLOW_CHUNK_MS + 10.0, true);
        let tuned_chunk_records = governor.chunk_records;
        let tuned_tx_batch = governor.tx_batch_size;

        // Reusing the same governor for the next file keeps tuned values.
        let _ = governor.next_chunk_records(1_000);
        assert_eq!(governor.chunk_records, tuned_chunk_records);
        assert_eq!(governor.tx_batch_size, tuned_tx_batch);
    }

    #[cfg(feature = "hydrate")]
    #[test]
    fn resolve_resume_record_offset_prefers_persisted_offset() {
        let resolved = resolve_resume_record_offset(Some(321), 9, 10_000);
        assert_eq!(resolved, 321);
    }

    #[cfg(feature = "hydrate")]
    #[test]
    fn resolve_resume_record_offset_falls_back_to_chunk_hint_when_offset_missing() {
        let resolved = resolve_resume_record_offset(None, 3, 10_000);
        assert_eq!(resolved, ADAPTIVE_CHUNK_RECORDS_START * 3);
    }

    #[cfg(feature = "hydrate")]
    #[test]
    fn resolve_resume_record_offset_clamps_to_total_records() {
        let resolved = resolve_resume_record_offset(Some(9_999), 1, 500);
        assert_eq!(resolved, 500);
    }

    #[cfg(feature = "hydrate")]
    #[test]
    fn record_counts_prefers_setlist_single_file_over_chunks() {
        let manifest = DataManifest {
            version: "2026-02-04".to_string(),
            record_counts: HashMap::new(),
            files: vec![
                ManifestFile {
                    name: "setlist-entries.json".to_string(),
                    count: Some(3),
                },
                ManifestFile {
                    name: "setlist-entries-chunk-0001.json".to_string(),
                    count: Some(4),
                },
                ManifestFile {
                    name: "setlist-entries-chunk-0002.json".to_string(),
                    count: Some(5),
                },
                ManifestFile {
                    name: "songs.json".to_string(),
                    count: Some(2),
                },
            ],
        };

        let counts = manifest.record_counts_map();
        assert_eq!(counts.get("setlist-entries"), Some(&3));
        assert_eq!(counts.get("songs"), Some(&2));
    }

    #[cfg(feature = "hydrate")]
    #[test]
    fn record_counts_uses_setlist_chunk_sum_when_single_file_missing() {
        let manifest = DataManifest {
            version: "2026-02-04".to_string(),
            record_counts: HashMap::new(),
            files: vec![
                ManifestFile {
                    name: "setlist-entries-chunk-0001.json".to_string(),
                    count: Some(4),
                },
                ManifestFile {
                    name: "setlist-entries-chunk-0002.json".to_string(),
                    count: Some(5),
                },
            ],
        };

        let counts = manifest.record_counts_map();
        assert_eq!(counts.get("setlist-entries"), Some(&9));
    }
}
