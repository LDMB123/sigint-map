use anyhow::{Context, Result};
use dmb_core::CORE_SCHEMA_VERSION;
use std::collections::HashSet;
use std::fs::File;
use std::path::Path;

use crate::artifact_contracts::{DataFile, DataManifest, is_supported_data_asset};
use crate::data_utils::{checksum_file, count_json_entries};

pub(crate) fn build_data_manifest(source_dir: &Path, output: &Path) -> Result<()> {
    if !source_dir.exists() {
        anyhow::bail!("data dir not found: {}", source_dir.display());
    }

    let mut files: Vec<DataFile> = Vec::new();

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
        if !is_supported_data_asset(&name) {
            tracing::debug!(file = %name, "build-data-manifest: skipping unsupported file");
            continue;
        }
        let is_json =
            name.ends_with(".json") || name.ends_with(".json.gz") || name.ends_with(".json.br");
        let is_bin = name.ends_with(".bin");
        if !(is_json || is_bin) {
            continue;
        }

        let size = path.metadata()?.len();
        let checksum = checksum_file(&path)?;
        let count = if is_json && (name.ends_with(".json") || name.ends_with(".json.gz")) {
            count_json_entries(&path)?
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

    if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent)
            .with_context(|| format!("create output dir {}", parent.display()))?;
    }

    serde_json::to_writer_pretty(
        File::create(output).with_context(|| format!("write {}", output.display()))?,
        &manifest,
    )
    .context("serialize data manifest")?;

    validate_data_manifest_file(output)?;

    Ok(())
}

pub(crate) fn write_ai_config(output_dir: &Path) -> Result<()> {
    if !output_dir.exists() {
        std::fs::create_dir_all(output_dir)
            .with_context(|| format!("create {}", output_dir.display()))?;
    }
    let output = output_dir.join("ai-config.json");
    let payload = serde_json::json!({
        "version": CORE_SCHEMA_VERSION,
        "generatedAt": chrono::Utc::now().to_rfc3339(),
        "tuning": {
            "probe_override": null,
            "target_latency_ms": 12.0,
            "last_latency_ms": null
        },
        "benchmarkHistory": [],
        "workerThresholdDefault": 35000,
        "annCapOverrideMb": null
    });
    serde_json::to_writer_pretty(
        File::create(&output).with_context(|| format!("write {}", output.display()))?,
        &payload,
    )
    .context("serialize ai config")?;
    validate_ai_config(&output)?;
    Ok(())
}

pub(crate) fn load_data_manifest(path: &Path) -> Result<DataManifest> {
    let file = File::open(path).with_context(|| format!("open {}", path.display()))?;
    serde_json::from_reader(file).with_context(|| format!("parse {}", path.display()))
}

pub(crate) fn validate_data_manifest_file(path: &Path) -> Result<DataManifest> {
    let manifest = load_data_manifest(path)?;
    validate_data_manifest(&manifest)?;
    Ok(manifest)
}

pub(crate) fn validate_data_manifest(manifest: &DataManifest) -> Result<()> {
    if manifest.version.trim().is_empty() {
        anyhow::bail!("manifest version is empty");
    }
    if manifest.files.is_empty() {
        anyhow::bail!("manifest contains no files");
    }
    let mut seen = HashSet::new();
    for file in &manifest.files {
        if !seen.insert(file.name.as_str()) {
            anyhow::bail!("manifest contains duplicate file entry: {}", file.name);
        }
        if file.checksum.trim().is_empty() {
            anyhow::bail!("manifest missing checksum for {}", file.name);
        }
        if file.size == 0 {
            anyhow::bail!("manifest file size is zero for {}", file.name);
        }
        if !is_supported_data_asset(&file.name) {
            anyhow::bail!("manifest includes unsupported data asset: {}", file.name);
        }
    }

    let names: HashSet<&str> = manifest.files.iter().map(|f| f.name.as_str()).collect();
    if !names.contains("ai-config.json") {
        anyhow::bail!("manifest missing ai-config.json");
    }
    let has_embeddings = names.contains("embedding-manifest.json")
        || names
            .iter()
            .any(|name| name.starts_with("embedding-chunk-"))
        || names.contains("ann-index.json")
        || names.contains("ann-index.bin");
    if has_embeddings {
        if names
            .iter()
            .any(|name| name.starts_with("embedding-chunk-"))
            && !names.contains("embedding-manifest.json")
        {
            anyhow::bail!("manifest has embedding chunks without embedding-manifest.json");
        }
        if !names.contains("ann-index.bin") {
            anyhow::bail!("manifest missing ann-index.bin");
        }
        if !names.contains("ann-index.json") {
            anyhow::bail!("manifest missing ann-index.json");
        }
        if names.contains("ann-index.ivf.json") && !names.contains("ann-index.json") {
            anyhow::bail!("manifest has ann-index.ivf.json without ann-index.json");
        }
    }

    Ok(())
}

pub(crate) fn validate_ai_config(path: &Path) -> Result<()> {
    if !path.exists() {
        anyhow::bail!("ai-config missing at {}", path.display());
    }
    let file = File::open(path).with_context(|| format!("open {}", path.display()))?;
    let value: serde_json::Value = serde_json::from_reader(file).context("parse ai-config.json")?;
    let version = value.get("version").and_then(|v| v.as_str()).unwrap_or("");
    let generated_at = value
        .get("generatedAt")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if version.is_empty() || generated_at.is_empty() {
        anyhow::bail!("ai-config missing required keys (version/generatedAt)");
    }
    if version != CORE_SCHEMA_VERSION {
        anyhow::bail!("ai-config version mismatch: {version} vs {CORE_SCHEMA_VERSION}");
    }
    if chrono::DateTime::parse_from_rfc3339(generated_at).is_err() {
        anyhow::bail!("ai-config generatedAt is not RFC3339");
    }
    if let Some(worker_threshold) = value
        .get("workerThresholdDefault")
        .and_then(serde_json::Value::as_u64)
        && !(5_000..=1_000_000).contains(&worker_threshold)
    {
        anyhow::bail!("ai-config workerThresholdDefault out of range");
    }
    if let Some(override_mb) = value
        .get("annCapOverrideMb")
        .and_then(serde_json::Value::as_u64)
        && !(128..=2048).contains(&override_mb)
    {
        anyhow::bail!("ai-config annCapOverrideMb out of range");
    }
    if let Some(tuning) = value.get("tuning") {
        if let Some(last) = tuning
            .get("last_latency_ms")
            .and_then(serde_json::Value::as_f64)
            && last < 0.0
        {
            anyhow::bail!("ai-config last_latency_ms is negative");
        }
        if let Some(target) = tuning
            .get("target_latency_ms")
            .and_then(serde_json::Value::as_f64)
            && !(1.0..=100.0).contains(&target)
        {
            anyhow::bail!("ai-config target_latency_ms out of range");
        }
        if let Some(probe) = tuning
            .get("probe_override")
            .and_then(serde_json::Value::as_u64)
            && probe == 0
        {
            anyhow::bail!("ai-config probe_override must be >= 1");
        }
    }
    Ok(())
}
