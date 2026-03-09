use anyhow::{Context, Result};
use dmb_core::{CORE_SCHEMA_VERSION, SETLIST_CHUNK_PREFIX, SETLIST_CHUNK_RECORDS};
use std::fs::File;
use std::path::{Path, PathBuf};

use crate::artifact_contracts::{
    is_setlist_chunk_asset_name, is_supported_data_asset, normalized_data_asset_name,
    validate_ai_config, validate_data_manifest, validate_data_manifest_file, DataFile,
    DataManifest, SETLIST_ENTRIES_FILE,
};
use crate::data_utils::{checksum_file, count_json_entries, load_json_array};

pub(crate) fn build_db(source: &Path, output: &Path) -> Result<()> {
    if !source.exists() {
        anyhow::bail!("source db not found: {}", source.display());
    }
    if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent)
            .with_context(|| format!("create db output dir {}", parent.display()))?;
    }
    std::fs::copy(source, output)
        .with_context(|| format!("copy {} -> {}", source.display(), output.display()))?;
    Ok(())
}

pub(crate) fn build_idb(source_dir: &Path, output_dir: &Path) -> Result<()> {
    if !source_dir.exists() {
        anyhow::bail!("source data dir not found: {}", source_dir.display());
    }
    std::fs::create_dir_all(output_dir)
        .with_context(|| format!("create output dir {}", output_dir.display()))?;

    let mut files: Vec<DataFile> = Vec::new();
    let mut source_files: Vec<(String, PathBuf)> = Vec::new();
    for entry in std::fs::read_dir(source_dir)
        .with_context(|| format!("read dir {}", source_dir.display()))?
    {
        let entry = entry?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(name) => name.to_string(),
            None => continue,
        };
        source_files.push((name, path));
    }
    let has_setlist_chunks = source_files
        .iter()
        .any(|(name, _)| is_setlist_chunk_asset_name(normalized_data_asset_name(name)));

    for (name, path) in source_files {
        if !is_supported_data_asset(&name) {
            tracing::debug!(file = %name, "build-idb: skipping unsupported file");
            continue;
        }

        let normalized = normalized_data_asset_name(&name);
        if normalized == SETLIST_ENTRIES_FILE {
            if has_setlist_chunks {
                tracing::info!(
                    file = %name,
                    "build-idb: skipping legacy setlist file because chunk files are present"
                );
                continue;
            }

            let setlist_rows = load_json_array(&path)?;
            let chunk_total = setlist_rows.len().max(1).div_ceil(SETLIST_CHUNK_RECORDS);
            for chunk_index in 0..chunk_total {
                let start = chunk_index * SETLIST_CHUNK_RECORDS;
                let end = (start + SETLIST_CHUNK_RECORDS).min(setlist_rows.len());
                let Some(chunk) = setlist_rows.get(start..end) else {
                    anyhow::bail!(
                        "build-idb: invalid setlist chunk bounds (start={}, end={}, len={})",
                        start,
                        end,
                        setlist_rows.len()
                    );
                };
                let chunk_name = format!("{SETLIST_CHUNK_PREFIX}{:04}.json", chunk_index + 1);
                let chunk_path = output_dir.join(&chunk_name);
                serde_json::to_writer_pretty(
                    File::create(&chunk_path)
                        .with_context(|| format!("write {}", chunk_path.display()))?,
                    chunk,
                )
                .with_context(|| format!("serialize {}", chunk_path.display()))?;

                files.push(DataFile {
                    name: chunk_name,
                    size: chunk_path.metadata()?.len(),
                    checksum: checksum_file(&chunk_path)?,
                    count: Some(chunk.len() as u64),
                });
            }

            continue;
        }

        let is_json =
            name.ends_with(".json") || name.ends_with(".json.gz") || name.ends_with(".json.br");
        let is_bin = name.ends_with(".bin");
        if !(is_json || is_bin) {
            continue;
        }

        let dest = output_dir.join(&name);
        std::fs::copy(&path, &dest)
            .with_context(|| format!("copy {} -> {}", path.display(), dest.display()))?;

        let size = dest.metadata()?.len();
        let checksum = checksum_file(&dest)?;
        let count = if is_json && (name.ends_with(".json") || name.ends_with(".json.gz")) {
            count_json_entries(&dest)?
        } else {
            None
        };

        files.push(DataFile {
            name,
            size,
            checksum,
            count,
        });
    }

    files.sort_by(|a, b| a.name.cmp(&b.name));

    let manifest = DataManifest {
        version: CORE_SCHEMA_VERSION.to_string(),
        generated_at: chrono::Utc::now().to_rfc3339(),
        files,
    };
    validate_data_manifest(&manifest)?;

    let manifest_path = output_dir.join("manifest.json");
    serde_json::to_writer_pretty(
        File::create(&manifest_path)
            .with_context(|| format!("write {}", manifest_path.display()))?,
        &manifest,
    )
    .context("serialize data manifest")?;
    let manifest = validate_data_manifest_file(&manifest_path)?;
    for file in &manifest.files {
        let path = output_dir.join(&file.name);
        if !path.exists() {
            anyhow::bail!("build-idb missing output file {}", path.display());
        }
    }
    validate_ai_config(&output_dir.join("ai-config.json"))?;

    Ok(())
}

