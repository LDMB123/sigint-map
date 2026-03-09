use anyhow::{Context, Result};
use dmb_core::{AnnIndexMeta, AnnIvfIndex, CORE_SCHEMA_VERSION, EmbeddingChunk, EmbeddingManifest};
use std::collections::HashSet;
use std::fs::File;
use std::path::Path;

use crate::pipeline_support::EmbeddingInput;

pub(crate) fn validate_embedding_manifest(path: &Path) -> Result<EmbeddingManifest> {
    let file = File::open(path).with_context(|| format!("open {}", path.display()))?;
    let manifest: EmbeddingManifest =
        serde_json::from_reader(file).context("parse embedding manifest")?;
    if manifest.version.trim().is_empty() {
        anyhow::bail!("embedding manifest version is empty");
    }
    if manifest.version != CORE_SCHEMA_VERSION {
        anyhow::bail!(
            "embedding manifest version mismatch: {} vs {}",
            manifest.version,
            CORE_SCHEMA_VERSION
        );
    }
    if manifest.dim == 0 {
        anyhow::bail!("embedding manifest dim is zero");
    }
    if manifest.chunk_count == 0 || manifest.chunks.is_empty() {
        anyhow::bail!("embedding manifest has no chunks");
    }
    if manifest.chunk_count as usize != manifest.chunks.len() {
        anyhow::bail!(
            "embedding manifest chunk_count mismatch: {} vs {}",
            manifest.chunk_count,
            manifest.chunks.len()
        );
    }
    let mut ids = HashSet::new();
    let mut files = HashSet::new();
    for chunk in &manifest.chunks {
        if chunk.file.trim().is_empty() {
            anyhow::bail!("embedding manifest chunk file is empty");
        }
        if chunk.count == 0 {
            anyhow::bail!("embedding manifest chunk {} has zero records", chunk.file);
        }
        if !ids.insert(chunk.chunk_id) {
            anyhow::bail!("embedding manifest duplicate chunk id {}", chunk.chunk_id);
        }
        if !files.insert(chunk.file.as_str()) {
            anyhow::bail!("embedding manifest duplicate chunk file {}", chunk.file);
        }
    }
    Ok(manifest)
}

pub(crate) fn validate_embedding_chunks(
    manifest: &EmbeddingManifest,
    data_dir: &Path,
) -> Result<()> {
    for chunk in &manifest.chunks {
        let path = data_dir.join(&chunk.file);
        if !path.exists() {
            anyhow::bail!("embedding chunk file missing: {}", path.display());
        }
        let file = File::open(&path).with_context(|| format!("open {}", path.display()))?;
        let parsed: EmbeddingChunk =
            serde_json::from_reader(file).context("parse embedding chunk")?;
        if parsed.dim != manifest.dim {
            anyhow::bail!(
                "embedding chunk dim mismatch {}: {} vs {}",
                chunk.file,
                parsed.dim,
                manifest.dim
            );
        }
        if parsed.records.len() != chunk.count as usize {
            anyhow::bail!(
                "embedding chunk count mismatch {}: {} vs {}",
                chunk.file,
                parsed.records.len(),
                chunk.count
            );
        }
        if let Some(sample) = parsed.records.first()
            && sample.vector.len() != manifest.dim as usize
        {
            anyhow::bail!(
                "embedding chunk vector length mismatch {}: {} vs {}",
                chunk.file,
                sample.vector.len(),
                manifest.dim
            );
        }
    }
    Ok(())
}

pub(crate) fn validate_ann_index_files(data_dir: &Path) -> Result<()> {
    let meta_path = data_dir.join("ann-index.json");
    if !meta_path.exists() {
        return Ok(());
    }
    let file = File::open(&meta_path).with_context(|| format!("open {}", meta_path.display()))?;
    let meta: AnnIndexMeta = serde_json::from_reader(file).context("parse ann index meta")?;
    if meta.dim == 0 || meta.record_count == 0 {
        anyhow::bail!("ann index meta missing dim or record_count");
    }
    let bin_path = data_dir.join("ann-index.bin");
    if !bin_path.exists() {
        anyhow::bail!("ann index binary missing: {}", bin_path.display());
    }
    let expected = meta.record_count as u64 * meta.dim as u64 * 4;
    let actual = std::fs::metadata(&bin_path)
        .with_context(|| format!("stat {}", bin_path.display()))?
        .len();
    if actual != expected {
        anyhow::bail!("ann index binary size mismatch: {actual} vs expected {expected}");
    }

    if meta.method == "ivf-flat" {
        let ivf_file = meta
            .index_file
            .clone()
            .unwrap_or_else(|| "ann-index.ivf.json".to_string());
        let ivf_path = data_dir.join(&ivf_file);
        if !ivf_path.exists() {
            anyhow::bail!("ann ivf index missing: {}", ivf_path.display());
        }
        let file = File::open(&ivf_path).with_context(|| format!("open {}", ivf_path.display()))?;
        let ivf: AnnIvfIndex = serde_json::from_reader(file).context("parse ann ivf index")?;
        if ivf.dim != meta.dim {
            anyhow::bail!("ann ivf dim mismatch: {} vs {}", ivf.dim, meta.dim);
        }
        if ivf.cluster_count == 0 || ivf.centroids.is_empty() {
            anyhow::bail!("ann ivf has no centroids");
        }
        let total_list_entries: usize = ivf.lists.iter().map(std::vec::Vec::len).sum();
        let expected_entries = usize::try_from(meta.record_count).map_err(|_| {
            anyhow::anyhow!(
                "ann ivf record_count {} does not fit usize on this platform",
                meta.record_count
            )
        })?;
        if total_list_entries != expected_entries {
            anyhow::bail!(
                "ann ivf list size mismatch: {} vs {}",
                total_list_entries,
                meta.record_count
            );
        }
    }

    Ok(())
}

pub(crate) fn validate_embedding_sample(path: &Path, dim: u32) -> Result<()> {
    if !path.exists() {
        return Ok(());
    }
    let file = File::open(path).with_context(|| format!("open {}", path.display()))?;
    let entries: Vec<EmbeddingInput> =
        serde_json::from_reader(file).context("parse embedding sample")?;
    if entries.is_empty() {
        anyhow::bail!("embedding sample is empty");
    }
    let dim_usize = usize::try_from(dim).map_err(|_| {
        anyhow::anyhow!(
            "embedding sample dim {} does not fit usize on this platform",
            dim
        )
    })?;
    for entry in entries.iter().take(5) {
        if let Some(vector) = &entry.vector {
            if vector.len() != dim_usize {
                anyhow::bail!(
                    "embedding sample vector dim mismatch: {} vs {}",
                    vector.len(),
                    dim
                );
            }
        } else if entry.text.as_ref().is_none_or(|s| s.trim().is_empty()) {
            anyhow::bail!("embedding sample missing vector or text");
        }
    }
    Ok(())
}
