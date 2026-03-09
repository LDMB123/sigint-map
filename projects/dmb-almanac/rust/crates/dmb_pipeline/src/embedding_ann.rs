use anyhow::{Context, Result};
use std::fs::File;
use std::path::Path;

use dmb_core::{AnnIndexMeta, EmbeddingChunk, EmbeddingManifest};

#[path = "embedding_ann_ivf.rs"]
mod embedding_ann_ivf;

use self::embedding_ann_ivf::build_ivf_index;
pub(crate) use self::embedding_ann_ivf::suggest_ivf_params;

pub(crate) fn build_ann_index(input_dir: &Path, output: &Path, method: &str) -> Result<()> {
    let manifest_path = input_dir.join("embedding-manifest.json");
    let file =
        File::open(&manifest_path).with_context(|| format!("open {}", manifest_path.display()))?;
    let manifest: EmbeddingManifest =
        serde_json::from_reader(file).context("parse embedding manifest")?;

    let record_count_u64 = manifest
        .chunks
        .iter()
        .map(|chunk| u64::from(chunk.count))
        .sum::<u64>();
    let record_count = u32::try_from(record_count_u64).map_err(|_| {
        anyhow::anyhow!(
            "embedding record count {} exceeds u32 range in ann metadata",
            record_count_u64
        )
    })?;
    let record_count_usize = usize::try_from(record_count).map_err(|_| {
        anyhow::anyhow!(
            "embedding record count {} does not fit usize on this platform",
            record_count
        )
    })?;
    let dim_usize = usize::try_from(manifest.dim).map_err(|_| {
        anyhow::anyhow!(
            "embedding manifest dim {} does not fit usize on this platform",
            manifest.dim
        )
    })?;
    let mut flat_vectors: Vec<f32> =
        Vec::with_capacity(record_count_usize.saturating_mul(dim_usize));

    for chunk in &manifest.chunks {
        let chunk_path = input_dir.join(&chunk.file);
        let chunk_file =
            File::open(&chunk_path).with_context(|| format!("open {}", chunk_path.display()))?;
        let payload: EmbeddingChunk =
            serde_json::from_reader(chunk_file).context("parse embedding chunk")?;
        for record in payload.records {
            flat_vectors.extend_from_slice(&record.vector);
        }
    }

    let bin_path = output.with_extension("bin");
    let bytes: &[u8] = bytemuck::cast_slice(&flat_vectors);
    std::fs::write(&bin_path, bytes).with_context(|| format!("write {}", bin_path.display()))?;

    let method = method.to_lowercase();
    let mut meta = AnnIndexMeta {
        id: "default".to_string(),
        method: method.clone(),
        dim: manifest.dim,
        record_count,
        built_at: chrono::Utc::now().to_rfc3339(),
        source_manifest: manifest_path.to_string_lossy().to_string(),
        index_file: None,
        cluster_count: None,
        probe_count: None,
    };

    if method == "ivf-flat" {
        let dim = manifest.dim as usize;
        let record_total = (flat_vectors.len() / dim).max(1);
        let (cluster_count, probe_count) = suggest_ivf_params(record_total);
        let ivf = build_ivf_index(&flat_vectors, dim, cluster_count, probe_count, 3)?;
        let ivf_path = output.with_extension("ivf.json");
        serde_json::to_writer_pretty(
            File::create(&ivf_path).with_context(|| format!("write {}", ivf_path.display()))?,
            &ivf,
        )
        .context("serialize ivf index")?;

        meta.index_file = ivf_path
            .file_name()
            .map(|name| name.to_string_lossy().to_string());
        meta.cluster_count = Some(ivf.cluster_count);
        meta.probe_count = Some(ivf.probe_count);
    }

    serde_json::to_writer_pretty(
        File::create(output).with_context(|| format!("write {}", output.display()))?,
        &meta,
    )
    .context("serialize ann index metadata")?;

    tracing::info!(
        "ann-index: wrote {} vectors to {}",
        record_count,
        bin_path.display()
    );

    Ok(())
}
