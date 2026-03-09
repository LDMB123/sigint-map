use anyhow::{Context, Result};
use chrono::Utc;
use once_cell::sync::Lazy;
use serde_json::{Value, json};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::Duration;

#[path = "reporting_http.rs"]
mod reporting_http;
#[path = "reporting_output.rs"]
mod reporting_output;
#[path = "reporting_state.rs"]
mod reporting_state;

pub(crate) use self::reporting_http::endpoint_retry_count;
pub(super) use self::reporting_http::{
    duration_as_u64_millis, endpoint_name, increment_http_status, log_scrape_http_summary,
    record_endpoint_retry, record_endpoint_timing,
};
pub(super) use self::reporting_output::write_warning_artifacts;
#[cfg(test)]
pub(super) use self::reporting_output::{write_scrape_summary, write_warning_report};
#[cfg(test)]
pub(super) use self::reporting_state::{
    error_counts, error_events, reset_warning_state, warning_counts, warning_empty_by_selector,
    warning_endpoint_retries, warning_events, warning_missing_by_field, with_warning_lock,
};

#[derive(Debug, Clone, Copy)]
pub(super) enum ScrapeErrorKind {
    SelectorParse,
    RegexParse,
    HttpStatus,
    HttpRequest,
    EmptyResponse,
    CacheWrite,
    CacheRead,
    CacheMissing,
}

impl ScrapeErrorKind {
    fn as_str(self) -> &'static str {
        match self {
            ScrapeErrorKind::SelectorParse => "selector_parse",
            ScrapeErrorKind::RegexParse => "regex_parse",
            ScrapeErrorKind::HttpStatus => "http_status",
            ScrapeErrorKind::HttpRequest => "http_request",
            ScrapeErrorKind::EmptyResponse => "empty_response",
            ScrapeErrorKind::CacheWrite => "cache_write",
            ScrapeErrorKind::CacheRead => "cache_read",
            ScrapeErrorKind::CacheMissing => "cache_missing",
        }
    }
}

#[derive(Default)]
struct ScrapeWarningCounters {
    empty_selectors: AtomicUsize,
    missing_fields: AtomicUsize,
}

#[derive(Clone, Default)]
pub(super) struct ScrapeReportSnapshot {
    missing_by_field: HashMap<String, usize>,
    missing_by_context: HashMap<String, usize>,
    empty_by_selector: HashMap<String, usize>,
    empty_by_context: HashMap<String, usize>,
    http_status_counts: HashMap<String, usize>,
    endpoint_timings: HashMap<String, u64>,
    endpoint_retries: HashMap<String, usize>,
    endpoint_retry_total: usize,
    top_endpoint_retries: Vec<(String, usize)>,
    top_missing_fields: Vec<(String, usize)>,
    top_http_status: Vec<(String, usize)>,
    error_counts: HashMap<String, usize>,
    top_errors: Vec<(String, usize)>,
    warning_events_summary: HashMap<String, usize>,
    error_events_summary: HashMap<String, usize>,
    signature: String,
}

static SCRAPE_WARNINGS: Lazy<ScrapeWarningCounters> = Lazy::new(ScrapeWarningCounters::default);
static SCRAPE_WARNING_FIELDS: Lazy<Mutex<HashMap<String, usize>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));
static SCRAPE_WARNING_SELECTORS: Lazy<Mutex<HashMap<String, usize>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));
static SCRAPE_HTTP_STATUS: Lazy<Mutex<HashMap<String, usize>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));
static SCRAPE_ENDPOINT_TIMINGS: Lazy<Mutex<HashMap<String, u64>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));
static SCRAPE_WARNING_EVENTS: Lazy<Mutex<Vec<Value>>> = Lazy::new(|| Mutex::new(Vec::new()));
static SCRAPE_ENDPOINT_RETRIES: Lazy<Mutex<HashMap<String, usize>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));
static SCRAPE_ERROR_COUNTS: Lazy<Mutex<HashMap<String, usize>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));
static SCRAPE_ERROR_EVENTS: Lazy<Mutex<Vec<Value>>> = Lazy::new(|| Mutex::new(Vec::new()));

pub(super) fn record_empty_selector(context: &str, label: &str) {
    SCRAPE_WARNINGS
        .empty_selectors
        .fetch_add(1, Ordering::Relaxed);
    increment_warning_map(&SCRAPE_WARNING_SELECTORS, format!("{context}.{label}"));
    record_warning_event("empty_selector", context, label);
}

pub(super) fn record_missing_field(context: &str, field: &str) {
    SCRAPE_WARNINGS
        .missing_fields
        .fetch_add(1, Ordering::Relaxed);
    increment_warning_map(&SCRAPE_WARNING_FIELDS, format!("{context}.{field}"));
    record_warning_event("missing_field", context, field);
}

pub(super) fn log_scrape_warning_summary() -> (usize, usize) {
    let empty = SCRAPE_WARNINGS.empty_selectors.load(Ordering::Relaxed);
    let missing = SCRAPE_WARNINGS.missing_fields.load(Ordering::Relaxed);
    if empty == 0 && missing == 0 {
        tracing::info!("scrape warnings: none");
        return (0, 0);
    }
    tracing::warn!(
        empty_selectors = empty,
        missing_fields = missing,
        "scrape warnings summary"
    );
    (empty, missing)
}

pub(super) fn record_warning_event(kind: &str, context: &str, detail: &str) {
    let event = json!({
        "ts": Utc::now().to_rfc3339(),
        "kind": kind,
        "context": context,
        "detail": detail
    });
    let mut guard = match SCRAPE_WARNING_EVENTS.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            tracing::warn!("warning events map poisoned; continuing with recovered map");
            poisoned.into_inner()
        }
    };
    guard.push(event);
}

pub(super) fn record_warning_event_with_snippet(
    kind: &str,
    context: &str,
    detail: &str,
    snippet: &str,
) {
    let event = json!({
        "ts": Utc::now().to_rfc3339(),
        "kind": kind,
        "context": context,
        "detail": detail,
        "snippet": snippet
    });
    let mut guard = match SCRAPE_WARNING_EVENTS.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            tracing::warn!("warning events map poisoned; continuing with recovered map");
            poisoned.into_inner()
        }
    };
    guard.push(event);
}

pub(super) fn record_scrape_error(
    kind: ScrapeErrorKind,
    context: &str,
    detail: &str,
    error: Option<&str>,
) {
    let event = json!({
        "ts": Utc::now().to_rfc3339(),
        "kind": kind.as_str(),
        "context": context,
        "detail": detail,
        "error": error
    });
    let mut guard = match SCRAPE_ERROR_EVENTS.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            tracing::warn!("error events map poisoned; continuing with recovered map");
            poisoned.into_inner()
        }
    };
    guard.push(event);
    increment_error_map(kind.as_str());
}

fn increment_warning_map(map: &Lazy<Mutex<HashMap<String, usize>>>, key: String) {
    let mut guard = match map.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            tracing::warn!("warning counter map poisoned; continuing with recovered map");
            poisoned.into_inner()
        }
    };
    let entry = guard.entry(key).or_insert(0);
    *entry = entry.saturating_add(1);
}

fn increment_error_map(key: &str) {
    let mut guard = match SCRAPE_ERROR_COUNTS.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            tracing::warn!("error counter map poisoned; continuing with recovered map");
            poisoned.into_inner()
        }
    };
    let entry = guard.entry(key.to_string()).or_insert(0);
    *entry = entry.saturating_add(1);
}
