#[cfg(feature = "hydrate")]
use std::cell::RefCell;
#[cfg(feature = "hydrate")]
use std::collections::{HashMap, HashSet};

use leptos::prelude::RwSignal;
#[cfg(feature = "hydrate")]
use leptos::prelude::Set;
#[cfg(feature = "hydrate")]
use serde::{Deserialize, Serialize};
#[cfg(feature = "hydrate")]
use wasm_bindgen::JsCast;
#[cfg(feature = "hydrate")]
use wasm_bindgen_futures::JsFuture;

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
#[cfg(feature = "hydrate")]
use web_sys::Response;

#[derive(Clone, Debug, Default)]
pub struct ImportStatus {
    pub message: String,
    pub progress: f32,
    pub done: bool,
    pub error: Option<String>,
    pub can_reset: bool,
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

#[cfg(feature = "hydrate")]
#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StorageEstimateValue {
    #[serde(default)]
    usage: Option<f64>,
    #[serde(default)]
    quota: Option<f64>,
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
    let window = web_sys::window()?;
    let resp_value = JsFuture::from(window.fetch_with_str(url)).await.ok()?;
    let resp: Response = resp_value.dyn_into().ok()?;
    if !resp.ok() {
        return None;
    }
    let json = JsFuture::from(resp.json().ok()?).await.ok()?;
    serde_wasm_bindgen::from_value(json).ok()
}