pub(crate) fn scrape_seed_data() -> Result<()> {
    let source_dir = PathBuf::from("../data/static-data");
    let output_dir = PathBuf::from("data/raw");
    if !source_dir.exists() {
        anyhow::bail!(
            "seed data not found at {} (ensure ../data/static-data exists)",
            source_dir.display()
        );
    }
    std::fs::create_dir_all(&output_dir)
        .with_context(|| format!("create {}", output_dir.display()))?;

    for entry in
        std::fs::read_dir(&source_dir).with_context(|| format!("read {}", source_dir.display()))?
    {
        let entry = entry?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(name) => name,
            None => continue,
        };
        if !(name.ends_with(".json") || name.ends_with(".json.gz") || name.ends_with(".json.br")) {
            continue;
        }
        let dest = output_dir.join(name);
        std::fs::copy(&path, &dest)
            .with_context(|| format!("copy {} -> {}", path.display(), dest.display()))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn write_fixture_data_file(path: &Path, body: &str) -> Result<()> {
        std::fs::write(path, body).with_context(|| format!("write fixture {}", path.display()))
    }

    #[test]
    fn build_idb_writes_valid_manifest_and_ai_config() -> Result<()> {
        let dir = tempfile::tempdir()?;
        let source_dir = dir.path().join("source");
        let output_dir = dir.path().join("output");
        std::fs::create_dir_all(&source_dir)?;

        write_fixture_data_file(&source_dir.join("venues.json"), "[]")?;
        write_fixture_data_file(&source_dir.join("songs.json"), "[]")?;
        write_fixture_data_file(&source_dir.join("tours.json"), "[]")?;
        write_fixture_data_file(&source_dir.join("shows.json"), "[]")?;
        write_fixture_data_file(&source_dir.join("setlist-entries.json"), "[]")?;
        write_fixture_data_file(&source_dir.join("guests.json"), "[]")?;
        write_fixture_data_file(&source_dir.join("guest-appearances.json"), "[]")?;
        write_fixture_data_file(&source_dir.join("liberation-list.json"), "[]")?;
        write_fixture_data_file(&source_dir.join("song-statistics.json"), "[]")?;
        write_fixture_data_file(&source_dir.join("releases.json"), "[]")?;
        write_fixture_data_file(&source_dir.join("release-tracks.json"), "[]")?;
        write_fixture_data_file(&source_dir.join("curated-lists.json"), "[]")?;
        write_fixture_data_file(&source_dir.join("curated-list-items.json"), "[]")?;
        crate::artifact_contracts::write_ai_config(&source_dir)?;

        build_idb(&source_dir, &output_dir)?;

        let manifest_path = output_dir.join("manifest.json");
        let manifest = validate_data_manifest_file(&manifest_path)?;
        assert!(manifest
            .files
            .iter()
            .any(|file| file.name == "ai-config.json"));
        validate_ai_config(&output_dir.join("ai-config.json"))?;

        Ok(())
    }
}
