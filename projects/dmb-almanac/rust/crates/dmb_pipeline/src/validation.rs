use anyhow::{Context, Result};
use dmb_core::CORE_SCHEMA_VERSION;
use std::path::{Path, PathBuf};

use crate::artifact_contracts::{
    DataManifest, validate_ai_config, validate_data_manifest_file, validate_idb_migration_dry_run,
};
use crate::validation_dataset::{
    compare_baseline_counts_if_needed, load_setlist_entries, load_validation_data,
    log_validation_summary, validate_core_dataset_shape, validate_setlist_entries,
    validate_show_relationships, validate_song_stats_consistency, validate_venue_stats_consistency,
};
use crate::validation_embeddings::{
    validate_ann_index_files, validate_embedding_chunks, validate_embedding_manifest,
    validate_embedding_sample,
};
use crate::validation_warnings::validate_warning_state;

struct ValidationPaths {
    data_dir: PathBuf,
    baseline_dir: PathBuf,
    allow_mismatch: bool,
}

pub(crate) fn validate_data(
    strict_warnings: bool,
    endpoint_timing_max_pct: Option<u64>,
    endpoint_retry_max: Option<u64>,
) -> Result<()> {
    let paths = resolve_validation_paths();
    let data = load_validation_data(&paths.data_dir)?;

    validate_artifact_contracts(&paths.data_dir)?;
    validate_core_dataset_shape(&data)?;
    validate_show_relationships(&data)?;

    let setlist = load_setlist_entries(&paths.data_dir)?;
    validate_setlist_entries(&setlist, &data.song_ids)?;

    compare_baseline_counts_if_needed(&paths.data_dir, &paths.baseline_dir, paths.allow_mismatch)?;

    let warning_summary =
        validate_warning_state(strict_warnings, endpoint_timing_max_pct, endpoint_retry_max)?;
    log_validation_summary(&data, warning_summary.as_ref());

    validate_song_stats_consistency(&paths.data_dir)?;
    validate_venue_stats_consistency(&paths.data_dir, &data.shows, paths.allow_mismatch)?;

    Ok(())
}

fn resolve_validation_paths() -> ValidationPaths {
    let normalized_dir = PathBuf::from("data/normalized");
    let rust_static_dir = PathBuf::from("static/data");
    let baseline_dir = PathBuf::from("../data/static-data");
    let data_dir = if normalized_dir.exists() {
        normalized_dir
    } else if rust_static_dir.exists() {
        rust_static_dir
    } else {
        baseline_dir.clone()
    };

    ValidationPaths {
        data_dir,
        baseline_dir,
        allow_mismatch: std::env::var("DMB_VALIDATE_ALLOW_MISMATCH").ok().is_some(),
    }
}

fn validate_artifact_contracts(data_dir: &Path) -> Result<()> {
    let ai_config_path = data_dir.join("ai-config.json");
    validate_ai_config(&ai_config_path)?;

    let embedding_manifest_path = data_dir.join("embedding-manifest.json");
    if embedding_manifest_path.exists() {
        let manifest = validate_embedding_manifest(&embedding_manifest_path)?;
        validate_embedding_chunks(&manifest, data_dir)?;
        let sample_path = data_dir.join("embedding-sample.json");
        validate_embedding_sample(&sample_path, manifest.dim)?;
    }
    validate_ann_index_files(data_dir)?;

    let data_manifest_path = data_dir.join("manifest.json");
    if data_manifest_path.exists() {
        let payload = std::fs::read_to_string(&data_manifest_path)
            .with_context(|| format!("read {}", data_manifest_path.display()))?;
        match serde_json::from_str::<DataManifest>(&payload) {
            Ok(manifest) => {
                validate_data_manifest_file(&data_manifest_path)?;
                if manifest.version != CORE_SCHEMA_VERSION {
                    anyhow::bail!(
                        "data manifest version mismatch: {} vs {}",
                        manifest.version,
                        CORE_SCHEMA_VERSION
                    );
                }
                let dry_run_path = data_dir.join("idb-migration-dry-run.json");
                if !dry_run_path.exists() {
                    anyhow::bail!(
                        "idb migration dry-run missing at {} (expected when manifest.json exists)",
                        dry_run_path.display()
                    );
                }
                validate_idb_migration_dry_run(&dry_run_path, &manifest)?;
            }
            Err(err) => {
                tracing::warn!(
                    error = ?err,
                    "manifest.json is not in rust pipeline format; skipping strict checks"
                );
            }
        }
    }

    Ok(())
}
