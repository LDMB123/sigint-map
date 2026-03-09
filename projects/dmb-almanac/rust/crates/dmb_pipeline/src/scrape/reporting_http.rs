use super::*;

pub(crate) fn endpoint_name(url: &str) -> &str {
    url.rsplit('/')
        .next()
        .unwrap_or("unknown")
        .split('?')
        .next()
        .unwrap_or("unknown")
}

pub(crate) fn duration_as_u64_millis(duration: Duration) -> u64 {
    u64::try_from(duration.as_millis()).unwrap_or(u64::MAX)
}

pub(crate) fn increment_http_status(url: &str, status: Option<u16>) {
    let endpoint = endpoint_name(url);
    let key = match status {
        Some(code) => format!("{endpoint}:{code}"),
        None => format!("{endpoint}:network"),
    };
    increment_warning_map(&SCRAPE_HTTP_STATUS, key);
}

pub(crate) fn record_endpoint_timing(endpoint: &str, elapsed: Duration) {
    let mut guard = match SCRAPE_ENDPOINT_TIMINGS.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            tracing::warn!("endpoint timing map poisoned; continuing with recovered map");
            poisoned.into_inner()
        }
    };
    let entry = guard.entry(endpoint.to_string()).or_insert(0);
    let elapsed_ms = duration_as_u64_millis(elapsed);
    *entry = (*entry).max(elapsed_ms);
}

pub(crate) fn record_endpoint_retry(endpoint: &str) {
    let mut guard = match SCRAPE_ENDPOINT_RETRIES.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            tracing::warn!("endpoint retries map poisoned; continuing with recovered map");
            poisoned.into_inner()
        }
    };
    let entry = guard.entry(endpoint.to_string()).or_insert(0);
    *entry = entry.saturating_add(1);
}

pub(crate) fn endpoint_retry_count(endpoint: &str) -> u64 {
    let guard = match SCRAPE_ENDPOINT_RETRIES.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            tracing::warn!("endpoint retries map poisoned; continuing with recovered map");
            poisoned.into_inner()
        }
    };
    guard
        .get(endpoint)
        .copied()
        .and_then(|count| u64::try_from(count).ok())
        .unwrap_or(u64::MAX)
}

pub(crate) fn log_scrape_http_summary() {
    let mut counts = match SCRAPE_HTTP_STATUS.lock() {
        Ok(guard) => guard.clone(),
        Err(poisoned) => {
            tracing::warn!("http status map poisoned; continuing with recovered map");
            poisoned.into_inner().clone()
        }
    };
    if counts.is_empty() {
        return;
    }
    let mut entries: Vec<(String, usize)> = counts.drain().collect();
    entries.sort_by(|a, b| b.1.cmp(&a.1));
    let top: Vec<String> = entries
        .into_iter()
        .take(5)
        .map(|(key, count)| format!("{key}={count}"))
        .collect();
    tracing::warn!(top = ?top, "scrape http error summary");
}
