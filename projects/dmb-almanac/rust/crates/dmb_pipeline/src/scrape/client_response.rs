use anyhow::{Context, Result};
use std::path::Path;
use std::time::{Duration, Instant};

use super::super::{
    LARGE_RESPONSE_WARN_BYTES, ScrapeErrorKind, duration_as_u64_millis, increment_http_status,
    record_endpoint_timing, record_scrape_error, record_warning_event,
};
use super::client_cache::write_cached_html;
use super::client_retry::RetryPolicy;

pub(super) fn handle_success_response(
    resp: reqwest::blocking::Response,
    url: &str,
    cache_path: &Path,
    endpoint: &str,
    attempt: u32,
    retry_policy: &RetryPolicy,
    start: Instant,
) -> Result<Option<String>> {
    let status = resp.status();
    let response = resp
        .text()
        .with_context(|| format!("read response body from {url}"))?;
    if response.len() > LARGE_RESPONSE_WARN_BYTES {
        tracing::warn!(url, bytes = response.len(), "large html response");
        record_warning_event("large_response", "http", url);
    }
    if response.trim().is_empty() {
        tracing::warn!(url, attempt, "empty response body");
        record_warning_event("empty_response", "http", url);
        record_scrape_error(
            ScrapeErrorKind::EmptyResponse,
            "http",
            url,
            Some("empty response body"),
        );
        if attempt <= retry_policy.max_retries {
            retry_policy.sleep_jitter();
            return Ok(None);
        }
        anyhow::bail!("empty response body for {url}");
    }
    write_cached_html(cache_path, &response).map_err(|err| {
        record_scrape_error(
            ScrapeErrorKind::CacheWrite,
            "cache",
            &cache_path.to_string_lossy(),
            Some(&format!("{err:?}")),
        );
        err
    })?;
    retry_policy.sleep_jitter();
    record_endpoint_timing(endpoint, start.elapsed());
    tracing::info!(
        url,
        source = "network",
        status = status.as_u16(),
        elapsed_ms = duration_as_u64_millis(start.elapsed()),
        "fetch html"
    );
    Ok(Some(response))
}

pub(super) fn build_http_status_error(
    status: reqwest::StatusCode,
    url: &str,
    attempt: u32,
    max_retries: u32,
) -> (anyhow::Error, bool, Option<Duration>) {
    let retryable = status.as_u16() == 429 || status.is_server_error();
    let err = anyhow::anyhow!(
        "http error {} for {} (attempt {}/{})",
        status,
        url,
        attempt,
        max_retries
    );
    (err, retryable, None)
}

pub(super) fn log_http_status_failure(
    resp: &reqwest::blocking::Response,
    url: &str,
    attempt: u32,
    max_retries: u32,
) -> Option<Duration> {
    let status = resp.status();
    let retry_after = resp
        .headers()
        .get(reqwest::header::RETRY_AFTER)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse::<u64>().ok())
        .map(Duration::from_secs);
    increment_http_status(url, Some(status.as_u16()));
    tracing::warn!(
        url,
        status = status.as_u16(),
        attempt,
        max_retries,
        retryable = status.as_u16() == 429 || status.is_server_error(),
        retry_after = retry_after.map(|d| d.as_secs()),
        "http fetch failed"
    );
    record_scrape_error(
        ScrapeErrorKind::HttpStatus,
        "http",
        url,
        Some(&format!("status {}", status.as_u16())),
    );
    retry_after
}

pub(super) fn build_request_error(
    err: reqwest::Error,
    url: &str,
    attempt: u32,
    max_retries: u32,
) -> anyhow::Error {
    increment_http_status(url, None);
    tracing::warn!(
        url,
        error = %err,
        attempt,
        max_retries,
        "http request error"
    );
    record_scrape_error(
        ScrapeErrorKind::HttpRequest,
        "http",
        url,
        Some(&format!("{err:?}")),
    );
    anyhow::anyhow!(
        "fetch {}: {} (attempt {}/{})",
        url,
        err,
        attempt,
        max_retries
    )
}
