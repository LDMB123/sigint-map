use anyhow::{Context, Result};
use serde::de::DeserializeOwned;
use std::fs::File;
use std::path::Path;

use dmb_core::{SETLIST_CHUNK_PREFIX, SetlistEntry};

const SETLIST_ENTRIES_FILE: &str = "setlist-entries.json";

pub(super) fn read_json_vec<T: DeserializeOwned>(path: &Path) -> Result<Vec<T>> {
    let file = File::open(path).with_context(|| format!("open json {}", path.display()))?;
    serde_json::from_reader(file).with_context(|| format!("parse json {}", path.display()))
}

pub(super) fn read_setlist_entries(source_dir: &Path) -> Result<Vec<SetlistEntry>> {
    let single_path = source_dir.join(SETLIST_ENTRIES_FILE);
    if single_path.exists() {
        return read_json_vec(&single_path);
    }

    let mut chunk_paths = std::fs::read_dir(source_dir)
        .with_context(|| format!("read dir {}", source_dir.display()))?
        .filter_map(Result::ok)
        .filter_map(|entry| {
            let path = entry.path();
            if !path.is_file() {
                return None;
            }
            let name = path.file_name()?.to_str()?.to_string();
            if name.starts_with(SETLIST_CHUNK_PREFIX) && name.ends_with(".json") {
                Some((name, path))
            } else {
                None
            }
        })
        .collect::<Vec<_>>();
    chunk_paths.sort_by(|a, b| a.0.cmp(&b.0));

    if chunk_paths.is_empty() {
        return Ok(Vec::new());
    }

    let mut merged = Vec::new();
    for (_, path) in chunk_paths {
        let mut chunk: Vec<SetlistEntry> = read_json_vec(&path)?;
        merged.append(&mut chunk);
    }
    Ok(merged)
}
