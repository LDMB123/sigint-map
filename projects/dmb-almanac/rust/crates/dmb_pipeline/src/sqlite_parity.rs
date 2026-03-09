use anyhow::{Context, Result};
use rusqlite::Connection;
use std::path::Path;

use dmb_core::{SQLITE_PARITY_STORE_TABLE_MAPPINGS, sqlite_parity_tables};

use crate::artifact_contracts::{load_data_manifest, manifest_counts};

pub(crate) fn validate_sqlite_parity(
    manifest_path: &Path,
    sqlite_path: &Path,
    strict_manifest: bool,
    strict_tables: bool,
) -> Result<()> {
    if !manifest_path.exists() {
        anyhow::bail!("manifest not found: {}", manifest_path.display());
    }
    if !sqlite_path.exists() {
        anyhow::bail!("sqlite db not found: {}", sqlite_path.display());
    }
    let manifest = load_data_manifest(manifest_path)?;
    let counts = manifest_counts(&manifest);
    if counts.is_empty() {
        anyhow::bail!("manifest has no record counts");
    }

    let conn = Connection::open(sqlite_path)
        .with_context(|| format!("open sqlite {}", sqlite_path.display()))?;

    let mut mismatches = Vec::new();
    let mut missing_manifest = Vec::new();
    let mut missing_tables = Vec::new();
    for table in sqlite_parity_tables() {
        let file = table.replace('_', "-");
        let expected = match counts.get(file.as_str()).copied() {
            Some(value) => value,
            None => {
                missing_manifest.push(file);
                0
            }
        };
        let query = format!("SELECT COUNT(*) FROM {table}");
        let actual: i64 = match conn.query_row(&query, [], |row| row.get(0)) {
            Ok(value) => value,
            Err(err) => {
                // Common failure mode when schema drifted or db is missing tables.
                missing_tables.push(format!("{table}: {err}"));
                continue;
            }
        };
        let actual = u64::try_from(actual).unwrap_or_default();
        if actual != expected {
            mismatches.push((table.to_string(), expected, actual));
        }
    }

    if strict_manifest && !missing_manifest.is_empty() {
        anyhow::bail!(
            "manifest missing record counts for {} required file(s): {}",
            missing_manifest.len(),
            missing_manifest.join(", ")
        );
    }
    if strict_tables && !missing_tables.is_empty() {
        anyhow::bail!(
            "sqlite missing/failed {} table count(s): {}",
            missing_tables.len(),
            missing_tables.join(" | ")
        );
    }

    if mismatches.is_empty() {
        tracing::info!(
            "sqlite parity ok ({} tables)",
            SQLITE_PARITY_STORE_TABLE_MAPPINGS.len()
        );
        return Ok(());
    }

    for (table, expected, actual) in &mismatches {
        tracing::warn!(
            table = table.as_str(),
            expected,
            actual,
            "sqlite parity mismatch"
        );
    }
    anyhow::bail!("sqlite parity mismatches: {}", mismatches.len());
}
