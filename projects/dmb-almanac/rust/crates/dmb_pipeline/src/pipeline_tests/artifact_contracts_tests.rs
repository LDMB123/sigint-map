use anyhow::Result;
use dmb_core::CORE_SCHEMA_VERSION;
use std::fs::File;
use std::io::Write;

use crate::artifact_contracts::{
    DataFile, DataManifest, build_data_manifest, idb_migration_dry_run,
    validate_idb_migration_dry_run,
};

#[test]
fn manifest_includes_bin_assets() -> Result<()> {
    let dir = tempfile::tempdir()?;
    let data_dir = dir.path().join("data");
    std::fs::create_dir_all(&data_dir)?;

    let json_path = data_dir.join("venues.json");
    std::fs::write(&json_path, "[]")?;

    let ai_config_path = data_dir.join("ai-config.json");
    std::fs::write(
        &ai_config_path,
        format!(
            "{{\"version\":\"{CORE_SCHEMA_VERSION}\",\"generatedAt\":\"2026-02-01T00:00:00Z\"}}"
        ),
    )?;

    let meta_path = data_dir.join("ann-index.json");
    std::fs::write(&meta_path, "{\"method\":\"flat\"}")?;

    let bin_path = data_dir.join("ann-index.bin");
    let mut bin = File::create(&bin_path)?;
    bin.write_all(&[1u8, 2, 3, 4])?;

    let output = dir.path().join("manifest.json");
    build_data_manifest(&data_dir, &output)?;

    let manifest_file = File::open(&output)?;
    let manifest: DataManifest = serde_json::from_reader(manifest_file)?;

    let names: Vec<_> = manifest.files.iter().map(|f| f.name.as_str()).collect();
    assert!(names.contains(&"venues.json"));
    assert!(names.contains(&"ann-index.json"));
    assert!(names.contains(&"ann-index.bin"));

    let bin_entry = manifest.files.iter().find(|f| f.name == "ann-index.bin");
    let Some(bin_entry) = bin_entry else {
        panic!("ann-index.bin entry missing");
    };
    assert!(bin_entry.count.is_none());

    Ok(())
}

#[test]
fn idb_migration_dry_run_matches_manifest_contract() -> Result<()> {
    let dir = tempfile::tempdir()?;
    let manifest_path = dir.path().join("manifest.json");
    let output_path = dir.path().join("idb-migration-dry-run.json");

    let manifest = DataManifest {
        version: CORE_SCHEMA_VERSION.to_string(),
        generated_at: "2026-02-01T00:00:00Z".to_string(),
        files: vec![
            DataFile {
                name: "venues.json".to_string(),
                size: 10,
                checksum: "venues".to_string(),
                count: Some(3),
            },
            DataFile {
                name: "ai-config.json".to_string(),
                size: 10,
                checksum: "ai".to_string(),
                count: None,
            },
        ],
    };

    serde_json::to_writer_pretty(File::create(&manifest_path)?, &manifest)?;
    idb_migration_dry_run(&manifest_path, &output_path)?;
    validate_idb_migration_dry_run(&output_path, &manifest)?;

    Ok(())
}

#[test]
fn validate_idb_migration_dry_run_rejects_missing_file_count_entries() -> Result<()> {
    let dir = tempfile::tempdir()?;
    let output_path = dir.path().join("idb-migration-dry-run.json");
    let manifest = DataManifest {
        version: CORE_SCHEMA_VERSION.to_string(),
        generated_at: "2026-02-01T00:00:00Z".to_string(),
        files: vec![DataFile {
            name: "venues.json".to_string(),
            size: 10,
            checksum: "venues".to_string(),
            count: Some(3),
        }],
    };

    std::fs::write(
        &output_path,
        format!(
            r#"{{
  "generatedAt": "2026-02-01T00:00:00Z",
  "manifestVersion": "{}",
  "fileCounts": {{}},
  "note": "fixture"
}}"#,
            CORE_SCHEMA_VERSION
        ),
    )?;

    let err = match validate_idb_migration_dry_run(&output_path, &manifest) {
        Ok(()) => panic!("expected dry-run validation failure"),
        Err(err) => err,
    };
    assert!(
        err.to_string()
            .contains("missing file count entry for venues.json"),
        "unexpected error: {err}"
    );

    Ok(())
}
