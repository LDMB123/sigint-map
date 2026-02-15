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
        for file in &self.files {
            let Some(count) = file.count else { continue };
            let Some(name) = normalized_manifest_name(&file.name) else {
                continue;
            };
            counts.insert(name, count);
        }
        counts
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
pub async fn fetch_sqlite_parity_report() -> Option<SqliteParityReport> {
    None
}

#[cfg(feature = "hydrate")]
fn normalized_manifest_name(name: &str) -> Option<String> {
    let trimmed = name
        .strip_suffix(".json.br")
        .or_else(|| name.strip_suffix(".json.gz"))
        .or_else(|| name.strip_suffix(".json"))?;
    Some(trimmed.to_string())
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
}

#[cfg(feature = "hydrate")]
const IMPORT_MARKER_ID: &str = "data_import_v1";
#[cfg(feature = "hydrate")]
const IMPORT_CHECKPOINT_ID: &str = "data_import_checkpoint_v1";
#[cfg(feature = "hydrate")]
const CHUNK_SIZE: usize = 1000;
pub const STORAGE_PRESSURE_THRESHOLD: f64 = 0.85;
#[cfg(feature = "hydrate")]
const AI_CACHE_PATHS: [&str; 4] = [
    "/data/ann-index.bin",
    "/data/ann-index.json",
    "/data/ann-index.ivf.json",
    "/data/embedding-manifest.json",
];

#[cfg(feature = "hydrate")]
const IMPORT_SPECS: &[ImportSpec] = &[
    ImportSpec {
        file: "venues.json",
        store: TABLE_VENUES,
    },
    ImportSpec {
        file: "songs.json",
        store: TABLE_SONGS,
    },
    ImportSpec {
        file: "tours.json",
        store: TABLE_TOURS,
    },
    ImportSpec {
        file: "shows.json",
        store: TABLE_SHOWS,
    },
    ImportSpec {
        file: "setlist-entries.json",
        store: TABLE_SETLIST_ENTRIES,
    },
    ImportSpec {
        file: "guests.json",
        store: TABLE_GUESTS,
    },
    ImportSpec {
        file: "guest-appearances.json",
        store: TABLE_GUEST_APPEARANCES,
    },
    ImportSpec {
        file: "liberation-list.json",
        store: TABLE_LIBERATION_LIST,
    },
    ImportSpec {
        file: "song-statistics.json",
        store: TABLE_SONG_STATS,
    },
    ImportSpec {
        file: "releases.json",
        store: TABLE_RELEASES,
    },
    ImportSpec {
        file: "release-tracks.json",
        store: TABLE_RELEASE_TRACKS,
    },
    ImportSpec {
        file: "curated-lists.json",
        store: TABLE_CURATED_LISTS,
    },
    ImportSpec {
        file: "curated-list-items.json",
        store: TABLE_CURATED_LIST_ITEMS,
    },
];

