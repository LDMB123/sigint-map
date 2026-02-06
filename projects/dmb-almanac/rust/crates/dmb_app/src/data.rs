#[cfg(feature = "hydrate")]
use std::collections::HashMap;

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
    #[allow(dead_code)]
    #[serde(
        default,
        alias = "generatedAt",
        alias = "timestamp",
        alias = "generated_at"
    )]
    generated_at: Option<String>,
    #[serde(default, alias = "recordCounts")]
    record_counts: HashMap<String, u64>,
    #[serde(default)]
    files: Vec<ManifestFile>,
}

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, Deserialize)]
struct ManifestFile {
    #[allow(dead_code)]
    name: String,
    #[allow(dead_code)]
    size: Option<u64>,
    #[allow(dead_code)]
    checksum: Option<String>,
    #[allow(dead_code)]
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
pub async fn fetch_integrity_report() -> Option<IntegrityReport> {
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
pub async fn fetch_sqlite_parity_report() -> Option<SqliteParityReport> {
    let response = fetch_json::<SqliteParityResponse>("/api/data-parity").await?;
    if !response.available {
        return Some(SqliteParityReport {
            available: false,
            total_mismatches: 0,
            mismatches: Vec::new(),
            missing_tables: response.missing_tables,
        });
    }

    let mapping: &[(&str, &str)] = &[
        (TABLE_VENUES, "venues"),
        (TABLE_SONGS, "songs"),
        (TABLE_TOURS, "tours"),
        (TABLE_SHOWS, "shows"),
        (TABLE_SETLIST_ENTRIES, "setlist_entries"),
        (TABLE_GUESTS, "guests"),
        (TABLE_GUEST_APPEARANCES, "guest_appearances"),
        (TABLE_LIBERATION_LIST, "liberation_list"),
        (TABLE_SONG_STATS, "song_statistics"),
        (TABLE_RELEASES, "releases"),
        (TABLE_RELEASE_TRACKS, "release_tracks"),
        (TABLE_CURATED_LISTS, "curated_lists"),
        (TABLE_CURATED_LIST_ITEMS, "curated_list_items"),
    ];

    let mut mismatches = Vec::new();
    for (store, table) in mapping {
        let idb_count = dmb_idb::count_store(store).await.ok().unwrap_or(0) as u64;
        let sqlite_count = response.counts.get(*table).copied().unwrap_or(0);
        if idb_count != sqlite_count {
            mismatches.push(SqliteParityEntry {
                store: store.to_string(),
                sqlite_table: table.to_string(),
                idb_count,
                sqlite_count,
            });
        }
    }

    let total_mismatches = mismatches.len();
    Some(SqliteParityReport {
        available: true,
        total_mismatches,
        mismatches,
        missing_tables: response.missing_tables,
    })
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

    update("Checking legacy data…".to_string(), 0.0);
    match dmb_idb::migrate_legacy_db().await {
        Ok(true) => {
            update("Migrated legacy data".to_string(), 0.05);
        }
        Ok(false) => {}
        Err(err) => {
            update(
                "Legacy migration failed; proceeding with fresh import".to_string(),
                0.05,
            );
            web_sys::console::warn_1(&JsValue::from_str(&format!(
                "legacy migration failed: {err:?}"
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
async fn verify_import_integrity(
    manifest: &DataManifest,
    dry_run: Option<&DryRunReport>,
) -> Option<Vec<IntegrityMismatch>> {
    let expected = manifest.record_counts_map();
    if expected.is_empty() && dry_run.is_none() {
        return None;
    }
    let mut mismatches = Vec::new();
    for (name, expected_count) in expected {
        let store = IMPORT_SPECS.iter().find_map(|spec| {
            let normalized = normalized_manifest_name(spec.file)?;
            if normalized == name {
                Some(spec.store)
            } else {
                None
            }
        });
        let Some(store) = store else {
            continue;
        };
        let actual = match dmb_idb::count_store(store).await.ok() {
            Some(value) => value as u64,
            None => continue,
        };
        if actual != expected_count {
            mismatches.push(IntegrityMismatch {
                store: store.to_string(),
                expected: expected_count,
                actual,
            });
        }
    }
    if let Some(report) = dry_run {
        let counts = dry_run_store_counts(report);
        for (store, expected_count) in counts {
            let actual = match dmb_idb::count_store(&store).await.ok() {
                Some(value) => value as u64,
                None => continue,
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
    if mismatches.is_empty() {
        None
    } else {
        Some(mismatches)
    }
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
