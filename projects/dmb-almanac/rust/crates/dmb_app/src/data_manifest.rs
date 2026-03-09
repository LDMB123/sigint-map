use super::*;
#[cfg(feature = "hydrate")]
use dmb_core::SETLIST_CHUNK_PREFIX;
#[cfg(feature = "hydrate")]
use serde::Deserialize;
#[cfg(feature = "hydrate")]
use std::collections::HashMap;

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, Deserialize)]
pub(crate) struct DataManifest {
    pub(crate) version: String,
    #[serde(default, alias = "recordCounts")]
    pub(crate) record_counts: HashMap<String, u64>,
    #[serde(default)]
    pub(crate) files: Vec<ManifestFile>,
}

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, Deserialize)]
pub(crate) struct ManifestFile {
    pub(crate) name: String,
    #[serde(default, alias = "recordCount")]
    pub(crate) count: Option<u64>,
}

#[cfg(any(feature = "hydrate", test))]
pub(crate) fn compute_manifest_diff(
    previous: &std::collections::HashMap<String, u64>,
    next: &std::collections::HashMap<String, u64>,
) -> Vec<ManifestDiffEntry> {
    let mut out = Vec::new();
    for (name, &after) in next {
        let before = previous.get(name).copied().unwrap_or(0);
        if before != after {
            let delta = if after >= before {
                i64::try_from(after - before).unwrap_or(i64::MAX)
            } else {
                match i64::try_from(before - after) {
                    Ok(value) => -value,
                    Err(_) => i64::MIN,
                }
            };
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
    pub(crate) fn record_counts_map(&self) -> HashMap<String, u64> {
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

    pub(crate) fn chunk_files_with_prefix(&self, prefix: &str) -> Vec<String> {
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
pub(crate) async fn fetch_json<T: serde::de::DeserializeOwned>(url: &str) -> Option<T> {
    crate::browser::http::fetch_json(url).await
}

#[cfg(feature = "hydrate")]
pub async fn fetch_manifest_diff() -> Option<ManifestDiff> {
    let (manifest_opt, marker_result) = futures::future::join(
        fetch_json::<DataManifest>("/data/manifest.json"),
        dmb_idb::get_sync_meta::<ImportMarker>(IMPORT_MARKER_ID),
    )
    .await;
    let manifest = manifest_opt?;
    let marker = marker_result.ok().flatten();
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
pub(crate) fn manifest_name_stem(name: &str) -> Option<&str> {
    name.strip_suffix(".json.br")
        .or_else(|| name.strip_suffix(".json.gz"))
        .or_else(|| name.strip_suffix(".json"))
}

#[cfg(feature = "hydrate")]
pub(crate) fn normalized_manifest_name(name: &str) -> Option<String> {
    let stem = manifest_name_stem(name)?;
    if stem.starts_with(SETLIST_CHUNK_PREFIX) {
        Some("setlist-entries".to_string())
    } else {
        Some(stem.to_string())
    }
}