#[cfg(feature = "hydrate")]
pub async fn ensure_seed_data(status: RwSignal<ImportStatus>) {
    use js_sys::{Date, Promise};
    use wasm_bindgen::JsValue;
    use wasm_bindgen_futures::JsFuture;

    clear_sqlite_parity_cache();
    clear_integrity_report_cache();

    let update = |message: String, progress: f32| {
        status.set(ImportStatus {
            message,
            progress: progress.clamp(0.0, 1.0),
            done: false,
            error: None,
            can_reset: false,
        });
    };

    update("Checking offline data…".to_string(), 0.0);

    update("Checking previous-version data…".to_string(), 0.0);
    match dmb_idb::migrate_previous_db().await {
        Ok(true) => {
            update("Migrated previous-version data".to_string(), 0.05);
        }
        Ok(false) => {}
        Err(err) => {
            update(
                "Previous-version migration failed; proceeding with fresh import".to_string(),
                0.05,
            );
            web_sys::console::warn_1(&JsValue::from_str(&format!(
                "previous-version migration failed: {err:?}"
            )));
        }
    }

    let manifest = match fetch_json::<DataManifest>("/data/manifest.json").await {
        Some(manifest) => manifest,
        None => {
            status.set(ImportStatus {
                message: "Offline manifest missing".to_string(),
                progress: 0.0,
                done: false,
                error: Some("Missing /data/manifest.json".to_string()),
                can_reset: true,
            });
            return;
        }
    };
    let dry_run = fetch_json::<DryRunReport>("/data/idb-migration-dry-run.json").await;

    if let Ok(Some(marker)) = dmb_idb::get_sync_meta::<ImportMarker>(IMPORT_MARKER_ID).await {
        if marker.manifest_version == manifest.version {
            if let Some(mismatches) = verify_import_integrity(&manifest, dry_run.as_ref()).await {
                if mismatches.is_empty() {
                    status.set(ImportStatus {
                        message: "Offline data ready".to_string(),
                        progress: 1.0,
                        done: true,
                        error: None,
                        can_reset: false,
                    });
                    return;
                }

                // Auto-repair: this typically means the IDB schema drifted (missing stores)
                // or the previous import was interrupted. Clear seed stores and re-import.
                tracing::warn!(
                    mismatch_count = mismatches.len(),
                    "integrity check failed for current manifest; clearing seed stores and reimporting"
                );
                update(
                    "Offline data integrity check failed; repairing…".to_string(),
                    0.02,
                );
                for spec in IMPORT_SPECS {
                    if let Err(err) = dmb_idb::clear_store(spec.store).await {
                        tracing::warn!(store = spec.store, error = ?err, "failed to clear store during repair");
                    }
                }
                let _ = dmb_idb::delete_sync_meta(IMPORT_MARKER_ID).await;
                let _ = dmb_idb::delete_sync_meta(IMPORT_CHECKPOINT_ID).await;
                // Proceed into the normal import loop.
            } else {
                status.set(ImportStatus {
                    message: "Offline data ready".to_string(),
                    progress: 1.0,
                    done: true,
                    error: None,
                    can_reset: false,
                });
                return;
            }
        }
    }

    let total_files = IMPORT_SPECS.len().max(1) as f32;
    let mut resume_file_index = 0usize;
    let mut resume_chunk_index = 0usize;
    if let Ok(Some(checkpoint)) =
        dmb_idb::get_sync_meta::<ImportCheckpoint>(IMPORT_CHECKPOINT_ID).await
    {
        if checkpoint.manifest_version == manifest.version && !checkpoint.completed {
            resume_file_index = checkpoint.file_index.min(IMPORT_SPECS.len());
            resume_chunk_index = checkpoint.chunk_index;
        }
    }

    for (file_index, spec) in IMPORT_SPECS.iter().enumerate() {
        if file_index < resume_file_index {
            continue;
        }
        let file_number = file_index + 1;
        let progress_base = file_index as f32 / total_files;
        update(
            format!(
                "Importing {} ({}/{})",
                spec.file,
                file_number,
                IMPORT_SPECS.len()
            ),
            progress_base,
        );

        let url = format!("/data/{}", spec.file);
        let values = match fetch_json_array(&url).await {
            Ok(values) => values,
            Err(err) => {
                status.set(ImportStatus {
                    message: format!("Failed to load {}", spec.file),
                    progress: progress_base,
                    done: false,
                    error: Some(err.as_string().unwrap_or_default()),
                    can_reset: true,
                });
                return;
            }
        };

        let total_records = values.length() as usize;
        let chunk_total = (total_records + CHUNK_SIZE - 1).max(1) / CHUNK_SIZE;
        let start_chunk = if file_index == resume_file_index {
            resume_chunk_index.min(chunk_total.saturating_sub(1))
        } else {
            0
        };

        for chunk_index in start_chunk..chunk_total {
            let chunk_progress = (chunk_index + 1) as f32 / chunk_total as f32;
            let progress = progress_base + (1.0 / total_files) * chunk_progress;
            update(
                format!(
                    "Importing {} ({}/{}) • chunk {}/{}",
                    spec.file,
                    file_number,
                    IMPORT_SPECS.len(),
                    chunk_index + 1,
                    chunk_total
                ),
                progress,
            );

            let start = chunk_index * CHUNK_SIZE;
            let end = (start + CHUNK_SIZE).min(total_records);
            let mut chunk: Vec<JsValue> = Vec::with_capacity(end.saturating_sub(start));
            for idx in start..end {
                chunk.push(values.get(idx as u32));
            }

            if let Err(err) = dmb_idb::bulk_put(spec.store, &chunk).await {
                status.set(ImportStatus {
                    message: format!("Import failed: {}", spec.file),
                    progress,
                    done: false,
                    error: Some(format!("{err:?}")),
                    can_reset: true,
                });
                return;
            }

            let checkpoint = ImportCheckpoint {
                id: IMPORT_CHECKPOINT_ID.to_string(),
                manifest_version: manifest.version.clone(),
                file_index,
                chunk_index: chunk_index + 1,
                total_files: IMPORT_SPECS.len(),
                chunk_total,
                updated_at: Date::new_0().to_string().into(),
                completed: false,
            };
            let _ = dmb_idb::put_sync_meta(&checkpoint).await;

            let _ = JsFuture::from(Promise::resolve(&JsValue::NULL)).await;
        }
    }

    let manifest_version = manifest.version.clone();
    let marker = ImportMarker {
        id: IMPORT_MARKER_ID.to_string(),
        manifest_version: manifest_version.clone(),
        imported_at: Date::new_0().to_string().into(),
        record_counts: manifest.record_counts_map(),
    };

    let _ = dmb_idb::put_sync_meta(&marker).await;
    let checkpoint = ImportCheckpoint {
        id: IMPORT_CHECKPOINT_ID.to_string(),
        manifest_version,
        file_index: IMPORT_SPECS.len(),
        chunk_index: 0,
        total_files: IMPORT_SPECS.len(),
        chunk_total: 0,
        updated_at: Date::new_0().to_string().into(),
        completed: true,
    };
    let _ = dmb_idb::put_sync_meta(&checkpoint).await;

    if let Some(mismatches) = verify_import_integrity(&manifest, dry_run.as_ref()).await {
        if !mismatches.is_empty() {
            let summary = format!("Integrity check failed for {} stores", mismatches.len());
            status.set(ImportStatus {
                message: summary,
                progress: 1.0,
                done: false,
                error: Some(format!("{mismatches:?}")),
                can_reset: true,
            });
            return;
        }
    }

    status.set(ImportStatus {
        message: "Offline data ready".to_string(),
        progress: 1.0,
        done: true,
        error: None,
        can_reset: false,
    });
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
pub async fn ensure_seed_data(_status: RwSignal<ImportStatus>) {}

#[cfg(feature = "hydrate")]
pub async fn estimate_storage() -> Option<StorageInfo> {
    use js_sys::Reflect;
    use wasm_bindgen::JsValue;
    use wasm_bindgen_futures::JsFuture;

    let window = web_sys::window()?;
    let manager = window.navigator().storage();
    let estimate = JsFuture::from(manager.estimate().ok()?).await.ok()?;
    let usage = Reflect::get(&estimate, &JsValue::from_str("usage"))
        .ok()
        .and_then(|v| v.as_f64());
    let quota = Reflect::get(&estimate, &JsValue::from_str("quota"))
        .ok()
        .and_then(|v| v.as_f64());
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
}
