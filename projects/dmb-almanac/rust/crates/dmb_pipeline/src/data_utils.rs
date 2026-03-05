use std::fs::File;
use std::io::Read;
use std::path::Path;

use anyhow::{Context, Result};

pub(crate) fn load_json_array(path: &Path) -> Result<Vec<serde_json::Value>> {
    if !path.exists() {
        tracing::warn!("missing data file: {}", path.display());
        return Ok(Vec::new());
    }
    let file = File::open(path).with_context(|| format!("open {}", path.display()))?;
    let value: serde_json::Value =
        serde_json::from_reader(file).with_context(|| format!("parse {}", path.display()))?;
    Ok(value.as_array().cloned().unwrap_or_default())
}

pub(crate) fn collect_ids(
    items: &[serde_json::Value],
    field: &str,
) -> std::collections::HashSet<i32> {
    let mut overflow_count = 0usize;
    let ids = items
        .iter()
        .filter_map(|item| item.get(field))
        .filter_map(serde_json::Value::as_i64)
        .filter_map(|id| match i32::try_from(id) {
            Ok(value) => Some(value),
            Err(_) => {
                overflow_count += 1;
                None
            }
        })
        .collect::<std::collections::HashSet<_>>();
    if overflow_count > 0 {
        tracing::warn!(
            field,
            overflow_count,
            "collect_ids: dropped out-of-range ids that do not fit in i32"
        );
    }
    ids
}

pub(crate) fn ensure_unique(items: &[serde_json::Value], field: &str, label: &str) -> Result<()> {
    let mut seen = std::collections::HashSet::new();
    for item in items {
        let Some(value) = item.get(field).and_then(serde_json::Value::as_i64) else {
            anyhow::bail!("{label}: missing {field}");
        };
        if !seen.insert(value) {
            anyhow::bail!("{label}: duplicate {field}={value}");
        }
    }
    Ok(())
}

pub(crate) fn ensure_required_fields(
    items: &[serde_json::Value],
    fields: &[&str],
    label: &str,
) -> Result<()> {
    for (idx, item) in items.iter().enumerate() {
        for field in fields {
            let value = item.get(*field);
            if value.is_none() || value == Some(&serde_json::Value::Null) {
                anyhow::bail!("{label}: missing {field} at index {idx}");
            }
            if let Some(text) = value.and_then(|v| v.as_str()) {
                if text.trim().is_empty() {
                    anyhow::bail!("{label}: empty {field} at index {idx}");
                }
            }
        }
    }
    Ok(())
}

pub(crate) fn compare_counts(
    primary: &Path,
    baseline: &Path,
    label: &str,
    allow_mismatch: bool,
) -> Result<()> {
    if !primary.exists() || !baseline.exists() {
        return Ok(());
    }
    let primary_count = load_json_array(primary)?.len();
    let baseline_count = load_json_array(baseline)?.len();
    if primary_count != baseline_count {
        let message =
            format!("{label}: count mismatch primary={primary_count} baseline={baseline_count}");
        if allow_mismatch {
            tracing::warn!("{message}");
        } else {
            anyhow::bail!("{message}");
        }
    }
    Ok(())
}

pub(crate) fn checksum_file(path: &Path) -> Result<String> {
    let mut file = File::open(path).with_context(|| format!("open {}", path.display()))?;
    let mut hasher = blake3::Hasher::new();
    let mut buffer = [0u8; 8192];
    loop {
        let read = file.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        let Some(chunk) = buffer.get(..read) else {
            anyhow::bail!(
                "reader returned invalid chunk size {read} for {}-byte buffer while hashing {}",
                buffer.len(),
                path.display()
            );
        };
        hasher.update(chunk);
    }
    Ok(hasher.finalize().to_hex().to_string())
}

pub(crate) fn count_json_entries(path: &Path) -> Result<Option<u64>> {
    let file = File::open(path).with_context(|| format!("open {}", path.display()))?;
    let mut reader: Box<dyn Read> = if path.extension().and_then(|e| e.to_str()) == Some("gz") {
        Box::new(flate2::read::GzDecoder::new(file))
    } else {
        Box::new(file)
    };
    let mut contents = String::new();
    reader.read_to_string(&mut contents)?;
    let value: serde_json::Value = serde_json::from_str(&contents).context("parse data json")?;
    Ok(value.as_array().map(|arr| arr.len() as u64))
}
