use anyhow::{Context, Result};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone)]
pub(crate) struct FileMeta {
    pub(crate) name: String,
    pub(crate) path: PathBuf,
    pub(crate) size: u64,
    pub(crate) record_count: usize,
}

pub(crate) fn collect_rows<I>(rows: I) -> Result<Vec<Value>>
where
    I: Iterator<Item = rusqlite::Result<Value>>,
{
    let mut out = Vec::new();
    for row in rows {
        out.push(row?);
    }
    Ok(out)
}

pub(crate) fn map_by_id(items: &[Value]) -> HashMap<i64, &Value> {
    let mut map = HashMap::with_capacity(items.len());
    for item in items {
        if let Some(id) = item.get("id").and_then(Value::as_i64) {
            map.insert(id, item);
        }
    }
    map
}

pub(crate) fn extract_year(date: &str) -> i64 {
    let trimmed = date.trim();
    let year = trimmed
        .split('-')
        .next()
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(0);
    if year == 0 && !trimmed.is_empty() {
        tracing::warn!(
            value = trimmed,
            "export: failed to extract year from date; defaulting to 0"
        );
    }
    year
}

pub(crate) fn create_search_text(parts: &[Option<&str>]) -> String {
    parts
        .iter()
        .filter_map(|part| *part)
        .map(|part| part.trim())
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}

pub(crate) fn parse_json_field(value: Option<String>) -> Option<Value> {
    value.and_then(|raw| match serde_json::from_str(&raw) {
        Ok(v) => Some(v),
        Err(e) => {
            tracing::warn!(error = %e, "export: failed to parse JSON field");
            None
        }
    })
}

pub(crate) fn opt_i64_or_warn(value: Option<i64>, context: &str, field: &str) -> i64 {
    match value {
        Some(v) => v,
        None => {
            tracing::warn!(context, field, "export: missing i64 field; defaulting to 0");
            0
        }
    }
}

pub(crate) fn write_json_array(output_dir: &Path, name: &str, data: &[Value]) -> Result<FileMeta> {
    let path = output_dir.join(name);
    let file = fs::File::create(&path).with_context(|| format!("write {}", path.display()))?;
    serde_json::to_writer_pretty(file, data).context("serialize json")?;
    let size = fs::metadata(&path)
        .with_context(|| format!("stat {}", path.display()))?
        .len();
    Ok(FileMeta {
        name: name.to_string(),
        path,
        size,
        record_count: data.len(),
    })
}

pub(crate) fn write_json_array_chunks(
    output_dir: &Path,
    prefix: &str,
    data: &[Value],
    chunk_size: usize,
) -> Result<Vec<FileMeta>> {
    let normalized_chunk_size = chunk_size.max(1);
    let chunk_total = data.len().max(1).div_ceil(normalized_chunk_size);
    let mut chunks = Vec::with_capacity(chunk_total);
    for chunk_index in 0..chunk_total {
        let start = chunk_index * normalized_chunk_size;
        let end = (start + normalized_chunk_size).min(data.len());
        let name = format!("{prefix}{:04}.json", chunk_index + 1);
        let chunk = data.get(start..end).ok_or_else(|| {
            anyhow::anyhow!(
                "invalid chunk bounds while exporting {prefix}: start={start}, end={end}, len={}",
                data.len()
            )
        })?;
        chunks.push(write_json_array(output_dir, &name, chunk)?);
    }
    Ok(chunks)
}

pub(crate) fn write_json_value(output_dir: &Path, name: &str, data: &Value) -> Result<FileMeta> {
    let path = output_dir.join(name);
    let file = fs::File::create(&path).with_context(|| format!("write {}", path.display()))?;
    serde_json::to_writer_pretty(file, data).context("serialize json")?;
    let size = fs::metadata(&path)
        .with_context(|| format!("stat {}", path.display()))?
        .len();
    let record_count = data.as_array().map_or(1, Vec::len);
    Ok(FileMeta {
        name: name.to_string(),
        path,
        size,
        record_count,
    })
}
