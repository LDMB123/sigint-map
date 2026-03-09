use dmb_core::SETLIST_CHUNK_PREFIX;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[path = "artifact_manifest.rs"]
mod artifact_manifest;
#[path = "artifact_migration.rs"]
mod artifact_migration;

#[derive(Debug, Deserialize, Serialize)]
pub(crate) struct DataManifest {
    pub(crate) version: String,
    pub(crate) generated_at: String,
    pub(crate) files: Vec<DataFile>,
}

#[derive(Debug, Deserialize, Serialize)]
pub(crate) struct DataFile {
    pub(crate) name: String,
    pub(crate) size: u64,
    pub(crate) checksum: String,
    pub(crate) count: Option<u64>,
}

pub(crate) const SETLIST_ENTRIES_FILE: &str = "setlist-entries.json";

const IDB_REQUIRED_DATA_FILES: &[&str] = &[
    "venues.json",
    "songs.json",
    "tours.json",
    "shows.json",
    "setlist-entries.json",
    "guests.json",
    "guest-appearances.json",
    "liberation-list.json",
    "song-statistics.json",
    "releases.json",
    "release-tracks.json",
    "curated-lists.json",
    "curated-list-items.json",
    "ai-config.json",
    "manifest.json",
    "idb-migration-dry-run.json",
    "ann-index.json",
    "ann-index.bin",
    "ann-index.ivf.json",
    "embedding-manifest.json",
    "embedding-sample.json",
];

pub(crate) use self::artifact_manifest::{
    build_data_manifest, load_data_manifest, validate_ai_config, validate_data_manifest,
    validate_data_manifest_file, write_ai_config,
};
pub(crate) use self::artifact_migration::{idb_migration_dry_run, validate_idb_migration_dry_run};

pub(crate) fn normalized_data_asset_name(name: &str) -> &str {
    name.strip_suffix(".json.br")
        .or_else(|| name.strip_suffix(".json.gz"))
        .unwrap_or(name)
}

pub(crate) fn is_setlist_chunk_asset_name(normalized_name: &str) -> bool {
    normalized_name.starts_with(SETLIST_CHUNK_PREFIX) && normalized_name.ends_with(".json")
}

fn manifest_record_key(name: &str) -> String {
    let normalized = normalized_data_asset_name(name);
    let stem = normalized.strip_suffix(".json").unwrap_or(normalized);
    if stem.starts_with(SETLIST_CHUNK_PREFIX) {
        "setlist-entries".to_string()
    } else {
        stem.to_string()
    }
}

pub(crate) fn is_supported_data_asset(name: &str) -> bool {
    let normalized = normalized_data_asset_name(name);
    if is_setlist_chunk_asset_name(normalized) {
        return true;
    }
    if IDB_REQUIRED_DATA_FILES.contains(&normalized) {
        return true;
    }
    normalized.starts_with("embedding-chunk-") && normalized.ends_with(".json")
}

pub(crate) fn manifest_counts(manifest: &DataManifest) -> HashMap<String, u64> {
    let mut counts = HashMap::new();
    let mut setlist_single_count = None;
    let mut setlist_chunk_count = 0u64;

    for file in &manifest.files {
        let Some(count) = file.count else { continue };
        let normalized = normalized_data_asset_name(&file.name);

        if normalized == SETLIST_ENTRIES_FILE {
            let total = setlist_single_count.unwrap_or(0u64).saturating_add(count);
            setlist_single_count = Some(total);
            continue;
        }
        if is_setlist_chunk_asset_name(normalized) {
            setlist_chunk_count = setlist_chunk_count.saturating_add(count);
            continue;
        }

        let key = manifest_record_key(&file.name);
        *counts.entry(key).or_insert(0) += count;
    }

    if let Some(single_count) = setlist_single_count {
        counts.insert("setlist-entries".to_string(), single_count);
    } else if setlist_chunk_count > 0 {
        counts.insert("setlist-entries".to_string(), setlist_chunk_count);
    }

    counts
}
