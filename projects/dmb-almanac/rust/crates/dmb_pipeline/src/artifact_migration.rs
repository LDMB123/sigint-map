use anyhow::{Context, Result};
use std::fs::File;
use std::path::Path;

use crate::artifact_contracts::{load_data_manifest, DataManifest};

pub(crate) fn idb_migration_dry_run(manifest_path: &Path, output: &Path) -> Result<()> {
    let manifest = load_data_manifest(manifest_path)?;
    let mut totals: std::collections::HashMap<String, u64> = std::collections::HashMap::new();
    for file in &manifest.files {
        if let Some(count) = file.count {
            totals.insert(file.name.clone(), count);
        }
    }
    let summary = serde_json::json!({
        "generatedAt": chrono::Utc::now().to_rfc3339(),
        "manifestVersion": manifest.version,
        "fileCounts": totals,
        "note": "Dry-run report only. Use in client migration checks to compare IDB counts."
    });
    if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent).with_context(|| format!("create {}", parent.display()))?;
    }
    serde_json::to_writer_pretty(
        File::create(output).with_context(|| format!("write {}", output.display()))?,
        &summary,
    )
    .context("serialize idb migration dry run")?;
    validate_idb_migration_dry_run(output, &manifest)?;
    Ok(())
}

pub(crate) fn validate_idb_migration_dry_run(path: &Path, manifest: &DataManifest) -> Result<()> {
    let file = File::open(path).with_context(|| format!("open {}", path.display()))?;
    let value: serde_json::Value =
        serde_json::from_reader(file).with_context(|| format!("parse {}", path.display()))?;

    let generated_at = value
        .get("generatedAt")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("");
    if chrono::DateTime::parse_from_rfc3339(generated_at).is_err() {
        anyhow::bail!("idb migration dry run generatedAt is not RFC3339");
    }

    let manifest_version = value
        .get("manifestVersion")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("");
    if manifest_version != manifest.version {
        anyhow::bail!(
            "idb migration dry run manifestVersion mismatch: {} vs {}",
            manifest_version,
            manifest.version
        );
    }

    let note = value
        .get("note")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("");
    if note.trim().is_empty() {
        anyhow::bail!("idb migration dry run note is empty");
    }

    let Some(file_counts) = value
        .get("fileCounts")
        .and_then(serde_json::Value::as_object)
    else {
        anyhow::bail!("idb migration dry run fileCounts is missing");
    };

    for file in &manifest.files {
        let Some(expected_count) = file.count else {
            continue;
        };
        let Some(actual_count) = file_counts
            .get(&file.name)
            .and_then(serde_json::Value::as_u64)
        else {
            anyhow::bail!(
                "idb migration dry run missing file count entry for {}",
                file.name
            );
        };
        if actual_count != expected_count {
            anyhow::bail!(
                "idb migration dry run count mismatch for {}: {} vs {}",
                file.name,
                actual_count,
                expected_count
            );
        }
    }

    Ok(())
}
