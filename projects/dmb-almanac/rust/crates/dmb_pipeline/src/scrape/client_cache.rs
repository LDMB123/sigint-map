use anyhow::{Context, Result};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

pub(super) fn cache_path(cache_dir: &Path, url: &str) -> PathBuf {
    let hash = blake3::hash(url.as_bytes()).to_hex();
    cache_dir.join(format!("{hash}.html"))
}

pub(super) fn expire_cache_file(cache_path: &Path, cache_ttl_days: Option<u64>) {
    let Some(ttl_days) = cache_ttl_days else {
        return;
    };
    if let Ok(metadata) = fs::metadata(cache_path)
        && let Ok(modified) = metadata.modified()
    {
        let age = SystemTime::now()
            .duration_since(modified)
            .unwrap_or_else(|_| Duration::from_secs(0));
        if age > Duration::from_secs(ttl_days.saturating_mul(86_400)) {
            let _ = fs::remove_file(cache_path);
        }
    }
}

pub(super) fn read_cached_html(cache_path: &Path) -> Result<String> {
    fs::read_to_string(cache_path).with_context(|| format!("read cache {}", cache_path.display()))
}

pub(super) fn write_cached_html(cache_path: &Path, response: &str) -> Result<()> {
    fs::write(cache_path, response).with_context(|| format!("write cache {}", cache_path.display()))
}

pub(super) fn prune_cache_dir(cache_dir: &Path, cache_ttl_days: Option<u64>) -> Result<()> {
    let Some(ttl_days) = cache_ttl_days else {
        return Ok(());
    };
    let ttl = Duration::from_secs(ttl_days.saturating_mul(86_400));
    let now = SystemTime::now();
    for entry in fs::read_dir(cache_dir).with_context(|| format!("read {}", cache_dir.display()))? {
        let entry = entry?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let Ok(metadata) = entry.metadata() else {
            continue;
        };
        let Ok(modified) = metadata.modified() else {
            continue;
        };
        let age = now
            .duration_since(modified)
            .unwrap_or_else(|_| Duration::from_secs(0));
        if age > ttl {
            let _ = fs::remove_file(&path);
        }
    }
    Ok(())
}