#[cfg(feature = "hydrate")]
async fn fetch_json_array(url: &str) -> Result<Array, JsValue> {
    let window = web_sys::window().ok_or_else(|| JsValue::from_str("window missing"))?;
    let resp_value = JsFuture::from(window.fetch_with_str(url)).await?;
    let resp: Response = resp_value
        .dyn_into()
        .map_err(|_| JsValue::from_str("bad response"))?;
    if !resp.ok() {
        return Err(JsValue::from_str(&format!(
            "fetch failed: {}",
            resp.status()
        )));
    }
    let json = JsFuture::from(resp.json()?).await?;
    Ok(Array::from(&json))
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
const INTEGRITY_REPORT_CACHE_TTL_MS: f64 = 10_000.0;

#[cfg(feature = "hydrate")]
thread_local! {
    static INTEGRITY_REPORT_CACHE: RefCell<Option<(f64, IntegrityReport)>> = const { RefCell::new(None) };
}

#[cfg(feature = "hydrate")]
fn read_integrity_report_cache() -> Option<IntegrityReport> {
    let now = js_sys::Date::now();
    INTEGRITY_REPORT_CACHE.with(|cache| {
        let cached = cache.borrow();
        let (timestamp_ms, report) = cached.as_ref()?;
        if now - *timestamp_ms <= INTEGRITY_REPORT_CACHE_TTL_MS {
            Some(report.clone())
        } else {
            None
        }
    })
}

#[cfg(feature = "hydrate")]
fn write_integrity_report_cache(report: &IntegrityReport) {
    INTEGRITY_REPORT_CACHE.with(|cache| {
        *cache.borrow_mut() = Some((js_sys::Date::now(), report.clone()));
    });
}

#[cfg(feature = "hydrate")]
fn clear_integrity_report_cache() {
    INTEGRITY_REPORT_CACHE.with(|cache| {
        *cache.borrow_mut() = None;
    });
}

#[cfg(feature = "hydrate")]
pub async fn fetch_integrity_report() -> Option<IntegrityReport> {
    if let Some(cached) = read_integrity_report_cache() {
        return Some(cached);
    }

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
    let report = IntegrityReport {
        total_mismatches,
        mismatches: entries,
    };
    write_integrity_report_cache(&report);
    Some(report)
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
const SQLITE_PARITY_CACHE_TTL_MS: f64 = 10_000.0;

#[cfg(feature = "hydrate")]
thread_local! {
    static SQLITE_PARITY_CACHE: RefCell<Option<(f64, SqliteParityReport)>> = const { RefCell::new(None) };
}

#[cfg(feature = "hydrate")]
fn read_sqlite_parity_cache() -> Option<SqliteParityReport> {
    let now = js_sys::Date::now();
    SQLITE_PARITY_CACHE.with(|cache| {
        let cached = cache.borrow();
        let (timestamp_ms, report) = cached.as_ref()?;
        if now - *timestamp_ms <= SQLITE_PARITY_CACHE_TTL_MS {
            Some(report.clone())
        } else {
            None
        }
    })
}

#[cfg(feature = "hydrate")]
fn write_sqlite_parity_cache(report: &SqliteParityReport) {
    SQLITE_PARITY_CACHE.with(|cache| {
        *cache.borrow_mut() = Some((js_sys::Date::now(), report.clone()));
    });
}

#[cfg(feature = "hydrate")]
fn clear_sqlite_parity_cache() {
    SQLITE_PARITY_CACHE.with(|cache| {
        *cache.borrow_mut() = None;
    });
}

#[cfg(feature = "hydrate")]
pub async fn fetch_sqlite_parity_report() -> Option<SqliteParityReport> {
    if let Some(cached) = read_sqlite_parity_cache() {
        return Some(cached);
    }

    let response = fetch_json::<SqliteParityResponse>("/api/data-parity").await?;
    if !response.available {
        let report = SqliteParityReport {
            available: false,
            total_mismatches: 0,
            mismatches: Vec::new(),
            missing_tables: response.missing_tables,
            idb_count_failures: Vec::new(),
        };
        write_sqlite_parity_cache(&report);
        return Some(report);
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
    let report = SqliteParityReport {
        available: true,
        total_mismatches,
        mismatches,
        missing_tables: response.missing_tables,
        idb_count_failures,
    };
    write_sqlite_parity_cache(&report);
    Some(report)
}

#[cfg(not(feature = "hydrate"))]
#[allow(clippy::unused_async)]
pub async fn fetch_sqlite_parity_report() -> Option<SqliteParityReport> {
    None
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
const IMPORT_MARKER_ID: &str = "data_import_v1";
#[cfg(feature = "hydrate")]
const IMPORT_CHECKPOINT_ID: &str = "data_import_checkpoint_v1";
#[cfg(feature = "hydrate")]
const SETLIST_CHUNK_PREFIX: &str = "setlist-entries-chunk-";
#[cfg(feature = "hydrate")]
const DEFAULT_IMPORT_CHUNK_SIZE: usize = 1000;
#[cfg(feature = "hydrate")]
const LARGE_IMPORT_CHUNK_SIZE: usize = 10_000;
#[cfg(feature = "hydrate")]
const LARGE_IMPORT_RECORD_THRESHOLD: usize = 20_000;
#[cfg(feature = "hydrate")]
const CHECKPOINT_INTERVAL_CHUNKS: usize = 4;
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
    let mut items = Vec::new();
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
    status.set(ImportStatus {
        message: message.into(),
        progress: progress.clamp(0.0, 1.0),
        done: false,
        error: None,
        can_reset: false,
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
async fn load_resume_position(manifest: &DataManifest, total_work_items: usize) -> (usize, usize) {
    let Ok(Some(checkpoint)) =
        dmb_idb::get_sync_meta::<ImportCheckpoint>(IMPORT_CHECKPOINT_ID).await
    else {
        return (0, 0);
    };
    if checkpoint.manifest_version != manifest.version || checkpoint.completed {
        return (0, 0);
    }
    (
        checkpoint.file_index.min(total_work_items),
        checkpoint.chunk_index,
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
async fn persist_import_checkpoint(
    manifest_version: &str,
    file_index: usize,
    chunk_number: usize,
    total_work_items: usize,
    chunk_total: usize,
) {
    let checkpoint = ImportCheckpoint {
        id: IMPORT_CHECKPOINT_ID.to_string(),
        manifest_version: manifest_version.to_string(),
        file_index,
        chunk_index: chunk_number,
        total_files: total_work_items,
        chunk_total,
        updated_at: js_sys::Date::new_0().to_string().into(),
        completed: false,
    };
    let _ = dmb_idb::put_sync_meta(&checkpoint).await;
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
            || chunk_number % CHECKPOINT_INTERVAL_CHUNKS == 0;
        if should_persist_checkpoint {
            persist_import_checkpoint(
                manifest_version,
                file_index,
                chunk_number,
                total_work_items,
                chunk_total,
            )
            .await;
        }

        let _ = JsFuture::from(js_sys::Promise::resolve(&JsValue::NULL)).await;
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
    clear_sqlite_parity_cache();
    clear_integrity_report_cache();
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
    let (resume_file_index, resume_chunk_index) =
        load_resume_position(&manifest, total_work_items).await;

    if let Err(err_status) = import_work_items_with_resume(
        status,
        &manifest.version,
        &import_work,
        resume_file_index,
        resume_chunk_index,
    )
    .await
    {
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
    for spec in IMPORT_SPECS {
        if let Some(prefix) = spec.chunk_prefix {
            let chunk_total = report
                .file_counts
                .iter()
                .filter_map(|(name, count)| {
                    let stem = manifest_name_stem(name)?;
                    if stem.starts_with(prefix) {
                        Some(*count)
                    } else {
                        None
                    }
                })
                .sum::<u64>();
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
    checks: Vec<(String, u64)>,
    counted: &mut HashMap<String, u64>,
    missing_stores: &HashSet<String>,
    mismatches: &mut Vec<IntegrityMismatch>,
    scope: &'static str,
) {
    for (store, expected_count) in checks {
        if missing_stores.contains(&store) {
            mismatches.push(IntegrityMismatch {
                store,
                expected: expected_count,
                actual: 0,
            });
            continue;
        }

        let actual = if let Some(value) = counted.get(&store).copied() {
            value
        } else {
            match dmb_idb::count_store(&store).await {
                Ok(value) => {
                    let value = value as u64;
                    counted.insert(store.clone(), value);
                    value
                }
                Err(err) => {
                    tracing::warn!(
                        store,
                        expected_count,
                        scope,
                        error = ?err,
                        "integrity: failed to count store; treating as mismatch"
                    );
                    mismatches.push(IntegrityMismatch {
                        store,
                        expected: expected_count,
                        actual: 0,
                    });
                    continue;
                }
            }
        };

        if actual != expected_count {
            mismatches.push(IntegrityMismatch {
                store,
                expected: expected_count,
                actual,
            });
        }
    }
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

    let mut manifest_checks: Vec<(String, u64)> = Vec::new();
    for (name, expected_count) in expected {
        let store = IMPORT_SPECS.iter().find_map(|spec| {
            let normalized = normalized_manifest_name(spec.file)?;
            if normalized == name {
                Some(spec.store)
            } else {
                None
            }
        });
        if let Some(store) = store {
            manifest_checks.push((store.to_string(), expected_count));
        }
    }

    let dry_run_checks = dry_run.map(dry_run_store_counts).unwrap_or_default();
    let dry_run_check_entries: Vec<(String, u64)> = dry_run_checks
        .iter()
        .map(|(store, count)| (store.clone(), *count))
        .collect();

    let mut stores_to_count: Vec<String> = manifest_checks
        .iter()
        .map(|(store, _)| store.clone())
        .collect();
    stores_to_count.extend(dry_run_check_entries.iter().map(|(store, _)| store.clone()));
    stores_to_count.sort_unstable();
    stores_to_count.dedup();

    let mut counted: HashMap<String, u64> = HashMap::new();
    let mut missing_stores: HashSet<String> = HashSet::new();
    if !stores_to_count.is_empty() {
        let store_refs: Vec<&str> = stores_to_count.iter().map(|store| store.as_str()).collect();
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
        manifest_checks,
        &mut counted,
        &missing_stores,
        &mut mismatches,
        "manifest",
    )
    .await;
    collect_integrity_mismatches_for_checks(
        dry_run_check_entries,
        &mut counted,
        &missing_stores,
        &mut mismatches,
        "dry-run",
    )
    .await;

    if mismatches.len() > 1 {
        let mut seen: HashSet<(String, u64, u64)> = HashSet::new();
        mismatches.retain(|entry| seen.insert((entry.store.clone(), entry.expected, entry.actual)));
    }

    Some(mismatches)
}

#[cfg(not(feature = "hydrate"))]
#[allow(clippy::unused_async)]
pub async fn ensure_seed_data(_status: RwSignal<ImportStatus>) {}

#[cfg(feature = "hydrate")]
pub async fn estimate_storage() -> Option<StorageInfo> {
    let window = web_sys::window()?;
    let manager = window.navigator().storage();
    let estimate = JsFuture::from(manager.estimate().ok()?).await.ok()?;
    let parsed = serde_wasm_bindgen::from_value::<StorageEstimateValue>(estimate).ok()?;
    Some(StorageInfo {
        usage: parsed.usage,
        quota: parsed.quota,
    })
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

    if let Some(window) = web_sys::window() {
        if let Ok(cache_storage) = window.caches() {
            if let Ok(keys) = JsFuture::from(cache_storage.keys()).await {
                let keys: js_sys::Array = keys.dyn_into().unwrap_or_default();
                for key in keys.iter() {
                    let Some(name) = key.as_string() else {
                        continue;
                    };
                    if !name.contains("-data-") {
                        continue;
                    }
                    if let Ok(cache_val) = JsFuture::from(cache_storage.open(&name)).await {
                        if let Ok(cache) = cache_val.dyn_into::<web_sys::Cache>() {
                            for path in AI_CACHE_PATHS {
                                let _ = JsFuture::from(cache.delete_with_str(path)).await;
                            }
                        }
                    }
                }
            }
        }
    }

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
