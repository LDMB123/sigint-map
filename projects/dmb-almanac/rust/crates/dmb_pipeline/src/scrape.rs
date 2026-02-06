#![cfg_attr(not(test), deny(clippy::unwrap_used, clippy::expect_used))]

use anyhow::{bail, Context, Result};
use chrono::{Datelike, Utc};
use dmb_core::{Guest, Release, Show, Song, Tour, Venue};
use once_cell::sync::Lazy;
use rand::Rng;
use regex::Regex;
use scraper::{Html, Selector};
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant, SystemTime};

const BASE_URL: &str = "https://www.dmbalmanac.com";
const USER_AGENT: &str = "DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)";
const LARGE_RESPONSE_WARN_BYTES: usize = 2_000_000;

static REGEX_CACHE: Lazy<Mutex<HashMap<String, &'static Regex>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));
#[allow(clippy::expect_used)]
static REGEX_FALLBACK: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"\b\B").expect("compile fallback regex"));
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

#[derive(Debug, Clone, Copy)]
enum ScrapeErrorKind {
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

fn regex(pattern: &str) -> &'static Regex {
    let normalized = if pattern.contains("\\\\") {
        pattern.replace("\\\\", "\\")
    } else {
        pattern.to_string()
    };
    let mut cache = match REGEX_CACHE.lock() {
        Ok(cache) => cache,
        Err(poisoned) => {
            tracing::warn!("regex cache poisoned; continuing with recovered cache");
            poisoned.into_inner()
        }
    };
    if let Some(re) = cache.get(&normalized) {
        return re;
    }
    let compiled = match Regex::new(&normalized) {
        Ok(re) => re,
        Err(err) => {
            tracing::warn!(pattern, normalized, error = ?err, "invalid regex pattern");
            record_scrape_error(
                ScrapeErrorKind::RegexParse,
                "regex",
                pattern,
                Some(&format!("{err:?}")),
            );
            return &REGEX_FALLBACK;
        }
    };
    let leaked: &'static Regex = Box::leak(Box::new(compiled));
    cache.insert(normalized, leaked);
    leaked
}

fn selector_or_warn(name: &str, selector: &str) -> Option<Selector> {
    match Selector::parse(selector) {
        Ok(sel) => Some(sel),
        Err(err) => {
            tracing::warn!(selector, error = ?err, "selector parse failed: {name}");
            record_scrape_error(
                ScrapeErrorKind::SelectorParse,
                "selector",
                selector,
                Some(&format!("{err:?}")),
            );
            None
        }
    }
}

fn warn_if_empty(document: &Html, selector: &Selector, context: &str, label: &str) {
    if document.select(selector).next().is_none() {
        SCRAPE_WARNINGS
            .empty_selectors
            .fetch_add(1, Ordering::Relaxed);
        increment_warning_map(&SCRAPE_WARNING_SELECTORS, format!("{context}.{label}"));
        record_warning_event("empty_selector", context, label);
        tracing::warn!(context, selector = label, "selector matched no elements");
    }
}

fn warn_missing_field(context: &str, field: &str) {
    SCRAPE_WARNINGS
        .missing_fields
        .fetch_add(1, Ordering::Relaxed);
    increment_warning_map(&SCRAPE_WARNING_FIELDS, format!("{context}.{field}"));
    record_warning_event("missing_field", context, field);
    tracing::warn!(context, field, "missing critical field");
}

fn parse_i32_or_warn(raw: Option<&str>, context: &str, field: &str) -> i32 {
    let Some(text) = raw.map(str::trim).filter(|text| !text.is_empty()) else {
        warn_missing_field(context, field);
        return 0;
    };
    match text.parse::<i32>() {
        Ok(value) => value,
        Err(err) => {
            tracing::warn!(context, field, value = text, error = ?err, "failed to parse i32");
            warn_missing_field(context, field);
            0
        }
    }
}

fn parse_i64_or_warn(raw: Option<&str>, context: &str, field: &str) -> i64 {
    let Some(text) = raw.map(str::trim).filter(|text| !text.is_empty()) else {
        warn_missing_field(context, field);
        return 0;
    };
    match text.parse::<i64>() {
        Ok(value) => value,
        Err(err) => {
            tracing::warn!(context, field, value = text, error = ?err, "failed to parse i64");
            warn_missing_field(context, field);
            0
        }
    }
}

fn parse_f64_or_warn(raw: Option<&str>, context: &str, field: &str) -> f64 {
    let Some(text) = raw.map(str::trim).filter(|text| !text.is_empty()) else {
        warn_missing_field(context, field);
        return 0.0;
    };
    match text.parse::<f64>() {
        Ok(value) => value,
        Err(err) => {
            tracing::warn!(context, field, value = text, error = ?err, "failed to parse f64");
            warn_missing_field(context, field);
            0.0
        }
    }
}

fn warn_if_empty_text(context: &str, field: &str, text: &str) {
    if text.trim().is_empty() {
        warn_missing_field(context, field);
    }
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

fn warn_if_missing_value(context: &str, field: &str, value: Option<&Value>) {
    match value {
        None => warn_missing_field(context, field),
        Some(Value::Null) => warn_missing_field(context, field),
        Some(Value::String(text)) if text.trim().is_empty() => warn_missing_field(context, field),
        Some(Value::Array(values)) if values.is_empty() => warn_missing_field(context, field),
        _ => {}
    }
}

fn warn_if_missing_text(context: &str, field: &str, value: Option<&str>) {
    match value {
        None => warn_missing_field(context, field),
        Some(text) if text.trim().is_empty() => warn_missing_field(context, field),
        _ => {}
    }
}

fn log_scrape_warning_summary() -> (usize, usize) {
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

fn write_warning_report(
    path: &Path,
    empty: usize,
    missing: usize,
    warnings_jsonl: Option<&Path>,
) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).with_context(|| format!("create {}", parent.display()))?;
    }
    let missing_by_field = SCRAPE_WARNING_FIELDS
        .lock()
        .map(|map| map.clone())
        .unwrap_or_default();
    let empty_by_selector = SCRAPE_WARNING_SELECTORS
        .lock()
        .map(|map| map.clone())
        .unwrap_or_default();
    let mut missing_by_context: HashMap<String, usize> = HashMap::new();
    for (key, count) in &missing_by_field {
        let context = key.split('.').next().unwrap_or(key).to_string();
        let entry = missing_by_context.entry(context).or_insert(0);
        *entry = entry.saturating_add(*count);
    }
    let mut empty_by_context: HashMap<String, usize> = HashMap::new();
    for (key, count) in &empty_by_selector {
        let context = key.split('.').next().unwrap_or(key).to_string();
        let entry = empty_by_context.entry(context).or_insert(0);
        *entry = entry.saturating_add(*count);
    }
    let http_status_counts = SCRAPE_HTTP_STATUS
        .lock()
        .map(|map| map.clone())
        .unwrap_or_default();
    let endpoint_timings = SCRAPE_ENDPOINT_TIMINGS
        .lock()
        .map(|map| map.clone())
        .unwrap_or_default();
    let endpoint_retries = SCRAPE_ENDPOINT_RETRIES
        .lock()
        .map(|map| map.clone())
        .unwrap_or_default();
    let warning_events = SCRAPE_WARNING_EVENTS
        .lock()
        .map(|events| events.clone())
        .unwrap_or_default();
    let error_events = SCRAPE_ERROR_EVENTS
        .lock()
        .map(|events| events.clone())
        .unwrap_or_default();
    let error_counts = SCRAPE_ERROR_COUNTS
        .lock()
        .map(|map| map.clone())
        .unwrap_or_default();
    let mut warning_events_summary: HashMap<String, usize> = HashMap::new();
    for event in &warning_events {
        if let Some(kind) = event.get("kind").and_then(|v| v.as_str()) {
            *warning_events_summary.entry(kind.to_string()).or_insert(0) += 1;
        }
    }
    let mut error_events_summary: HashMap<String, usize> = HashMap::new();
    for event in &error_events {
        if let Some(kind) = event.get("kind").and_then(|v| v.as_str()) {
            *error_events_summary.entry(kind.to_string()).or_insert(0) += 1;
        }
    }
    let mut top_endpoint_retries: Vec<(String, usize)> = endpoint_retries
        .iter()
        .map(|(k, v)| (k.clone(), *v))
        .collect();
    top_endpoint_retries.sort_by(|a, b| b.1.cmp(&a.1));
    top_endpoint_retries.truncate(10);
    let endpoint_retry_total: usize = endpoint_retries.values().copied().sum();
    let signature = warning_signature(&missing_by_field, &empty_by_selector);
    let mut top_missing_fields: Vec<(String, usize)> = missing_by_field
        .iter()
        .map(|(k, v)| (k.clone(), *v))
        .collect();
    top_missing_fields.sort_by(|a, b| b.1.cmp(&a.1));
    top_missing_fields.truncate(5);
    let mut top_http_status: Vec<(String, usize)> = http_status_counts
        .iter()
        .map(|(k, v)| (k.clone(), *v))
        .collect();
    top_http_status.sort_by(|a, b| b.1.cmp(&a.1));
    top_http_status.truncate(5);
    let mut top_errors: Vec<(String, usize)> =
        error_counts.iter().map(|(k, v)| (k.clone(), *v)).collect();
    top_errors.sort_by(|a, b| b.1.cmp(&a.1));
    top_errors.truncate(5);
    let report = json!({
        "generatedAt": Utc::now().to_rfc3339(),
        "emptySelectors": empty,
        "missingFields": missing,
        "missingByField": missing_by_field,
        "missingByContext": missing_by_context,
        "topMissingFields": top_missing_fields
            .into_iter()
            .map(|(field, count)| json!({"field": field, "count": count}))
            .collect::<Vec<_>>(),
        "emptyBySelector": empty_by_selector,
        "emptyByContext": empty_by_context,
        "httpStatusCounts": http_status_counts,
        "errorCounts": error_counts,
        "topErrors": top_errors
            .into_iter()
            .map(|(kind, count)| json!({"kind": kind, "count": count}))
            .collect::<Vec<_>>(),
        "topHttpStatus": top_http_status
            .into_iter()
            .map(|(status, count)| json!({"status": status, "count": count}))
            .collect::<Vec<_>>(),
        "endpointTimingsMs": endpoint_timings,
        "endpointRetries": endpoint_retries,
        "endpointRetriesTotal": endpoint_retry_total,
        "topEndpointRetries": top_endpoint_retries
            .into_iter()
            .map(|(endpoint, count)| json!({"endpoint": endpoint, "count": count}))
            .collect::<Vec<_>>(),
        "warningEventsSummary": warning_events_summary,
        "errorEventsSummary": error_events_summary,
        "signature": signature
    });
    let file = fs::File::create(path).with_context(|| format!("write {}", path.display()))?;
    serde_json::to_writer_pretty(file, &report).context("serialize warning report")?;
    if let Some(path) = warnings_jsonl {
        write_warning_events(path)?;
    }
    Ok(())
}

fn write_scrape_summary(path: &Path, empty: usize, missing: usize) -> Result<()> {
    let summary_path = path
        .parent()
        .map(|parent| parent.join("scrape-summary.json"))
        .unwrap_or_else(|| PathBuf::from("scrape-summary.json"));
    if let Some(parent) = summary_path.parent() {
        fs::create_dir_all(parent).with_context(|| format!("create {}", parent.display()))?;
    }
    let http_status_counts = SCRAPE_HTTP_STATUS
        .lock()
        .map(|map| map.clone())
        .unwrap_or_default();
    let endpoint_timings = SCRAPE_ENDPOINT_TIMINGS
        .lock()
        .map(|map| map.clone())
        .unwrap_or_default();
    let endpoint_retries = SCRAPE_ENDPOINT_RETRIES
        .lock()
        .map(|map| map.clone())
        .unwrap_or_default();
    let warning_events = SCRAPE_WARNING_EVENTS
        .lock()
        .map(|events| events.clone())
        .unwrap_or_default();
    let error_events = SCRAPE_ERROR_EVENTS
        .lock()
        .map(|events| events.clone())
        .unwrap_or_default();
    let error_counts = SCRAPE_ERROR_COUNTS
        .lock()
        .map(|map| map.clone())
        .unwrap_or_default();
    let mut warning_events_summary: HashMap<String, usize> = HashMap::new();
    for event in &warning_events {
        if let Some(kind) = event.get("kind").and_then(|v| v.as_str()) {
            *warning_events_summary.entry(kind.to_string()).or_insert(0) += 1;
        }
    }
    let mut error_events_summary: HashMap<String, usize> = HashMap::new();
    for event in &error_events {
        if let Some(kind) = event.get("kind").and_then(|v| v.as_str()) {
            *error_events_summary.entry(kind.to_string()).or_insert(0) += 1;
        }
    }
    let mut top_endpoint_retries: Vec<(String, usize)> = endpoint_retries
        .iter()
        .map(|(k, v)| (k.clone(), *v))
        .collect();
    top_endpoint_retries.sort_by(|a, b| b.1.cmp(&a.1));
    top_endpoint_retries.truncate(10);
    let mut top_http_status: Vec<(String, usize)> = http_status_counts
        .iter()
        .map(|(k, v)| (k.clone(), *v))
        .collect();
    top_http_status.sort_by(|a, b| b.1.cmp(&a.1));
    top_http_status.truncate(5);
    let endpoint_retry_total: usize = endpoint_retries.values().copied().sum();
    let summary = json!({
        "generatedAt": Utc::now().to_rfc3339(),
        "emptySelectors": empty,
        "missingFields": missing,
        "httpStatusCounts": http_status_counts,
        "errorCounts": error_counts,
        "topHttpStatus": top_http_status
            .into_iter()
            .map(|(status, count)| json!({"status": status, "count": count}))
            .collect::<Vec<_>>(),
        "endpointTimingsMs": endpoint_timings,
        "endpointRetries": endpoint_retries,
        "endpointRetriesTotal": endpoint_retry_total,
        "topEndpointRetries": top_endpoint_retries
            .into_iter()
            .map(|(endpoint, count)| json!({"endpoint": endpoint, "count": count}))
            .collect::<Vec<_>>(),
        "warningEventsSummary": warning_events_summary,
        "errorEventsSummary": error_events_summary
    });
    let file = fs::File::create(&summary_path)
        .with_context(|| format!("write {}", summary_path.display()))?;
    serde_json::to_writer_pretty(file, &summary).context("serialize scrape summary")?;
    Ok(())
}

fn record_warning_event(kind: &str, context: &str, detail: &str) {
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

fn record_warning_event_with_snippet(kind: &str, context: &str, detail: &str, snippet: &str) {
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

fn record_scrape_error(kind: ScrapeErrorKind, context: &str, detail: &str, error: Option<&str>) {
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

fn write_warning_events(path: &Path) -> Result<()> {
    let events = SCRAPE_WARNING_EVENTS
        .lock()
        .map(|events| events.clone())
        .unwrap_or_default();
    if events.is_empty() {
        return Ok(());
    }
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).with_context(|| format!("create {}", parent.display()))?;
    }
    let mut file = fs::File::create(path).with_context(|| format!("write {}", path.display()))?;
    for event in events {
        let line = serde_json::to_string(&event).context("serialize warning event")?;
        use std::io::Write;
        writeln!(file, "{}", line).context("write warning event")?;
    }
    tracing::info!(path = %path.display(), "wrote warning events jsonl");
    Ok(())
}

fn warning_signature(
    missing_by_field: &HashMap<String, usize>,
    empty_by_selector: &HashMap<String, usize>,
) -> String {
    let mut entries: Vec<String> = missing_by_field
        .iter()
        .map(|(k, v)| format!("missing:{k}={v}"))
        .collect();
    entries.extend(
        empty_by_selector
            .iter()
            .map(|(k, v)| format!("empty:{k}={v}")),
    );
    entries.sort();
    let joined = entries.join("|");
    let mut hasher = sha2::Sha256::new();
    use sha2::Digest;
    hasher.update(joined.as_bytes());
    format!("{:x}", hasher.finalize())
}

#[cfg(test)]
fn reset_warning_state() {
    SCRAPE_WARNINGS.empty_selectors.store(0, Ordering::Relaxed);
    SCRAPE_WARNINGS.missing_fields.store(0, Ordering::Relaxed);
    if let Ok(mut map) = SCRAPE_WARNING_FIELDS.lock() {
        map.clear();
    }
    if let Ok(mut map) = SCRAPE_WARNING_SELECTORS.lock() {
        map.clear();
    }
    if let Ok(mut map) = SCRAPE_HTTP_STATUS.lock() {
        map.clear();
    }
    if let Ok(mut map) = SCRAPE_ENDPOINT_TIMINGS.lock() {
        map.clear();
    }
    if let Ok(mut map) = SCRAPE_ENDPOINT_RETRIES.lock() {
        map.clear();
    }
    if let Ok(mut events) = SCRAPE_WARNING_EVENTS.lock() {
        events.clear();
    }
    if let Ok(mut map) = SCRAPE_ERROR_COUNTS.lock() {
        map.clear();
    }
    if let Ok(mut events) = SCRAPE_ERROR_EVENTS.lock() {
        events.clear();
    }
}

#[cfg(test)]
fn warning_counts() -> (usize, usize) {
    (
        SCRAPE_WARNINGS.empty_selectors.load(Ordering::Relaxed),
        SCRAPE_WARNINGS.missing_fields.load(Ordering::Relaxed),
    )
}

#[cfg(test)]
fn warning_missing_by_field() -> HashMap<String, usize> {
    SCRAPE_WARNING_FIELDS
        .lock()
        .map(|map| map.clone())
        .unwrap_or_default()
}

#[cfg(test)]
fn warning_empty_by_selector() -> HashMap<String, usize> {
    SCRAPE_WARNING_SELECTORS
        .lock()
        .map(|map| map.clone())
        .unwrap_or_default()
}

#[cfg(test)]
fn warning_endpoint_retries() -> HashMap<String, usize> {
    SCRAPE_ENDPOINT_RETRIES
        .lock()
        .map(|map| map.clone())
        .unwrap_or_default()
}

#[cfg(test)]
fn error_counts() -> HashMap<String, usize> {
    SCRAPE_ERROR_COUNTS
        .lock()
        .map(|map| map.clone())
        .unwrap_or_default()
}

#[cfg(test)]
fn error_events() -> Vec<Value> {
    SCRAPE_ERROR_EVENTS
        .lock()
        .map(|events| events.clone())
        .unwrap_or_default()
}

#[cfg(test)]
static TEST_WARNING_LOCK: Lazy<Mutex<()>> = Lazy::new(|| Mutex::new(()));

#[cfg(test)]
fn with_warning_lock<T>(f: impl FnOnce() -> T) -> T {
    let _guard = match TEST_WARNING_LOCK.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    };
    reset_warning_state();
    f()
}

fn object_all_zero(value: &Value) -> bool {
    match value {
        Value::Object(map) => map
            .values()
            .all(|entry| entry.as_i64().map_or(false, |value| value == 0)),
        _ => false,
    }
}

pub struct ScrapeConfig {
    pub output_dir: PathBuf,
    pub cache_dir: PathBuf,
    pub year: Option<i32>,
    pub full: bool,
    pub min_delay_ms: u64,
    pub max_delay_ms: u64,
    pub max_retries: u32,
    pub strict: bool,
    pub warnings_output: Option<PathBuf>,
    pub warnings_max: Option<usize>,
    pub warnings_jsonl: Option<PathBuf>,
    pub dry_run: bool,
    pub warn_only: bool,
    pub fail_on_warning: bool,
    pub max_retries_override: Option<u32>,
    pub endpoint_retry_max: Option<u64>,
    pub cache_ttl_days: Option<u64>,
    pub max_items: Option<usize>,
}

struct ScrapeClient {
    client: reqwest::blocking::Client,
    cache_dir: PathBuf,
    min_delay_ms: u64,
    max_delay_ms: u64,
    max_retries: u32,
    endpoint_retry_max: Option<u64>,
    cache_only: bool,
    cache_ttl_days: Option<u64>,
}

impl ScrapeClient {
    fn new(
        cache_dir: PathBuf,
        min_delay_ms: u64,
        max_delay_ms: u64,
        max_retries: u32,
        endpoint_retry_max: Option<u64>,
        cache_only: bool,
        cache_ttl_days: Option<u64>,
    ) -> Result<Self> {
        let client = reqwest::blocking::Client::builder()
            .user_agent(USER_AGENT)
            .build()
            .context("build http client")?;
        Ok(Self {
            client,
            cache_dir,
            min_delay_ms,
            max_delay_ms,
            max_retries,
            endpoint_retry_max,
            cache_only,
            cache_ttl_days,
        })
    }

    fn fetch_html(&self, url: &str) -> Result<String> {
        let start = Instant::now();
        let hash = blake3::hash(url.as_bytes()).to_hex().to_string();
        let cache_path = self.cache_dir.join(format!("{hash}.html"));
        let endpoint = url
            .split('/')
            .next_back()
            .unwrap_or("unknown")
            .split('?')
            .next()
            .unwrap_or("unknown");
        if cache_path.exists() {
            if let Some(ttl_days) = self.cache_ttl_days {
                if let Ok(metadata) = fs::metadata(&cache_path) {
                    if let Ok(modified) = metadata.modified() {
                        let age = SystemTime::now()
                            .duration_since(modified)
                            .unwrap_or_else(|_| Duration::from_secs(0));
                        if age > Duration::from_secs(ttl_days.saturating_mul(86_400)) {
                            let _ = fs::remove_file(&cache_path);
                        }
                    }
                }
            }
            if cache_path.exists() {
                let contents = fs::read_to_string(&cache_path)
                    .with_context(|| format!("read cache {}", cache_path.display()))
                    .map_err(|err| {
                        record_scrape_error(
                            ScrapeErrorKind::CacheRead,
                            "cache",
                            &cache_path.to_string_lossy(),
                            Some(&format!("{err:?}")),
                        );
                        err
                    })?;
                record_endpoint_timing(endpoint, start.elapsed());
                tracing::info!(
                    url,
                    source = "cache",
                    elapsed_ms = start.elapsed().as_millis() as u64,
                    "fetch html"
                );
                return Ok(contents);
            }
        }
        if self.cache_only {
            record_scrape_error(
                ScrapeErrorKind::CacheMissing,
                "cache",
                url,
                Some("cache-only scrape missing cached html"),
            );
            bail!("cache-only scrape missing cached html for {}", url);
        }
        let mut attempt: u32 = 0;
        let mut last_error = anyhow::anyhow!("fetch failed for {}", url);
        loop {
            attempt += 1;
            let response = self.client.get(url).send();
            match response {
                Ok(resp) => {
                    let status = resp.status();
                    if status.is_success() {
                        let response = resp
                            .text()
                            .with_context(|| format!("read response body from {}", url))?;
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
                            last_error = anyhow::anyhow!("empty response body for {}", url);
                            if attempt <= self.max_retries {
                                self.sleep_jitter();
                                continue;
                            }
                            return Err(last_error);
                        }
                        fs::write(&cache_path, &response)
                            .with_context(|| format!("write cache {}", cache_path.display()))
                            .map_err(|err| {
                                record_scrape_error(
                                    ScrapeErrorKind::CacheWrite,
                                    "cache",
                                    &cache_path.to_string_lossy(),
                                    Some(&format!("{err:?}")),
                                );
                                err
                            })?;
                        self.sleep_jitter();
                        record_endpoint_timing(endpoint, start.elapsed());
                        tracing::info!(
                            url,
                            source = "network",
                            status = status.as_u16(),
                            elapsed_ms = start.elapsed().as_millis() as u64,
                            "fetch html"
                        );
                        return Ok(response);
                    }

                    let retryable = status.as_u16() == 429 || status.is_server_error();
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
                        max_retries = self.max_retries,
                        retryable,
                        retry_after = retry_after.map(|d| d.as_secs()),
                        "http fetch failed"
                    );
                    record_scrape_error(
                        ScrapeErrorKind::HttpStatus,
                        "http",
                        url,
                        Some(&format!("status {}", status.as_u16())),
                    );
                    let err = anyhow::anyhow!(
                        "http error {} for {} (attempt {}/{})",
                        status,
                        url,
                        attempt,
                        self.max_retries
                    );
                    if !retryable {
                        return Err(err);
                    }
                    last_error = err;
                    if attempt >= self.max_retries {
                        break;
                    }
                    if let Some(max) = self.endpoint_retry_max {
                        let current = endpoint_retry_count(endpoint);
                        if current >= max {
                            record_warning_event("retry_budget_exceeded", "http", endpoint);
                            last_error = anyhow::anyhow!(
                                "endpoint retry budget exceeded: {} retries {} >= max {}",
                                endpoint,
                                current,
                                max
                            );
                            tracing::error!(
                                endpoint,
                                retries = current,
                                max,
                                "endpoint retry budget exceeded"
                            );
                            break;
                        }
                    }
                    record_endpoint_retry(endpoint);
                    self.sleep_backoff(attempt, retry_after);
                    continue;
                }
                Err(err) => {
                    increment_http_status(url, None);
                    tracing::warn!(
                        url,
                        error = %err,
                        attempt,
                        max_retries = self.max_retries,
                        "http request error"
                    );
                    record_scrape_error(
                        ScrapeErrorKind::HttpRequest,
                        "http",
                        url,
                        Some(&format!("{err:?}")),
                    );
                    last_error = anyhow::anyhow!(
                        "fetch {}: {} (attempt {}/{})",
                        url,
                        err,
                        attempt,
                        self.max_retries
                    );
                    if attempt >= self.max_retries {
                        break;
                    }
                    if let Some(max) = self.endpoint_retry_max {
                        let current = endpoint_retry_count(endpoint);
                        if current >= max {
                            record_warning_event("retry_budget_exceeded", "http", endpoint);
                            last_error = anyhow::anyhow!(
                                "endpoint retry budget exceeded: {} retries {} >= max {}",
                                endpoint,
                                current,
                                max
                            );
                            tracing::error!(
                                endpoint,
                                retries = current,
                                max,
                                "endpoint retry budget exceeded"
                            );
                            break;
                        }
                    }
                    record_endpoint_retry(endpoint);
                    self.sleep_backoff(attempt, None);
                }
            }
        }
        Err(last_error)
    }

    fn sleep_jitter(&self) {
        let mut rng = rand::thread_rng();
        let delay = rng.gen_range(self.min_delay_ms..=self.max_delay_ms.max(self.min_delay_ms));
        thread::sleep(Duration::from_millis(delay));
    }

    fn sleep_backoff(&self, attempt: u32, retry_after: Option<Duration>) {
        let mut rng = rand::thread_rng();
        let base = self.min_delay_ms.max(250);
        let exp = 2u64.saturating_pow(attempt.min(5));
        let mut delay_ms = base.saturating_mul(exp);
        let max_delay = self.max_delay_ms.max(base);
        delay_ms = delay_ms.min(max_delay);
        if let Some(retry_after) = retry_after {
            delay_ms = delay_ms.max(retry_after.as_millis() as u64);
        }
        let jitter = rng.gen_range(0..=250);
        thread::sleep(Duration::from_millis(delay_ms + jitter));
    }

    fn prune_cache(&self) -> Result<()> {
        let Some(ttl_days) = self.cache_ttl_days else {
            return Ok(());
        };
        let ttl = Duration::from_secs(ttl_days.saturating_mul(86_400));
        let now = SystemTime::now();
        for entry in fs::read_dir(&self.cache_dir)
            .with_context(|| format!("read {}", self.cache_dir.display()))?
        {
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
}

pub fn scrape_live(config: ScrapeConfig) -> Result<()> {
    let output_enabled = !config.dry_run;
    if output_enabled {
        fs::create_dir_all(&config.output_dir)
            .with_context(|| format!("create {}", config.output_dir.display()))?;
    }
    fs::create_dir_all(&config.cache_dir)
        .with_context(|| format!("create {}", config.cache_dir.display()))?;

    let client = ScrapeClient::new(
        config.cache_dir,
        config.min_delay_ms,
        config.max_delay_ms,
        config.max_retries_override.unwrap_or(config.max_retries),
        config.endpoint_retry_max,
        config.dry_run,
        config.cache_ttl_days,
    )?;
    client.prune_cache()?;

    let venues = scrape_venues(&client)?;
    let mut venues = venues;
    apply_max_items(&mut venues, config.max_items);
    write_json_if(
        &config.output_dir.join("venues.json"),
        &venues,
        output_enabled,
    )?;
    tracing::info!(context = "venues", count = venues.len(), "scrape items");

    let songs = scrape_songs(&client)?;
    let mut songs = songs;
    apply_max_items(&mut songs, config.max_items);
    write_json_if(
        &config.output_dir.join("songs.json"),
        &songs,
        output_enabled,
    )?;
    tracing::info!(context = "songs", count = songs.len(), "scrape items");

    let guests = scrape_guests(&client)?;
    let mut guests = guests;
    apply_max_items(&mut guests, config.max_items);
    write_json_if(
        &config.output_dir.join("guests.json"),
        &guests,
        output_enabled,
    )?;
    tracing::info!(context = "guests", count = guests.len(), "scrape items");

    let (tours, show_urls) = scrape_tours(&client, config.year)?;
    let mut tours = tours;
    apply_max_items(&mut tours, config.max_items);
    let mut show_urls = show_urls;
    if let Some(limit) = config.max_items {
        for urls in show_urls.values_mut() {
            if urls.len() > limit {
                urls.truncate(limit);
            }
        }
    }
    write_json_if(
        &config.output_dir.join("tours.json"),
        &tours,
        output_enabled,
    )?;
    tracing::info!(context = "tours", count = tours.len(), "scrape items");

    let shows = scrape_shows(&client, &show_urls)?;
    let mut shows = shows;
    apply_max_items(&mut shows, config.max_items);
    write_json_if(
        &config.output_dir.join("shows.json"),
        &shows,
        output_enabled,
    )?;
    tracing::info!(context = "shows", count = shows.len(), "scrape items");

    let releases = scrape_releases(&client)?;
    let mut releases = releases;
    apply_max_items(&mut releases, config.max_items);
    write_json_if(
        &config.output_dir.join("releases.json"),
        &releases,
        output_enabled,
    )?;
    tracing::info!(context = "releases", count = releases.len(), "scrape items");

    if config.full {
        let venue_stats = scrape_venue_stats(&client, &shows)?;
        let mut venue_stats = venue_stats;
        apply_max_items(&mut venue_stats, config.max_items);
        write_json_if(
            &config.output_dir.join("venue-stats.json"),
            &venue_stats,
            output_enabled,
        )?;
        tracing::info!(
            context = "venue_stats",
            count = venue_stats.len(),
            "scrape items"
        );

        let guest_shows = scrape_guest_shows(&client, &guests)?;
        let mut guest_shows = guest_shows;
        apply_max_items(&mut guest_shows, config.max_items);
        write_json_if(
            &config.output_dir.join("guest-shows.json"),
            &guest_shows,
            output_enabled,
        )?;
        tracing::info!(
            context = "guest_shows",
            count = guest_shows.len(),
            "scrape items"
        );

        let song_stats = scrape_song_stats(&client, &songs)?;
        let mut song_stats = song_stats;
        apply_max_items(&mut song_stats, config.max_items);
        write_json_if(
            &config.output_dir.join("song-stats.json"),
            &song_stats,
            output_enabled,
        )?;
        tracing::info!(
            context = "song_stats",
            count = song_stats.len(),
            "scrape items"
        );

        let liberation = scrape_liberation(&client)?;
        let mut liberation = liberation;
        apply_max_items(&mut liberation, config.max_items);
        write_json_if(
            &config.output_dir.join("liberation.json"),
            &liberation,
            output_enabled,
        )?;
        tracing::info!(
            context = "liberation",
            count = liberation.len(),
            "scrape items"
        );

        let rarity = scrape_rarity(&client)?;
        let mut rarity = rarity;
        apply_max_items(&mut rarity, config.max_items);
        write_json_if(
            &config.output_dir.join("rarity.json"),
            &rarity,
            output_enabled,
        )?;
        tracing::info!(context = "rarity", count = rarity.len(), "scrape items");

        let history = scrape_history(&client)?;
        let mut history = history;
        apply_max_items(&mut history, config.max_items);
        write_json_if(
            &config.output_dir.join("history.json"),
            &history,
            output_enabled,
        )?;
        tracing::info!(context = "history", count = history.len(), "scrape items");

        let lists = scrape_lists(&client)?;
        let mut lists = lists;
        apply_max_items(&mut lists, config.max_items);
        write_json_if(
            &config.output_dir.join("lists.json"),
            &lists,
            output_enabled,
        )?;
        tracing::info!(context = "lists", count = lists.len(), "scrape items");
    }

    let (empty, missing) = log_scrape_warning_summary();
    log_scrape_http_summary();
    if let Some(path) = &config.warnings_output {
        write_warning_report(path, empty, missing, config.warnings_jsonl.as_deref())?;
        write_scrape_summary(path, empty, missing)?;
    }
    let total_warnings = empty + missing;
    if config.fail_on_warning && total_warnings > 0 {
        bail!(
            "scrape warnings detected: {} empty selectors, {} missing fields",
            empty,
            missing
        );
    }
    if config.strict && !config.warn_only && total_warnings > 0 {
        bail!(
            "scrape strict mode failed: {} empty selectors, {} missing fields",
            empty,
            missing
        );
    }
    if let Some(max_allowed) = config.warnings_max {
        if config.warn_only {
            return Ok(());
        }
        let total = empty + missing;
        if total > max_allowed {
            bail!(
                "scrape warning budget exceeded: {} warnings (max {})",
                total,
                max_allowed
            );
        }
    }
    Ok(())
}

pub fn scrape_fixtures(
    fixtures_dir: &Path,
    warnings_output: Option<PathBuf>,
    warnings_max: Option<usize>,
    warnings_jsonl: Option<PathBuf>,
    fail_on_warning: bool,
) -> Result<()> {
    let song_stats = fs::read_to_string(fixtures_dir.join("song_stats.html"))
        .with_context(|| "read song_stats fixture")?;
    let venue_stats = fs::read_to_string(fixtures_dir.join("venue_stats.html"))
        .with_context(|| "read venue_stats fixture")?;
    let guest_shows = fs::read_to_string(fixtures_dir.join("guest_shows.html"))
        .with_context(|| "read guest_shows fixture")?;
    let liberations = fs::read_to_string(fixtures_dir.join("liberations.html"))
        .with_context(|| "read liberations fixture")?;
    let venue_history = fs::read_to_string(fixtures_dir.join("venue_show_history.html"))
        .with_context(|| "read venue_show_history fixture")?;
    let song_performances = fs::read_to_string(fixtures_dir.join("song_performances.html"))
        .with_context(|| "read song_performances fixture")?;
    let lists = fs::read_to_string(fixtures_dir.join("lists.html"))
        .with_context(|| "read lists fixture")?;

    let _ = parse_song_stats_page(&song_stats, 1, "Fixture Song");
    let _ = parse_venue_stats_page(&venue_stats, 1);
    let _ = parse_guest_shows_page(&guest_shows, 1, "Fixture Guest");
    let document = Html::parse_document(&liberations);
    let _ = parse_song_liberations(&document);
    let document = Html::parse_document(&venue_history);
    let _ = parse_venue_show_history(&document);
    let document = Html::parse_document(&song_performances);
    let _ = parse_song_performances(&document);
    let _ = parse_lists_page(&lists);

    let (empty, missing) = log_scrape_warning_summary();
    if let Some(path) = warnings_output.as_ref() {
        write_warning_report(path, empty, missing, warnings_jsonl.as_deref())?;
        write_scrape_summary(path, empty, missing)?;
    }
    if fail_on_warning && (empty + missing) > 0 {
        bail!(
            "fixture warnings detected: {} empty selectors, {} missing fields",
            empty,
            missing
        );
    }
    if let Some(max_allowed) = warnings_max {
        let total = empty + missing;
        if total > max_allowed {
            bail!(
                "fixture warning budget exceeded: {} warnings (max {})",
                total,
                max_allowed
            );
        }
    }
    Ok(())
}

fn apply_max_items<T>(items: &mut Vec<T>, limit: Option<usize>) {
    if let Some(limit) = limit {
        if items.len() > limit {
            items.truncate(limit);
        }
    }
}

fn increment_http_status(url: &str, status: Option<u16>) {
    let endpoint = url
        .split('/')
        .next_back()
        .unwrap_or("unknown")
        .split('?')
        .next()
        .unwrap_or("unknown");
    let key = match status {
        Some(code) => format!("{endpoint}:{code}"),
        None => format!("{endpoint}:network"),
    };
    increment_warning_map(&SCRAPE_HTTP_STATUS, key);
}

fn record_endpoint_timing(endpoint: &str, elapsed: Duration) {
    let mut guard = match SCRAPE_ENDPOINT_TIMINGS.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            tracing::warn!("endpoint timing map poisoned; continuing with recovered map");
            poisoned.into_inner()
        }
    };
    let entry = guard.entry(endpoint.to_string()).or_insert(0);
    let elapsed_ms = elapsed.as_millis() as u64;
    *entry = (*entry).max(elapsed_ms);
}

fn record_endpoint_retry(endpoint: &str) {
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

fn endpoint_retry_count(endpoint: &str) -> u64 {
    let guard = match SCRAPE_ENDPOINT_RETRIES.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            tracing::warn!("endpoint retries map poisoned; continuing with recovered map");
            poisoned.into_inner()
        }
    };
    guard.get(endpoint).copied().unwrap_or(0) as u64
}

fn log_scrape_http_summary() {
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

fn write_json<T: serde::Serialize>(path: &Path, data: &T) -> Result<()> {
    let file = fs::File::create(path).with_context(|| format!("write {}", path.display()))?;
    serde_json::to_writer_pretty(file, data).context("serialize json")?;
    Ok(())
}

fn write_json_if<T: serde::Serialize>(path: &Path, data: &T, enabled: bool) -> Result<()> {
    if enabled {
        write_json(path, data)?;
    }
    Ok(())
}

fn scrape_venues(client: &ScrapeClient) -> Result<Vec<Venue>> {
    let url = format!("{BASE_URL}/VenueStats.aspx");
    let html = client.fetch_html(&url)?;
    let document = Html::parse_document(&html);
    let Some(selector) = selector_or_warn(
        "venue link selector",
        "a[href*='VenueStats.aspx'][href*='vid=']",
    ) else {
        return Ok(Vec::new());
    };
    warn_if_empty(&document, &selector, "venues", "list_link");
    let mut urls = Vec::new();
    let mut seen = HashSet::new();

    for element in document.select(&selector) {
        if let Some(href) = element.value().attr("href") {
            let full = if href.starts_with("http") {
                href.to_string()
            } else if href.starts_with('/') {
                format!("{BASE_URL}{href}")
            } else {
                format!("{BASE_URL}/{href}")
            };
            if seen.insert(full.clone()) {
                urls.push(full);
            }
        }
    }
    if urls.is_empty() {
        tracing::warn!("scrape_venues: no venue links found");
        warn_missing_field("venues", "links");
    }

    let mut venues = Vec::new();
    for venue_url in urls {
        if let Some(venue) = parse_venue_page(client, &venue_url)? {
            venues.push(venue);
        }
    }
    if venues.is_empty() {
        warn_missing_field("venues", "list");
    }
    Ok(venues)
}

fn parse_venue_page(client: &ScrapeClient, url: &str) -> Result<Option<Venue>> {
    let html = client.fetch_html(url)?;
    parse_venue_page_html(&html, url)
}

fn parse_venue_page_html(html: &str, url: &str) -> Result<Option<Venue>> {
    let document = Html::parse_document(html);

    let vid = regex(r"vid=(\d+)");
    let id = parse_i32_or_warn(
        vid.captures(url)
            .and_then(|cap| cap.get(1).map(|m| m.as_str())),
        "venue",
        "id",
    );

    let name = select_first_text(
        &document,
        &["h1", "h2", ".venue-name", ".page-title", "#venue-name"],
    );
    if name.is_empty() {
        warn_missing_field("venue", "name");
        return Ok(None);
    }
    if id == 0 {
        warn_missing_field("venue", "id");
    }

    let location_text = select_first_text(
        &document,
        &[
            ".venue-location",
            ".location",
            ".venue-city",
            ".city-state",
            "[itemprop='address']",
        ],
    );
    let body_text = document.root_element().text().collect::<Vec<_>>().join(" ");

    let (city, state, country) = parse_location(&location_text)
        .or_else(|| parse_location(&body_text))
        .unwrap_or_else(|| {
            warn_missing_field("venue", "location");
            (String::new(), None, "USA".to_string())
        });
    if city.is_empty() {
        warn_missing_field("venue", "city");
    }

    let venue_type = guess_venue_type(&name, &body_text);

    let total_shows = regex(r"Total Shows?:\s*(\d+)")
        .captures(&body_text)
        .and_then(|cap| cap.get(1))
        .and_then(|m| m.as_str().parse::<i32>().ok());

    let country_code =
        if country.eq_ignore_ascii_case("usa") || country.eq_ignore_ascii_case("united states") {
            Some("US".to_string())
        } else {
            None
        };

    let search_text = build_search_text(&[&name, &city, state.as_deref().unwrap_or(""), &country]);

    Ok(Some(Venue {
        id,
        name,
        city,
        state,
        country,
        country_code,
        venue_type,
        total_shows,
        search_text: Some(search_text),
    }))
}

fn scrape_songs(client: &ScrapeClient) -> Result<Vec<Song>> {
    let url = format!("{BASE_URL}/songs/all-songs.aspx");
    let html = client.fetch_html(&url)?;
    let document = Html::parse_document(&html);
    let Some(selector) =
        selector_or_warn("song link selector", "a[href*='songs/summary.aspx?sid=']")
    else {
        return Ok(Vec::new());
    };
    warn_if_empty(&document, &selector, "songs", "list_link");
    let mut urls = Vec::new();
    let mut seen = HashSet::new();

    for element in document.select(&selector) {
        if let Some(href) = element.value().attr("href") {
            let full = if href.starts_with("http") {
                href.to_string()
            } else if href.starts_with('/') {
                format!("{BASE_URL}{href}")
            } else {
                format!("{BASE_URL}/{href}")
            };
            if seen.insert(full.clone()) {
                urls.push(full);
            }
        }
    }
    if urls.is_empty() {
        tracing::warn!("scrape_songs: no song links found");
        warn_missing_field("songs", "links");
    }

    let mut songs = Vec::new();
    for song_url in urls {
        if let Some(song) = parse_song_page(client, &song_url)? {
            songs.push(song);
        }
    }
    if songs.is_empty() {
        warn_missing_field("songs", "list");
    }
    Ok(songs)
}

fn parse_song_page(client: &ScrapeClient, url: &str) -> Result<Option<Song>> {
    let html = client.fetch_html(url)?;
    let document = Html::parse_document(&html);

    let sid = regex(r"sid=(\d+)");
    let id = parse_i32_or_warn(
        sid.captures(url)
            .and_then(|cap| cap.get(1).map(|m| m.as_str())),
        "song",
        "id",
    );

    let title = select_first_text(
        &document,
        &["h1", ".song-title", ".songTitle", "#songTitle"],
    );
    if title.is_empty() {
        warn_missing_field("song", "title");
        return Ok(None);
    }
    if id == 0 {
        warn_missing_field("song", "id");
    }
    let slug = slugify(&title);
    let sort_title = create_sort_title(&title);
    let search_text = title.to_lowercase();

    let body_text = document.root_element().text().collect::<Vec<_>>().join(" ");
    warn_if_empty_text("song", "body", &body_text);
    let total_performances = regex(r"(\d+)\s+(?:times?|performances?|shows?)")
        .captures(&body_text)
        .and_then(|cap| cap.get(1))
        .and_then(|m| m.as_str().parse::<i32>().ok());
    let last_played_date = regex(r"last(?:\s+played)?[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})")
        .captures(&body_text)
        .and_then(|cap| cap.get(1))
        .map(|m| parse_date(m.as_str()));

    Ok(Some(Song {
        id,
        slug,
        title,
        sort_title: Some(sort_title),
        total_performances,
        last_played_date,
        is_liberated: None,
        opener_count: None,
        closer_count: None,
        encore_count: None,
        search_text: Some(search_text),
    }))
}

fn scrape_guests(client: &ScrapeClient) -> Result<Vec<Guest>> {
    let url = format!("{BASE_URL}/GuestStats.aspx");
    let html = client.fetch_html(&url)?;
    let document = Html::parse_document(&html);
    let Some(selector) = selector_or_warn(
        "guest link selector",
        "a[href*='GuestStats.aspx'][href*='gid=']",
    ) else {
        return Ok(Vec::new());
    };
    warn_if_empty(&document, &selector, "guests", "list_link");
    let mut urls = Vec::new();
    let mut seen = HashSet::new();

    for element in document.select(&selector) {
        if let Some(href) = element.value().attr("href") {
            let full = if href.starts_with("http") {
                href.to_string()
            } else if href.starts_with('/') {
                format!("{BASE_URL}{href}")
            } else {
                format!("{BASE_URL}/{href}")
            };
            if seen.insert(full.clone()) {
                urls.push(full);
            }
        }
    }
    if urls.is_empty() {
        tracing::warn!("scrape_guests: no guest links found");
        warn_missing_field("guests", "links");
    }

    let mut guests = Vec::new();
    for guest_url in urls {
        if let Some(guest) = parse_guest_page(client, &guest_url)? {
            guests.push(guest);
        }
    }
    if guests.is_empty() {
        warn_missing_field("guests", "list");
    }
    Ok(guests)
}

fn parse_guest_page(client: &ScrapeClient, url: &str) -> Result<Option<Guest>> {
    let html = client.fetch_html(url)?;
    let document = Html::parse_document(&html);

    let gid = regex(r"gid=(\d+)");
    let id = parse_i32_or_warn(
        gid.captures(url)
            .and_then(|cap| cap.get(1).map(|m| m.as_str())),
        "guest",
        "id",
    );
    if id == 0 {
        warn_missing_field("guest", "id");
    }

    let name = select_first_text(&document, &["h1", ".guest-name"]);
    if name.is_empty() {
        warn_missing_field("guest", "name");
        return Ok(None);
    }
    let slug = slugify(&name);

    let body_text = document.root_element().text().collect::<Vec<_>>().join(" ");
    warn_if_empty_text("guest", "body", &body_text);
    let total_appearances = regex(r"(\d+)\s+(?:appearances?|shows?)")
        .captures(&body_text)
        .and_then(|cap| cap.get(1))
        .and_then(|m| m.as_str().parse::<i32>().ok());
    if total_appearances.is_none() {
        warn_missing_field("guest", "totalAppearances");
    }

    let search_text = build_search_text(&[&name]);

    Ok(Some(Guest {
        id,
        slug,
        name,
        total_appearances,
        search_text: Some(search_text),
    }))
}

type ToursWithShows = (Vec<Tour>, HashMap<i32, Vec<String>>);

fn scrape_tours(client: &ScrapeClient, year_filter: Option<i32>) -> Result<ToursWithShows> {
    let current_year = chrono::Utc::now().year();
    let start_year = 1991;
    let mut tours = Vec::new();
    let mut show_urls_by_year = HashMap::new();

    let years: Vec<i32> = if let Some(year) = year_filter {
        vec![year]
    } else {
        (start_year..=current_year).collect()
    };

    for year in years {
        let urls = get_show_urls_for_year(client, year)?;
        if urls.is_empty() {
            warn_missing_field("tour", "shows");
        }
        show_urls_by_year.insert(year, urls.clone());
        tours.push(Tour {
            id: year,
            year,
            name: format!("{year} Tour"),
            total_shows: Some(urls.len() as i32),
            search_text: Some(format!("{year} tour")),
        });
    }

    if tours.is_empty() {
        warn_missing_field("tours", "list");
    }
    Ok((tours, show_urls_by_year))
}

fn get_show_urls_for_year(client: &ScrapeClient, year: i32) -> Result<Vec<String>> {
    let url = format!("{BASE_URL}/TourShow.aspx?where={year}");
    let html = client.fetch_html(&url)?;
    let document = Html::parse_document(&html);
    let Some(selector) = selector_or_warn(
        "show link selector",
        "a[href*='TourShowSet.aspx'][href*='id=']",
    ) else {
        return Ok(Vec::new());
    };
    warn_if_empty(&document, &selector, "tour", "show_links");
    let mut urls = Vec::new();
    let mut seen = HashSet::new();

    for element in document.select(&selector) {
        if let Some(href) = element.value().attr("href") {
            let full = if href.starts_with("http") {
                href.to_string()
            } else if href.starts_with('/') {
                format!("{BASE_URL}{href}")
            } else {
                format!("{BASE_URL}/{href}")
            };
            if seen.insert(full.clone()) {
                urls.push(full);
            }
        }
    }
    if urls.is_empty() {
        tracing::warn!(
            "get_show_urls_for_year: no show links found for year {}",
            year
        );
        warn_missing_field("tour", "showUrls");
    }
    Ok(urls)
}

fn scrape_shows(
    client: &ScrapeClient,
    show_urls_by_year: &HashMap<i32, Vec<String>>,
) -> Result<Vec<Show>> {
    let mut shows = Vec::new();
    for (year, urls) in show_urls_by_year {
        for show_url in urls {
            if let Some(show) = parse_show_page(client, show_url, *year)? {
                shows.push(show);
            }
        }
    }
    if shows.is_empty() {
        warn_missing_field("shows", "list");
    }
    Ok(shows)
}

fn parse_show_page(client: &ScrapeClient, url: &str, tour_year: i32) -> Result<Option<Show>> {
    let html = client.fetch_html(url)?;
    let document = Html::parse_document(&html);

    let show_id = regex(r"id=(\d+)");
    let id = parse_i32_or_warn(
        show_id
            .captures(url)
            .and_then(|cap| cap.get(1).map(|m| m.as_str())),
        "show",
        "id",
    );

    warn_if_no_selector_match(
        &document,
        "show",
        "dateSelector",
        &["select option:selected", ".show-date", "h1", "h2"],
    );
    let date = extract_show_date_with_body(&document);
    if date.is_none() {
        warn_missing_field("show", "date");
    }
    let date = date.unwrap_or_else(|| format!("{tour_year}-01-01"));
    let year = date
        .get(0..4)
        .and_then(|s| s.parse::<i32>().ok())
        .unwrap_or_else(|| {
            warn_missing_field("show", "year");
            tour_year
        });

    let (venue_id, song_count) = extract_show_meta(&document);
    if venue_id == 0 {
        warn_missing_field("show", "venueId");
        return Ok(None);
    }

    Ok(Some(Show {
        id,
        date,
        venue_id,
        tour_id: Some(tour_year),
        year,
        song_count,
        rarity_index: None,
    }))
}

fn extract_show_meta(document: &Html) -> (i32, Option<i32>) {
    let mut venue_id = 0;
    let mut venue_id_missing = false;
    warn_if_no_selector_match(
        document,
        "show",
        "venueLinkSelector",
        &["a[href*='VenueStats.aspx']", "a[href*='VenueStats']"],
    );
    if let Some(selector) =
        selector_or_warn("show venue link selector", "a[href*='VenueStats.aspx']")
    {
        warn_if_empty(document, &selector, "show", "venue_link");
        if let Some(link) = document.select(&selector).next() {
            if let Some(href) = link.value().attr("href") {
                if let Some(caps) = regex(r"vid=(\d+)").captures(href) {
                    if let Some(m) = caps.get(1) {
                        venue_id = match m.as_str().parse::<i32>() {
                            Ok(value) => value,
                            Err(err) => {
                                tracing::warn!(
                                    context = "show",
                                    field = "venueId",
                                    value = m.as_str(),
                                    error = ?err,
                                    "failed to parse venue id"
                                );
                                venue_id_missing = true;
                                0
                            }
                        };
                    }
                } else {
                    venue_id_missing = true;
                }
            } else {
                warn_missing_field("show", "venueHref");
                venue_id_missing = true;
            }
        }
    }
    if venue_id == 0 {
        venue_id_missing = true;
    }
    if venue_id_missing {
        warn_missing_field("show", "venueId");
    }

    let mut song_count: i32 = 0;
    if let Some(selector) = selector_or_warn("set table rows", "#SetTable tr") {
        warn_if_empty(document, &selector, "show", "set_rows");
        let link_selector = selector_or_warn(
            "set header song link selector",
            "td.setheadercell a[href*='SongStats'], td.setheadercell a[href*='songs/summary']",
        );
        if link_selector.is_none() {
            warn_missing_field("show", "songCount");
        }
        for row in document.select(&selector) {
            if let Some(link_selector) = link_selector.as_ref() {
                if row.select(link_selector).next().is_some() {
                    song_count += 1;
                }
            }
        }
        if song_count == 0 {
            warn_missing_field("show", "songCount");
        }
    }
    if song_count > 0 {
        warn_if_out_of_range("show", "songCount", i64::from(song_count), 1, 60);
    }

    (
        venue_id,
        if song_count > 0 {
            Some(song_count)
        } else {
            None
        },
    )
}

fn extract_show_date(document: &Html) -> Option<String> {
    if let Some(selector) = selector_or_warn("selected option selector", "select option:selected") {
        warn_if_empty(document, &selector, "show", "date_select");
        for element in document.select(&selector) {
            let text = element.text().collect::<String>();
            if let Some(parsed) = parse_show_date(&text) {
                return Some(parsed);
            }
        }
    }
    if let Some(selector) = selector_or_warn("show date selector", ".show-date, h1, h2") {
        warn_if_empty(document, &selector, "show", "date_text");
        if let Some(element) = document.select(&selector).next() {
            let text = element.text().collect::<String>();
            if let Some(parsed) = parse_show_date(&text) {
                return Some(parsed);
            }
        }
    }
    None
}

fn extract_show_date_with_body(document: &Html) -> Option<String> {
    if let Some(date) = extract_show_date(document) {
        return Some(date);
    }
    let body_text = document.root_element().text().collect::<Vec<_>>().join(" ");
    if let Some(parsed) = parse_show_date(&body_text) {
        return Some(parsed);
    }
    None
}

fn scrape_releases(client: &ScrapeClient) -> Result<Vec<Release>> {
    let url = format!("{BASE_URL}/DiscographyList.aspx");
    let html = client.fetch_html(&url)?;
    let document = Html::parse_document(&html);
    let links = parse_release_links(&document);
    let mut releases = Vec::new();
    let mut seen = HashSet::new();
    for (id, title, href) in links {
        if seen.insert(id) {
            let full = if href.starts_with("http") {
                href
            } else if href.starts_with('/') {
                format!("{BASE_URL}{href}")
            } else {
                format!("{BASE_URL}/{href}")
            };
            if let Some(release) = parse_release_page(client, &full, id, &title)? {
                releases.push(release);
            }
        }
    }
    if releases.is_empty() {
        tracing::warn!("scrape_releases: no releases found");
        warn_missing_field("releases", "list");
    }
    Ok(releases)
}

fn parse_release_links(document: &Html) -> Vec<(i32, String, String)> {
    let Some(selector) = selector_or_warn("release link selector", "a[href*='ReleaseView.aspx']")
    else {
        return Vec::new();
    };
    warn_if_empty(document, &selector, "releases", "list_link");
    let mut releases = Vec::new();
    for element in document.select(&selector) {
        let Some(href) = element.value().attr("href") else {
            warn_missing_field("release", "href");
            continue;
        };
        let title = normalize_whitespace(&element.text().collect::<String>());
        let id = if let Some(cap) = regex(r"release=([^&]+)").captures(href) {
            let id_str = cap.get(1).map(|m| m.as_str()).unwrap_or("");
            stable_id_from_string(id_str)
        } else {
            warn_missing_field("release", "id");
            0
        };
        if id == 0 {
            warn_missing_field("release", "id");
        }
        releases.push((id, title, href.to_string()));
    }
    if releases.is_empty() {
        warn_missing_field("releases", "list");
    }
    releases
}

fn parse_release_page(
    client: &ScrapeClient,
    url: &str,
    id: i32,
    fallback_title: &str,
) -> Result<Option<Release>> {
    let html = client.fetch_html(url)?;
    Ok(Some(parse_release_page_html(&html, id, fallback_title)))
}

fn parse_release_page_html(html: &str, id: i32, fallback_title: &str) -> Release {
    let document = Html::parse_document(html);
    warn_if_no_selector_match(
        &document,
        "release",
        "titleSelector",
        &["div.subtitle", ".subtitle", "h1", "title"],
    );

    let mut title = select_first_text_with_fallback(
        &document,
        "release",
        "title",
        &["div.subtitle", ".subtitle", "h1"],
        &["title", ".page-title"],
    );
    if title.is_empty() {
        title = fallback_title.to_string();
    }
    if title.is_empty() {
        warn_missing_field("release", "title");
    }

    let body_text = document.root_element().text().collect::<Vec<_>>().join(" ");
    let release_type = detect_release_type(&body_text);
    if release_type.is_none() {
        warn_missing_field("release", "releaseType");
    }

    let release_date = regex(r"Released on\s*[:\s]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})")
        .captures(&body_text)
        .and_then(|cap| cap.get(1))
        .map(|m| parse_date(m.as_str()));
    if release_date.is_none() {
        warn_missing_field("release", "releaseDate");
    }

    Release {
        id,
        title: title.clone(),
        slug: slugify(&title),
        release_type,
        release_date,
        search_text: Some(title.to_lowercase()),
    }
}

fn select_first_text_quiet(document: &Html, selectors: &[&str]) -> Option<String> {
    for selector in selectors {
        if let Some(sel) = selector_or_warn("select_first_text", selector) {
            if let Some(el) = document.select(&sel).next() {
                let text = el.text().collect::<String>();
                let normalized = normalize_whitespace(&text);
                if !normalized.is_empty() {
                    return Some(normalized);
                }
            }
        }
    }
    None
}

fn select_first_text(document: &Html, selectors: &[&str]) -> String {
    if let Some(text) = select_first_text_quiet(document, selectors) {
        return text;
    }
    tracing::warn!(selectors = ?selectors, "select_first_text: no selector matched");
    String::new()
}

fn select_first_text_with_fallback(
    document: &Html,
    context: &str,
    label: &str,
    primary: &[&str],
    fallback: &[&str],
) -> String {
    if let Some(text) = select_first_text_quiet(document, primary) {
        return text;
    }
    if let Some(text) = select_first_text_quiet(document, fallback) {
        tracing::warn!(
            context,
            label,
            primary = ?primary,
            fallback = ?fallback,
            "fallback selector used"
        );
        return text;
    }
    warn_missing_field(context, label);
    String::new()
}

fn warn_if_no_selector_match(document: &Html, context: &str, label: &str, selectors: &[&str]) {
    if select_first_text_quiet(document, selectors).is_none() {
        warn_missing_field(context, label);
        let snippet = normalize_whitespace(
            &document
                .root_element()
                .text()
                .collect::<Vec<_>>()
                .join(" ")
                .chars()
                .take(200)
                .collect::<String>(),
        );
        record_warning_event_with_snippet("selector_missing", context, label, &snippet);
    }
}

fn validate_required_fields(context: &str, value: &Value, required: &[&str]) {
    let Some(obj) = value.as_object() else {
        for field in required {
            warn_missing_field(context, field);
        }
        return;
    };
    for field in required {
        let entry = obj.get(*field);
        warn_if_missing_value(context, field, entry);
    }
}

fn warn_if_out_of_range(context: &str, field: &str, value: i64, min: i64, max: i64) {
    if value < min || value > max {
        warn_missing_field(context, field);
        tracing::warn!(
            context,
            field,
            value,
            min,
            max,
            "value outside expected range"
        );
    }
}

fn normalize_whitespace(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn slugify(value: &str) -> String {
    let lower = value.to_lowercase();
    let cleaned: String = lower
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { ' ' })
        .collect();
    cleaned
        .split_whitespace()
        .filter(|segment| !segment.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

fn create_sort_title(value: &str) -> String {
    let lower = value.to_lowercase();
    let trimmed = lower.trim();
    for prefix in ["the ", "a ", "an "] {
        if let Some(stripped) = trimmed.strip_prefix(prefix) {
            return stripped.to_string();
        }
    }
    trimmed.to_string()
}

fn build_search_text(parts: &[&str]) -> String {
    parts
        .iter()
        .filter(|part| !part.trim().is_empty())
        .map(|part| part.to_lowercase())
        .collect::<Vec<_>>()
        .join(" ")
}

fn parse_date(value: &str) -> String {
    let trimmed = value.trim();
    if regex(r"^\d{4}-\d{2}-\d{2}$").is_match(trimmed) {
        return trimmed.to_string();
    }

    if let Some(cap) = regex(r"^(\d{1,2})/(\d{1,2})/(\d{4})$").captures(trimmed) {
        let month = cap
            .get(1)
            .and_then(|m| m.as_str().parse::<u32>().ok())
            .unwrap_or(1);
        let day = cap
            .get(2)
            .and_then(|m| m.as_str().parse::<u32>().ok())
            .unwrap_or(1);
        let year = cap
            .get(3)
            .and_then(|m| m.as_str().parse::<u32>().ok())
            .unwrap_or(1970);
        return format!("{year:04}-{month:02}-{day:02}");
    }

    if let Some(cap) = regex(r"^(\d{4})/(\d{1,2})/(\d{1,2})$").captures(trimmed) {
        let year = cap
            .get(1)
            .and_then(|m| m.as_str().parse::<u32>().ok())
            .unwrap_or(1970);
        let month = cap
            .get(2)
            .and_then(|m| m.as_str().parse::<u32>().ok())
            .unwrap_or(1);
        let day = cap
            .get(3)
            .and_then(|m| m.as_str().parse::<u32>().ok())
            .unwrap_or(1);
        return format!("{year:04}-{month:02}-{day:02}");
    }

    if let Some(cap) = regex(r"(?i)(\w+)\s+(\d{1,2}),?\s+(\d{4})").captures(trimmed) {
        let month_name = cap
            .get(1)
            .map(|m| m.as_str().to_lowercase())
            .unwrap_or_default();
        let month = match &month_name[..] {
            "january" => 1,
            "february" => 2,
            "march" => 3,
            "april" => 4,
            "may" => 5,
            "june" => 6,
            "july" => 7,
            "august" => 8,
            "september" => 9,
            "october" => 10,
            "november" => 11,
            "december" => 12,
            _ => 1,
        };
        let day = cap
            .get(2)
            .and_then(|m| m.as_str().parse::<u32>().ok())
            .unwrap_or(1);
        let year = cap
            .get(3)
            .and_then(|m| m.as_str().parse::<u32>().ok())
            .unwrap_or(1970);
        return format!("{year:04}-{month:02}-{day:02}");
    }

    trimmed.to_string()
}

fn parse_show_date(value: &str) -> Option<String> {
    if let Some(cap) = regex(r"(\d{2})\.(\d{2})\.(\d{4})").captures(value) {
        let month = cap.get(1).and_then(|m| m.as_str().parse::<u32>().ok())?;
        let day = cap.get(2).and_then(|m| m.as_str().parse::<u32>().ok())?;
        let year = cap.get(3).and_then(|m| m.as_str().parse::<u32>().ok())?;
        return Some(format!("{year:04}-{month:02}-{day:02}"));
    }
    if let Some(cap) = regex(r"(\d{4})-(\d{2})-(\d{2})").captures(value) {
        let year = cap.get(1).and_then(|m| m.as_str().parse::<u32>().ok())?;
        let month = cap.get(2).and_then(|m| m.as_str().parse::<u32>().ok())?;
        let day = cap.get(3).and_then(|m| m.as_str().parse::<u32>().ok())?;
        return Some(format!("{year:04}-{month:02}-{day:02}"));
    }
    if let Some(cap) = regex(r"(\d{4})/(\d{2})/(\d{2})").captures(value) {
        let year = cap.get(1).and_then(|m| m.as_str().parse::<u32>().ok())?;
        let month = cap.get(2).and_then(|m| m.as_str().parse::<u32>().ok())?;
        let day = cap.get(3).and_then(|m| m.as_str().parse::<u32>().ok())?;
        return Some(format!("{year:04}-{month:02}-{day:02}"));
    }
    if let Some(cap) = regex(r"(\d{1,2})/(\d{1,2})/(\d{4})").captures(value) {
        let month = cap.get(1).and_then(|m| m.as_str().parse::<u32>().ok())?;
        let day = cap.get(2).and_then(|m| m.as_str().parse::<u32>().ok())?;
        let year = cap.get(3).and_then(|m| m.as_str().parse::<u32>().ok())?;
        return Some(format!("{year:04}-{month:02}-{day:02}"));
    }
    None
}

fn parse_location(text: &str) -> Option<(String, Option<String>, String)> {
    let text = normalize_whitespace(text);
    let us = regex(r"^([^,]+),\s*([A-Z]{2})(?:,\s*(.+))?$");
    if let Some(cap) = us.captures(&text) {
        let city = cap.get(1)?.as_str().trim().to_string();
        let state = cap.get(2)?.as_str().trim().to_string();
        let country = cap
            .get(3)
            .map(|m| m.as_str().trim().to_string())
            .unwrap_or_else(|| "USA".to_string());
        return Some((city, Some(state), country));
    }

    let intl = regex(r"^([^,]+),\s*([A-Za-z\s]{2,})$");
    if let Some(cap) = intl.captures(&text) {
        let city = cap.get(1)?.as_str().trim().to_string();
        let country = cap.get(2)?.as_str().trim().to_string();
        return Some((city, None, country));
    }

    None
}

fn guess_venue_type(name: &str, body: &str) -> Option<String> {
    let haystack = format!("{name} {body}").to_lowercase();
    for marker in [
        "amphitheater",
        "amphitheatre",
        "arena",
        "stadium",
        "theater",
        "theatre",
        "club",
        "festival",
        "coliseum",
        "pavilion",
        "ballpark",
        "field",
        "center",
        "centre",
        "garden",
        "hall",
        "park",
    ] {
        if haystack.contains(marker) {
            return Some(marker.to_string());
        }
    }
    None
}

fn detect_release_type(body: &str) -> Option<String> {
    let lower = body.to_lowercase();
    let known = [
        ("live trax", "live_trax"),
        ("dmblive", "dmblive"),
        ("warehouse", "warehouse"),
        ("broadcast", "broadcast"),
        ("live album", "live"),
        ("live release", "live"),
        ("live recording", "live"),
        ("compilation", "compilation"),
        ("greatest hits", "compilation"),
        ("best of", "compilation"),
        ("dvd", "video"),
        ("blu-ray", "video"),
        ("video", "video"),
        ("box set", "box_set"),
        ("boxset", "box_set"),
        ("studio album", "studio"),
        ("studio release", "studio"),
        ("single", "single"),
    ];
    for (needle, release_type) in known {
        if lower.contains(needle) {
            return Some(release_type.to_string());
        }
    }
    if regex(r"\\bep\\b").is_match(&lower) {
        return Some("ep".to_string());
    }
    None
}

fn stable_id_from_string(value: &str) -> i32 {
    if let Ok(parsed) = value.parse::<i32>() {
        return parsed;
    }
    let hash = blake3::hash(value.as_bytes());
    let bytes = hash.as_bytes();
    let raw = u32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]);
    (raw % i32::MAX as u32) as i32
}

fn parse_dot_date(value: &str) -> Option<String> {
    let caps = regex(r"(\\d{1,2})\\.(\\d{1,2})\\.(\\d{2,4})").captures(value)?;
    let mut year = caps.get(3)?.as_str().to_string();
    if year.len() == 2 {
        let year_num: i32 = year.parse().ok()?;
        year = if year_num > 50 {
            format!("19{year}")
        } else {
            format!("20{year}")
        };
    }
    let month = format!("{:02}", caps.get(1)?.as_str().parse::<u32>().ok()?);
    let day = format!("{:02}", caps.get(2)?.as_str().parse::<u32>().ok()?);
    Some(format!("{year}-{month}-{day}"))
}

fn parse_mdy_any(value: &str) -> Option<String> {
    let caps = regex(r"(\\d{1,2})[\\./](\\d{1,2})[\\./](\\d{2,4})").captures(value)?;
    let month = caps.get(1)?.as_str().parse::<u32>().ok()?;
    let day = caps.get(2)?.as_str().parse::<u32>().ok()?;
    let mut year = caps.get(3)?.as_str().to_string();
    if year.len() == 2 {
        let year_num: i32 = year.parse().ok()?;
        year = if year_num > 50 {
            format!("19{year}")
        } else {
            format!("20{year}")
        };
    }
    Some(format!("{year}-{month:02}-{day:02}"))
}

fn parse_date_any(value: &str) -> Option<String> {
    if let Some(parsed) = parse_mdy_any(value) {
        return Some(parsed);
    }
    let month_re = regex(
        r"(?i)\\b(january|february|march|april|may|june|july|august|september|october|november|december)\\b",
    );
    if month_re.is_match(value) {
        return Some(parse_date(value));
    }
    None
}

fn scrape_song_stats(client: &ScrapeClient, songs: &[Song]) -> Result<Vec<Value>> {
    let mut stats = Vec::new();
    for song in songs {
        if song.id <= 0 {
            continue;
        }
        let url = format!("{BASE_URL}/SongStats.aspx?sid={}", song.id);
        let html = client.fetch_html(&url)?;
        let entry = parse_song_stats_page(&html, song.id, &song.title);
        stats.push(entry);
    }
    Ok(stats)
}

fn parse_song_stats_page(html: &str, song_id: i32, song_title: &str) -> Value {
    let document = Html::parse_document(html);
    let body_text = document.root_element().text().collect::<Vec<_>>().join(" ");

    warn_if_no_selector_match(
        &document,
        "song_stats",
        "performanceSelector",
        &["a[href*='ShowSetlist.aspx']", "a[href*='TourShowSet.aspx']"],
    );
    warn_if_no_selector_match(
        &document,
        "song_stats",
        "segueSelector",
        &[
            "a[href*='summary.aspx'][href*='sid=']",
            "a[href*='SongStats.aspx'][href*='sid=']",
        ],
    );

    let total_plays = parse_i64_or_warn(
        regex(r"(?i)played?\\s+(\\d+)\\s+times?")
            .captures(&body_text)
            .and_then(|cap| cap.get(1).map(|m| m.as_str())),
        "song_stats",
        "totalPlays",
    );

    let first_played_date = regex(
        r"(?i)(?:first|debut)[^\\d]*(\\d{1,2}[\\./]\\d{1,2}[\\./]\\d{2,4}|[A-Za-z]+\\s+\\d{1,2},?\\s+\\d{4})",
    )
    .captures(&body_text)
    .and_then(|cap| cap.get(1))
    .and_then(|m| parse_date_any(m.as_str()));

    let last_played_date = regex(
        r"(?i)last\\s+(?:fully\\s+)?played[^\\d]*(\\d{1,2}[\\./]\\d{1,2}[\\./]\\d{2,4}|[A-Za-z]+\\s+\\d{1,2},?\\s+\\d{4})",
    )
    .captures(&body_text)
    .and_then(|cap| cap.get(1))
    .and_then(|m| parse_date_any(m.as_str()));

    let avg_length_seconds = regex(r"(?i)average[^\\d]*(\\d+):(\\d{2})")
        .captures(&body_text)
        .and_then(|cap| {
            let minutes = cap.get(1)?.as_str().parse::<i64>().ok()?;
            let seconds = cap.get(2)?.as_str().parse::<i64>().ok()?;
            Some(minutes * 60 + seconds)
        });

    let years_active = parse_i64_or_warn(
        regex(r"(\\d+)\\s+years?")
            .captures(&body_text)
            .and_then(|cap| cap.get(1).map(|m| m.as_str())),
        "song_stats",
        "yearsActive",
    );

    let gap_days = regex(r"(\\d+)\\s+days?\\s+since")
        .captures(&body_text)
        .and_then(|cap| cap.get(1).map(|m| m.as_str()))
        .map(|value| parse_i64_or_warn(Some(value), "song_stats", "currentGap.days"));
    let gap_shows = regex(r"(\\d+)\\s+shows?\\s+since")
        .captures(&body_text)
        .and_then(|cap| cap.get(1).map(|m| m.as_str()))
        .map(|value| parse_i64_or_warn(Some(value), "song_stats", "currentGap.shows"));
    let current_gap = if gap_days.is_some() || gap_shows.is_some() {
        json!({
            "days": gap_days.unwrap_or_else(|| {
                warn_missing_field("song_stats", "currentGap.days");
                0
            }),
            "shows": gap_shows.unwrap_or_else(|| {
                warn_missing_field("song_stats", "currentGap.shows");
                0
            })
        })
    } else {
        Value::Null
    };

    let slot_breakdown = parse_slot_breakdown(&document, &body_text);
    let version_types = parse_version_types(&body_text);
    let (longest_version, shortest_version) = parse_duration_extremes(&document);
    let top_segues_into = parse_top_segues(&document, true);
    let top_segues_from = parse_top_segues(&document, false);
    let plays_by_year = parse_plays_by_year(&document);
    let release_counts = parse_release_counts(&body_text);
    let liberations = parse_song_liberations(&document);
    let artist_stats = parse_artist_stats(&body_text);
    let performances = parse_song_performances(&document);

    let mut result = json!({
        "originalId": song_id,
        "title": song_title,
        "slotBreakdown": slot_breakdown,
        "versionTypes": version_types,
        "avgLengthSeconds": avg_length_seconds,
        "longestVersion": longest_version,
        "shortestVersion": shortest_version,
        "topSeguesInto": top_segues_into,
        "topSeguesFrom": top_segues_from,
        "releaseCounts": release_counts,
        "playsByYear": plays_by_year,
        "artistStats": artist_stats,
        "liberations": liberations,
        "totalPlays": total_plays,
        "firstPlayedDate": first_played_date,
        "lastPlayedDate": last_played_date,
        "yearsActive": years_active,
        "currentGap": current_gap,
        "performances": performances
    });

    let mut partial = false;
    warn_if_missing_value(
        "song_stats",
        "firstPlayedDate",
        result.get("firstPlayedDate"),
    );
    if result
        .get("firstPlayedDate")
        .and_then(|v| v.as_str())
        .is_none()
    {
        partial = true;
    }
    warn_if_missing_value("song_stats", "lastPlayedDate", result.get("lastPlayedDate"));
    if result
        .get("lastPlayedDate")
        .and_then(|v| v.as_str())
        .is_none()
    {
        partial = true;
    }
    warn_if_missing_value("song_stats", "playsByYear", result.get("playsByYear"));
    if result
        .get("playsByYear")
        .and_then(|v| v.as_array())
        .map(|v| v.is_empty())
        .unwrap_or(true)
    {
        partial = true;
    }
    warn_if_missing_value("song_stats", "performances", result.get("performances"));
    if result
        .get("performances")
        .and_then(|v| v.as_array())
        .map(|v| v.is_empty())
        .unwrap_or(true)
    {
        partial = true;
    }
    warn_if_missing_value("song_stats", "longestVersion", result.get("longestVersion"));
    warn_if_missing_value(
        "song_stats",
        "shortestVersion",
        result.get("shortestVersion"),
    );

    if total_plays > 0 {
        if let Some(version_types) = result.get("versionTypes") {
            if object_all_zero(version_types) {
                warn_missing_field("song_stats", "versionTypes");
            }
        }
        if let Some(slot_breakdown) = result.get("slotBreakdown") {
            if object_all_zero(slot_breakdown) {
                warn_missing_field("song_stats", "slotBreakdown");
            }
        }
        if artist_stats.is_empty() {
            warn_missing_field("song_stats", "artistStats");
        }
    }

    validate_required_fields(
        "song_stats",
        &result,
        &[
            "originalId",
            "title",
            "totalPlays",
            "playsByYear",
            "performances",
        ],
    );

    if partial {
        if let Some(obj) = result.as_object_mut() {
            obj.insert("_partial".to_string(), Value::Bool(true));
        }
    }
    result
}

fn parse_slot_breakdown(document: &Html, body_text: &str) -> Value {
    let extract = |pattern: &str, field: &str| -> i64 {
        parse_i64_or_warn(
            regex(pattern)
                .captures(body_text)
                .and_then(|cap| cap.get(1).map(|m| m.as_str())),
            "song_stats.slot_breakdown",
            field,
        )
    };
    let extract_from = |text: &str, pattern: &str, field: &str| -> i64 {
        parse_i64_or_warn(
            regex(pattern)
                .captures(text)
                .and_then(|cap| cap.get(1).map(|m| m.as_str())),
            "song_stats.slot_breakdown",
            field,
        )
    };

    let mut opener = extract(r"(?i)opener[:\\s]+(\\d+)", "opener");
    let mut set1_closer = extract(r"(?i)set\\s*1\\s*closer[:\\s]+(\\d+)", "set1Closer");
    let mut set2_opener = extract(r"(?i)set\\s*2\\s*opener[:\\s]+(\\d+)", "set2Opener");
    let mut closer = extract(r"(?i)(?:set2closer|closer)[:\\s]+(\\d+)", "closer");
    let mut midset = extract(r"(?i)midset[:\\s]+(\\d+)", "midset");
    let mut encore2 = extract(r"(?i)encore\\s*2[:\\s]+(\\d+)", "encore2");
    let cleaned_text = regex(r"(?i)encore\\s*2[:\\s]+\\d+").replace_all(body_text, " ");
    let mut encore = extract_from(&cleaned_text, r"(?i)encore[:\\s]+(\\d+)", "encore");

    let total_from_text = opener + set1_closer + set2_opener + closer + midset + encore + encore2;
    if total_from_text < 5 {
        let count = |selector: &str| -> i64 {
            selector_or_warn("setlist count selector", selector)
                .map(|sel| document.select(&sel).count() as i64)
                .unwrap_or_else(|| {
                    warn_missing_field("song_stats.slot_breakdown", "setlistRows");
                    0
                })
        };
        opener = count("tr.opener, tr[class*='opener']");
        set1_closer = count("tr.set1closer, tr[class*='set1closer']");
        set2_opener = count("tr.set2opener, tr[class*='set2opener']");
        closer = count("tr.closer, tr[class*='closer']");
        midset = count("tr.midset, tr[class*='midset']");
        let encore_all = count("tr.encore, tr[class*='encore']");
        encore2 = count("tr.encore2, tr[class*='encore2']");
        encore = (encore_all - encore2).max(0);
    }

    json!({
        "opener": opener,
        "set1Closer": set1_closer,
        "set2Opener": set2_opener,
        "closer": closer,
        "midset": midset,
        "encore": encore,
        "encore2": encore2
    })
}

fn parse_version_types(body_text: &str) -> Value {
    let extract = |pattern: &str, field: &str| -> i64 {
        parse_i64_or_warn(
            regex(pattern)
                .captures(body_text)
                .and_then(|cap| cap.get(1).map(|m| m.as_str())),
            "song_stats.version_types",
            field,
        )
    };
    json!({
        "full": extract(r"(?i)(?:full|complete)\\s+versions?[:\\s]+(\\d+)", "full"),
        "tease": extract(r"(?i)tease[:\\s]+(\\d+)", "tease"),
        "partial": extract(r"(?i)partial[:\\s]+(\\d+)", "partial"),
        "reprise": extract(r"(?i)reprise[:\\s]+(\\d+)", "reprise"),
        "fake": extract(r"(?i)fake[:\\s]+(\\d+)", "fake"),
        "aborted": extract(r"(?i)aborted[:\\s]+(\\d+)", "aborted")
    })
}

fn parse_duration_extremes(document: &Html) -> (Value, Value) {
    let Some(row_selector) = selector_or_warn("tr, .song-performance", "tr, .song-performance")
    else {
        return (Value::Null, Value::Null);
    };
    let Some(show_link_selector) = selector_or_warn(
        "a[href*='ShowSetlist'], a[href*='TourShowSet']",
        "a[href*='ShowSetlist'], a[href*='TourShowSet']",
    ) else {
        return (Value::Null, Value::Null);
    };
    let Some(venue_selector) = selector_or_warn("a[href*='VenueStats']", "a[href*='VenueStats']")
    else {
        return (Value::Null, Value::Null);
    };
    warn_if_empty(
        document,
        &row_selector,
        "song_stats.duration_extremes",
        "tr,.song-performance",
    );
    warn_if_empty(
        document,
        &show_link_selector,
        "song_stats.duration_extremes",
        "show_link",
    );
    warn_if_empty(
        document,
        &venue_selector,
        "song_stats.duration_extremes",
        "venue_link",
    );
    let mut longest: Option<Value> = None;
    let mut shortest: Option<Value> = None;
    for row in document.select(&row_selector) {
        let text = normalize_whitespace(&row.text().collect::<String>());
        let Some(caps) = regex(r"(\\d+):(\\d{2})").captures(&text) else {
            continue;
        };
        let minutes = parse_i64_or_warn(
            caps.get(1).map(|m| m.as_str()),
            "song_stats.duration_extremes",
            "minutes",
        );
        let seconds = parse_i64_or_warn(
            caps.get(2).map(|m| m.as_str()),
            "song_stats.duration_extremes",
            "seconds",
        );
        if seconds >= 60 {
            continue;
        }
        let total_seconds = minutes * 60 + seconds;
        if !(30_i64..=1800_i64).contains(&total_seconds) {
            continue;
        }
        let Some(date_match) = regex(r"(\\d{1,2}[\\./]\\d{1,2}[\\./]\\d{2,4})")
            .captures(&text)
            .and_then(|cap| cap.get(1))
            .and_then(|m| parse_mdy_any(m.as_str()))
        else {
            continue;
        };
        let show_id = row
            .select(&show_link_selector)
            .next()
            .and_then(|link| link.value().attr("href"))
            .and_then(|href| regex(r"id=(\\d+)").captures(href))
            .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()));
        let venue = row
            .select(&venue_selector)
            .next()
            .map(|link| normalize_whitespace(&link.text().collect::<String>()))
            .filter(|v| !v.is_empty())
            .unwrap_or_else(|| "Unknown".to_string());
        let entry = json!({
            "durationSeconds": total_seconds,
            "date": date_match,
            "showId": show_id,
            "venue": venue
        });
        if longest
            .as_ref()
            .and_then(|v| v.get("durationSeconds"))
            .and_then(|v| v.as_i64())
            .map(|d| total_seconds > d)
            .unwrap_or(true)
        {
            longest = Some(entry.clone());
        }
        if shortest
            .as_ref()
            .and_then(|v| v.get("durationSeconds"))
            .and_then(|v| v.as_i64())
            .map(|d| total_seconds < d)
            .unwrap_or(true)
        {
            shortest = Some(entry);
        }
    }
    (
        longest.unwrap_or(Value::Null),
        shortest.unwrap_or(Value::Null),
    )
}

fn parse_top_segues(document: &Html, into: bool) -> Vec<Value> {
    let Some(table_selector) = selector_or_warn("table", "table") else {
        return Vec::new();
    };
    let Some(row_selector) = selector_or_warn("tr", "tr") else {
        return Vec::new();
    };
    let Some(link_selector) = selector_or_warn(
        "a[href*='summary.aspx?sid='], a[href*='SongStats.aspx?sid=']",
        "a[href*='summary.aspx?sid='], a[href*='SongStats.aspx?sid=']",
    ) else {
        return Vec::new();
    };
    warn_if_empty(
        document,
        &table_selector,
        if into {
            "song_stats.top_segues.into"
        } else {
            "song_stats.top_segues.from"
        },
        "table",
    );
    warn_if_empty(
        document,
        &row_selector,
        if into {
            "song_stats.top_segues.into"
        } else {
            "song_stats.top_segues.from"
        },
        "tr",
    );
    warn_if_empty(
        document,
        &link_selector,
        if into {
            "song_stats.top_segues.into"
        } else {
            "song_stats.top_segues.from"
        },
        "song_link",
    );
    let mut results: Vec<Value> = Vec::new();
    let keywords = if into {
        vec![
            "top segue",
            "transitions into",
            "followed by",
            "segues into",
        ]
    } else {
        vec!["preceded", "came from", "segued from", "transitions from"]
    };

    for table in document.select(&table_selector) {
        let table_text = normalize_whitespace(&table.text().collect::<String>()).to_lowercase();
        if !keywords.iter().any(|kw| table_text.contains(kw)) {
            continue;
        }
        for row in table.select(&row_selector) {
            let Some(link) = row.select(&link_selector).next() else {
                continue;
            };
            let song_title = normalize_whitespace(&link.text().collect::<String>());
            let song_id = link
                .value()
                .attr("href")
                .and_then(|href| regex(r"sid=(\\d+)").captures(href))
                .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()))
                .unwrap_or_default();
            if song_title.is_empty() {
                warn_missing_field("song_stats.top_segues", "songTitle");
                continue;
            }
            if song_id.is_empty() {
                warn_missing_field("song_stats", "songId");
            }
            let row_text = normalize_whitespace(&row.text().collect::<String>());
            let count = parse_i64_or_warn(
                regex(r"(\\d+)\\s*(?:times?|x|count)?")
                    .captures(&row_text)
                    .and_then(|cap| cap.get(1).map(|m| m.as_str())),
                "song_stats.top_segues",
                "count",
            )
            .max(1);
            results.push(json!({
                "songTitle": song_title,
                "songId": song_id,
                "count": count
            }));
        }
    }
    results.sort_by(|a, b| {
        b.get("count")
            .and_then(|v| v.as_i64())
            .cmp(&a.get("count").and_then(|v| v.as_i64()))
    });
    results.truncate(10);
    if results.is_empty() {
        if into {
            warn_missing_field("song_stats", "topSeguesInto");
        } else {
            warn_missing_field("song_stats", "topSeguesFrom");
        }
    }
    results
}

fn parse_plays_by_year(document: &Html) -> Vec<Value> {
    let Some(table_selector) = selector_or_warn("table", "table") else {
        return Vec::new();
    };
    let Some(row_selector) = selector_or_warn("tr", "tr") else {
        return Vec::new();
    };
    warn_if_empty(
        document,
        &table_selector,
        "song_stats.plays_by_year",
        "table",
    );
    warn_if_empty(document, &row_selector, "song_stats.plays_by_year", "tr");
    let mut plays: HashMap<i64, i64> = HashMap::new();
    for table in document.select(&table_selector) {
        let text = normalize_whitespace(&table.text().collect::<String>()).to_lowercase();
        if !(text.contains("by year")
            || text.contains("year breakdown")
            || text.contains("performances by year"))
        {
            continue;
        }
        for row in table.select(&row_selector) {
            let row_text = normalize_whitespace(&row.text().collect::<String>());
            let year = regex(r"\\b(19\\d{2}|20[0-2]\\d)\\b")
                .captures(&row_text)
                .and_then(|cap| cap.get(1))
                .and_then(|m| m.as_str().parse::<i64>().ok());
            if let Some(year) = year {
                let row_without_year = row_text.replace(&year.to_string(), " ");
                let count = parse_i64_or_warn(
                    regex(r"(\\d+)\\s*(?:times?|plays?|performances?)?")
                        .captures(&row_without_year)
                        .and_then(|cap| cap.get(1).map(|m| m.as_str())),
                    "song_stats.plays_by_year",
                    "count",
                );
                let count = if count == 0 {
                    if let Some(td_sel) = selector_or_warn("td", "td") {
                        let mut numbers: Vec<i64> = row
                            .select(&td_sel)
                            .filter_map(|cell| {
                                let text = normalize_whitespace(&cell.text().collect::<String>());
                                text.parse::<i64>().ok()
                            })
                            .collect();
                        numbers.retain(|value| *value != year);
                        numbers.into_iter().max().unwrap_or_else(|| {
                            warn_missing_field("song_stats.plays_by_year", "count");
                            0
                        })
                    } else {
                        warn_missing_field("song_stats.plays_by_year", "count");
                        0
                    }
                } else {
                    count
                };
                if count == 0 {
                    tracing::warn!(
                        year,
                        row = row_text.as_str(),
                        "plays_by_year row missing count"
                    );
                    warn_missing_field("song_stats.plays_by_year", "count");
                }
                if count > 0 {
                    plays.insert(year, count);
                }
            }
        }
    }
    let mut entries: Vec<Value> = plays
        .into_iter()
        .map(|(year, count)| json!({ "year": year, "plays": count }))
        .collect();
    entries.sort_by(|a, b| {
        a.get("year")
            .and_then(|v| v.as_i64())
            .cmp(&b.get("year").and_then(|v| v.as_i64()))
    });
    if entries.is_empty() {
        warn_missing_field("song_stats", "playsByYear");
    }
    entries
}

fn parse_release_counts(body_text: &str) -> Value {
    let extract = |pattern: &str, field: &str| -> i64 {
        parse_i64_or_warn(
            regex(pattern)
                .captures(body_text)
                .and_then(|cap| cap.get(1).map(|m| m.as_str())),
            "song_stats.release_counts",
            field,
        )
    };
    json!({
        "total": extract(r"(?i)(\\d+)\\s+(?:official\\s+)?releases?", "total"),
        "studio": extract(r"(?i)(\\d+)\\s+studio", "studio"),
        "live": extract(r"(?i)(\\d+)\\s+live\\s+(?:releases?|albums?)", "live"),
        "dmblive": extract(r"(?i)(\\d+)\\s+dmblive", "dmblive"),
        "warehouse": extract(r"(?i)(\\d+)\\s+warehouse", "warehouse"),
        "liveTrax": extract(r"(?i)(\\d+)\\s+live\\s*trax", "liveTrax"),
        "broadcasts": extract(r"(?i)(\\d+)\\s+broadcasts?", "broadcasts")
    })
}

fn parse_song_liberations(document: &Html) -> Vec<Value> {
    let Some(table_selector) = selector_or_warn("table", "table") else {
        return Vec::new();
    };
    let Some(row_selector) = selector_or_warn("tr", "tr") else {
        return Vec::new();
    };
    let Some(show_link_selector) = selector_or_warn(
        "a[href*='ShowSetlist'], a[href*='TourShowSet']",
        "a[href*='ShowSetlist'], a[href*='TourShowSet']",
    ) else {
        return Vec::new();
    };
    warn_if_empty(document, &table_selector, "song_stats.liberations", "table");
    warn_if_empty(document, &row_selector, "song_stats.liberations", "tr");
    warn_if_empty(
        document,
        &show_link_selector,
        "song_stats.liberations",
        "show_link",
    );
    let mut entries = Vec::new();
    for table in document.select(&table_selector) {
        let table_text = normalize_whitespace(&table.text().collect::<String>()).to_lowercase();
        if !(table_text.contains("liberation") || table_text.contains("gap")) {
            continue;
        }
        for row in table.select(&row_selector) {
            let mut show_links = row.select(&show_link_selector);
            let last_played = show_links.next();
            let liberation = show_links.next();
            if last_played.is_none() || liberation.is_none() {
                continue;
            }
            let Some(last_played) = last_played else {
                continue;
            };
            let Some(liberation) = liberation else {
                continue;
            };
            let last_played_show_id = last_played
                .value()
                .attr("href")
                .and_then(|href| regex(r"id=(\\d+)").captures(href))
                .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()))
                .unwrap_or_default();
            if last_played_show_id.is_empty() {
                warn_missing_field("song_stats.liberations", "lastPlayedShowId");
            }
            let liberation_show_id = liberation
                .value()
                .attr("href")
                .and_then(|href| regex(r"id=(\\d+)").captures(href))
                .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()))
                .unwrap_or_default();
            if liberation_show_id.is_empty() {
                warn_missing_field("song_stats.liberations", "liberationShowId");
            }
            let row_text = normalize_whitespace(&row.text().collect::<String>());
            let days_since = parse_i64_or_warn(
                regex(r"(\\d+)\\s+days?")
                    .captures(&row_text)
                    .and_then(|cap| cap.get(1).map(|m| m.as_str())),
                "song_stats.liberations",
                "daysSince",
            );
            let shows_since = parse_i64_or_warn(
                regex(r"(\\d+)\\s+shows?")
                    .captures(&row_text)
                    .and_then(|cap| cap.get(1).map(|m| m.as_str())),
                "song_stats.liberations",
                "showsSince",
            );
            entries.push(json!({
                "lastPlayedDate": parse_mdy_any(&last_played.text().collect::<String>()),
                "lastPlayedShowId": last_played_show_id,
                "daysSince": days_since,
                "showsSince": shows_since,
                "liberationDate": parse_mdy_any(&liberation.text().collect::<String>()),
                "liberationShowId": liberation_show_id
            }));
        }
    }
    entries
}

fn parse_artist_stats(body_text: &str) -> Vec<Value> {
    let mut stats = Vec::new();
    let dmb_match = regex(r"(?i)(?:dave\\s+matthews\\s+band|dmb)[^\\d]*(\\d+)\\s+times?")
        .captures(body_text)
        .and_then(|cap| cap.get(1))
        .and_then(|m| m.as_str().parse::<i64>().ok());
    let dt_match = regex(r"(?i)(?:dave\\s*&\\s*tim|d&t)[^\\d]*(\\d+)\\s+times?")
        .captures(body_text)
        .and_then(|cap| cap.get(1))
        .and_then(|m| m.as_str().parse::<i64>().ok());
    if let Some(plays) = dmb_match {
        stats.push(json!({
            "artistName": "Dave Matthews Band",
            "playCount": plays,
            "avgLength": Value::Null,
            "percentOfTotal": 0
        }));
    }
    if let Some(plays) = dt_match {
        stats.push(json!({
            "artistName": "Dave & Tim",
            "playCount": plays,
            "avgLength": Value::Null,
            "percentOfTotal": 0
        }));
    }
    let total: i64 = stats
        .iter()
        .filter_map(|v| v.get("playCount").and_then(|p| p.as_i64()))
        .sum();
    if total > 0 {
        for stat in &mut stats {
            if let Some(count) = stat.get("playCount").and_then(|p| p.as_i64()) {
                let percent = (count as f64 / total as f64) * 100.0;
                if let Some(obj) = stat.as_object_mut() {
                    obj.insert("percentOfTotal".to_string(), json!(percent));
                }
            }
        }
    }
    stats
}

fn parse_song_performances(document: &Html) -> Vec<Value> {
    let Some(table_selector) = selector_or_warn("table", "table") else {
        return Vec::new();
    };
    let Some(row_selector) = selector_or_warn("tr", "tr") else {
        return Vec::new();
    };
    let Some(show_link_selector) = selector_or_warn(
        "a[href*='ShowSetlist'], a[href*='TourShowSet']",
        "a[href*='ShowSetlist'], a[href*='TourShowSet']",
    ) else {
        return Vec::new();
    };
    let Some(venue_selector) = selector_or_warn("a[href*='VenueStats']", "a[href*='VenueStats']")
    else {
        return Vec::new();
    };
    warn_if_empty(
        document,
        &table_selector,
        "song_stats.performances",
        "table",
    );
    warn_if_empty(document, &row_selector, "song_stats.performances", "tr");
    warn_if_empty(
        document,
        &show_link_selector,
        "song_stats.performances",
        "show_link",
    );
    warn_if_empty(
        document,
        &venue_selector,
        "song_stats.performances",
        "venue_link",
    );
    let td_selector = selector_or_warn("td", "td");
    if let Some(selector) = &td_selector {
        warn_if_empty(document, selector, "song_stats.performances", "td");
    }
    let release_img_selector = selector_or_warn(
        "img[src*='album'], img[src*='cd']",
        "img[src*='album'], img[src*='cd']",
    );
    let mut performances = Vec::new();
    for table in document.select(&table_selector) {
        let show_links = table.select(&show_link_selector).count();
        let table_text = normalize_whitespace(&table.text().collect::<String>()).to_lowercase();
        let looks_like_performance = table_text.contains("performance");
        if show_links == 0 {
            continue;
        }
        if show_links < 5 && !looks_like_performance {
            continue;
        }
        for row in table.select(&row_selector) {
            let Some(show_link) = row.select(&show_link_selector).next() else {
                continue;
            };
            let show_id = show_link
                .value()
                .attr("href")
                .and_then(|href| regex(r"id=(\\d+)").captures(href))
                .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()));
            let date_text = normalize_whitespace(&show_link.text().collect::<String>());
            let date = parse_mdy_any(&date_text);
            if date.is_none() {
                continue;
            }
            let venue = row
                .select(&venue_selector)
                .next()
                .map(|link| normalize_whitespace(&link.text().collect::<String>()))
                .unwrap_or_default();
            if venue.is_empty() {
                warn_missing_field("song_stats.performances", "venue");
            }
            let row_text = normalize_whitespace(&row.text().collect::<String>());
            let duration = regex(r"(\\d+:\\d{2})")
                .captures(&row_text)
                .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()));
            let notes = td_selector
                .as_ref()
                .and_then(|selector| row.select(selector).last())
                .map(|cell| normalize_whitespace(&cell.text().collect::<String>()))
                .filter(|v| !v.is_empty());
            let lower_notes = notes.clone().unwrap_or_default().to_lowercase();
            let mut version = "full".to_string();
            let mut is_tease = false;
            let mut is_segue = false;
            if lower_notes.contains("tease") {
                version = "tease".to_string();
                is_tease = true;
            } else if lower_notes.contains("partial") {
                version = "partial".to_string();
            } else if lower_notes.contains("reprise") {
                version = "reprise".to_string();
            } else if lower_notes.contains("fake") {
                version = "fake".to_string();
            } else if lower_notes.contains("aborted") {
                version = "aborted".to_string();
            }
            if lower_notes.contains("->")
                || lower_notes.contains("»")
                || lower_notes.contains("segue")
            {
                is_segue = true;
            }
            if row_text.contains("->") || row_text.contains("»") || row_text.contains(">") {
                is_segue = true;
            }
            let is_on_release = release_img_selector
                .as_ref()
                .map(|selector| row.select(selector).next().is_some())
                .unwrap_or(false);
            performances.push(json!({
                "showId": show_id,
                "date": date,
                "venue": if venue.is_empty() { Value::Null } else { Value::String(venue) },
                "city": Value::Null,
                "state": Value::Null,
                "country": "USA",
                "duration": duration,
                "version": version,
                "isTease": is_tease,
                "isSegue": is_segue,
                "isOnRelease": is_on_release,
                "notes": notes,
                "guests": []
            }));
            if show_id.as_deref().unwrap_or("").is_empty() {
                warn_missing_field("song_stats.performances", "showId");
            }
        }
    }
    if performances.is_empty() {
        warn_missing_field("song_stats.performances", "performances");
    }
    performances
}

fn scrape_guest_shows(client: &ScrapeClient, guests: &[Guest]) -> Result<Vec<Value>> {
    let mut entries = Vec::new();
    for guest in guests {
        if guest.id <= 0 {
            continue;
        }
        let url = format!("{BASE_URL}/TourGuestShows.aspx?gid={}", guest.id);
        let html = client.fetch_html(&url)?;
        let entry = parse_guest_shows_page(&html, guest.id, &guest.name);
        entries.push(entry);
    }
    Ok(entries)
}

fn parse_guest_shows_page(html: &str, guest_id: i32, guest_name: &str) -> Value {
    let document = Html::parse_document(html);
    let mut appearances: Vec<Value> = Vec::new();
    let mut first_date: Option<String> = None;
    let mut last_date: Option<String> = None;

    let Some(row_selector) = selector_or_warn("tr", "tr") else {
        return json!({
            "guestId": guest_id,
            "guestName": guest_name,
            "totalAppearances": 0,
            "firstAppearanceDate": Value::Null,
            "lastAppearanceDate": Value::Null,
            "appearances": []
        });
    };
    let Some(show_link_selector) = selector_or_warn(
        "a[href*='TourShowSet.aspx'][href*='id=']",
        "a[href*='TourShowSet.aspx'][href*='id=']",
    ) else {
        return json!({
            "guestId": guest_id,
            "guestName": guest_name,
            "totalAppearances": 0,
            "firstAppearanceDate": Value::Null,
            "lastAppearanceDate": Value::Null,
            "appearances": []
        });
    };
    let Some(venue_selector) =
        selector_or_warn("a[href*='VenueStats.aspx']", "a[href*='VenueStats.aspx']")
    else {
        return json!({
            "guestId": guest_id,
            "guestName": guest_name,
            "totalAppearances": 0,
            "firstAppearanceDate": Value::Null,
            "lastAppearanceDate": Value::Null,
            "appearances": []
        });
    };
    let Some(song_selector) = selector_or_warn(
        "a[href*='SongStats.aspx'][href*='sid='], a[href*='summary.aspx'][href*='sid=']",
        "a[href*='SongStats.aspx'][href*='sid='], a[href*='summary.aspx'][href*='sid=']",
    ) else {
        return json!({
            "guestId": guest_id,
            "guestName": guest_name,
            "totalAppearances": 0,
            "firstAppearanceDate": Value::Null,
            "lastAppearanceDate": Value::Null,
            "appearances": []
        });
    };
    warn_if_no_selector_match(
        &document,
        "guest_shows",
        "showSelector",
        &[
            "a[href*='TourShowSet.aspx'][href*='id=']",
            "a[href*='ShowSetlist.aspx'][href*='id=']",
        ],
    );
    warn_if_no_selector_match(
        &document,
        "guest_shows",
        "venueSelector",
        &["a[href*='VenueStats.aspx']"],
    );
    warn_if_no_selector_match(
        &document,
        "guest_shows",
        "songSelector",
        &[
            "a[href*='SongStats.aspx'][href*='sid=']",
            "a[href*='summary.aspx'][href*='sid=']",
        ],
    );
    warn_if_empty(&document, &row_selector, "guest_shows", "tr");
    warn_if_empty(&document, &show_link_selector, "guest_shows", "show_link");
    warn_if_empty(&document, &venue_selector, "guest_shows", "venue_link");
    warn_if_empty(&document, &song_selector, "guest_shows", "song_link");

    for row in document.select(&row_selector) {
        let Some(show_link) = row.select(&show_link_selector).next() else {
            continue;
        };
        let show_id = show_link
            .value()
            .attr("href")
            .and_then(|href| regex(r"id=(\\d+)").captures(href))
            .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()));
        if show_id.as_deref().unwrap_or("").is_empty() {
            warn_missing_field("guest_shows", "showId");
        }
        let row_text = normalize_whitespace(&row.text().collect::<String>());
        let show_date = regex(r"(\\d{2}\\.[\\d]{2}\\.\\d{4}|\\d{4}-\\d{2}-\\d{2})")
            .captures(&row_text)
            .and_then(|cap| cap.get(1))
            .and_then(|m| {
                let value = m.as_str();
                parse_mdy_any(value).or_else(|| {
                    if regex(r"^\\d{4}-\\d{2}-\\d{2}$").is_match(value) {
                        Some(value.to_string())
                    } else {
                        None
                    }
                })
            });
        if let Some(date) = &show_date {
            if first_date.as_ref().map(|d| date < d).unwrap_or(true) {
                first_date = Some(date.clone());
            }
            if last_date.as_ref().map(|d| date > d).unwrap_or(true) {
                last_date = Some(date.clone());
            }
        }
        let venue_name = row
            .select(&venue_selector)
            .next()
            .map(|link| normalize_whitespace(&link.text().collect::<String>()))
            .unwrap_or_default();
        let (city, state, country) =
            parse_location(&row_text).unwrap_or((String::new(), None, "USA".to_string()));

        let mut songs: Vec<Value> = Vec::new();
        for song_link in row.select(&song_selector) {
            let song_title = normalize_whitespace(&song_link.text().collect::<String>());
            if song_title.is_empty() {
                continue;
            }
            let song_id = song_link
                .value()
                .attr("href")
                .and_then(|href| regex(r"sid=(\\d+)").captures(href))
                .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()));
            if song_id.as_deref().unwrap_or("").is_empty() {
                warn_missing_field("guest_shows", "songId");
            }
            let context_text = normalize_whitespace(&row_text).to_lowercase();
            let instruments = detect_instruments(&context_text);
            songs.push(json!({
                "songTitle": song_title,
                "songId": song_id,
                "instruments": instruments
            }));
        }
        appearances.push(json!({
            "showId": show_id,
            "showDate": show_date,
            "venueName": if venue_name.is_empty() { Value::Null } else { Value::String(venue_name) },
            "city": if city.is_empty() { Value::Null } else { Value::String(city) },
            "state": state,
            "country": country,
            "songs": songs
        }));
    }

    if appearances.is_empty() {
        let Some(li_selector) = selector_or_warn(
            "li, .show-entry, .appearance",
            "li, .show-entry, .appearance",
        ) else {
            return json!({
                "guestId": guest_id,
                "guestName": guest_name,
                "totalAppearances": 0,
                "firstAppearanceDate": first_date,
                "lastAppearanceDate": last_date,
                "appearances": []
            });
        };
        warn_if_empty(&document, &li_selector, "guest_shows", "li");
        for item in document.select(&li_selector) {
            let Some(show_link) = item.select(&show_link_selector).next() else {
                continue;
            };
            let show_id = show_link
                .value()
                .attr("href")
                .and_then(|href| regex(r"id=(\\d+)").captures(href))
                .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()));
            if show_id.as_deref().unwrap_or("").is_empty() {
                warn_missing_field("guest_shows", "showId");
            }
            let text = normalize_whitespace(&item.text().collect::<String>());
            let show_date = parse_mdy_any(&text);
            let venue_name = item
                .select(&venue_selector)
                .next()
                .map(|link| normalize_whitespace(&link.text().collect::<String>()))
                .unwrap_or_else(|| normalize_whitespace(&show_link.text().collect::<String>()));
            appearances.push(json!({
                "showId": show_id,
                "showDate": show_date,
                "venueName": if venue_name.is_empty() { Value::Null } else { Value::String(venue_name) },
                "city": Value::Null,
                "state": Value::Null,
                "country": "USA",
                "songs": []
            }));
        }
    }

    let total_appearances = regex(r"(\\d+)\\s+(?:total\\s+)?(?:appearances?|shows?|performances?)")
        .captures(&document.root_element().text().collect::<Vec<_>>().join(" "))
        .and_then(|cap| cap.get(1).map(|m| m.as_str()))
        .map(|value| parse_i64_or_warn(Some(value), "guest_shows", "totalAppearances"))
        .unwrap_or_else(|| appearances.len() as i64);
    if total_appearances > 0 {
        warn_if_out_of_range(
            "guest_shows",
            "totalAppearances",
            total_appearances,
            1,
            2000,
        );
    }

    if total_appearances > 0 && appearances.is_empty() {
        warn_missing_field("guest_shows", "appearances");
    }

    let mut result = json!({
        "guestId": guest_id,
        "guestName": guest_name,
        "totalAppearances": total_appearances,
        "firstAppearanceDate": first_date,
        "lastAppearanceDate": last_date,
        "appearances": appearances
    });
    validate_required_fields(
        "guest_shows",
        &result,
        &["guestId", "guestName", "totalAppearances", "appearances"],
    );
    if total_appearances > 0 {
        let empty = result
            .get("appearances")
            .and_then(|v| v.as_array())
            .map(|v| v.is_empty())
            .unwrap_or(true);
        if empty {
            if let Some(obj) = result.as_object_mut() {
                obj.insert("_partial".to_string(), Value::Bool(true));
            }
        }
    }
    result
}

fn detect_instruments(context_text: &str) -> Vec<String> {
    let mut instruments = Vec::new();
    let patterns = [
        "guitar",
        "bass",
        "drums",
        "percussion",
        "keyboard",
        "piano",
        "violin",
        "viola",
        "cello",
        "trumpet",
        "saxophone",
        "sax",
        "harmonica",
        "vocals",
        "backing vocals",
        "lead vocals",
        "mandolin",
        "banjo",
        "fiddle",
        "flute",
        "clarinet",
    ];
    for pattern in patterns {
        if context_text.contains(pattern) {
            instruments.push(pattern.to_string());
        }
    }
    instruments.sort();
    instruments.dedup();
    instruments
}

fn scrape_venue_stats(client: &ScrapeClient, shows: &[Show]) -> Result<Vec<Value>> {
    let mut venue_ids: Vec<i32> = shows
        .iter()
        .map(|show| show.venue_id)
        .filter(|id| *id > 0)
        .collect();
    venue_ids.sort();
    venue_ids.dedup();
    let mut stats = Vec::new();
    for venue_id in venue_ids {
        let url = format!("{BASE_URL}/VenueStats.aspx?vid={venue_id}");
        let html = client.fetch_html(&url)?;
        if let Some(entry) = parse_venue_stats_page(&html, venue_id) {
            stats.push(entry);
        }
    }
    Ok(stats)
}

fn parse_venue_stats_page(html: &str, venue_id: i32) -> Option<Value> {
    let document = Html::parse_document(html);
    let venue_name = select_first_text_with_fallback(
        &document,
        "venue_stats",
        "venueName",
        &["span.newsitem[style*='font-size:20px']", "h1", "h2"],
        &[".venue-name", ".page-title", "title"],
    );
    if venue_name.is_empty() {
        warn_missing_field("venue_stats", "venueName");
        return None;
    }
    let mut city = String::new();
    let mut state: Option<String> = None;
    let mut country = "USA".to_string();
    warn_if_no_selector_match(
        &document,
        "venue_stats",
        "locationSelector",
        &["span.news", ".venue-location", ".location"],
    );
    if let Some(sel) = selector_or_warn("span.news", "span.news") {
        warn_if_empty(&document, &sel, "venue_stats.location", "span.news");
        for el in document.select(&sel) {
            let text = normalize_whitespace(&el.text().collect::<String>());
            if let Some((c, s, co)) = parse_location(&text) {
                city = c;
                state = s;
                country = co;
                break;
            }
        }
    }
    let body_text = document.root_element().text().collect::<Vec<_>>().join(" ");
    if city.is_empty() {
        if let Some((c, s, co)) = parse_location(&body_text) {
            city = c;
            state = s;
            country = co;
        }
    }
    if city.is_empty() {
        warn_missing_field("venue_stats", "city");
        return None;
    }

    warn_if_no_selector_match(
        &document,
        "venue_stats",
        "showHistorySelector",
        &["a[href*='ShowSetlist.aspx']", "a[href*='TourShowSet.aspx']"],
    );
    let total_shows = parse_i64_or_warn(
        regex(r"(?i)total\\s+(?:gigs|shows)\\s*:?\\s*(\\d+)")
            .captures(&body_text)
            .and_then(|cap| cap.get(1).map(|m| m.as_str())),
        "venue_stats",
        "totalShows",
    );
    if total_shows > 0 {
        warn_if_out_of_range("venue_stats", "totalShows", total_shows, 1, 5000);
    }

    let first_show_date =
        regex(r"(?i)first\\s+(?:show|gig|performance)[:\\s]+([A-Za-z]+\\s+\\d{1,2},?\\s+\\d{4})")
            .captures(&body_text)
            .and_then(|cap| cap.get(1))
            .map(|m| parse_date(m.as_str()));
    let last_show_date =
        regex(r"(?i)last\\s+(?:show|gig|performance)[:\\s]+([A-Za-z]+\\s+\\d{1,2},?\\s+\\d{4})")
            .captures(&body_text)
            .and_then(|cap| cap.get(1))
            .map(|m| parse_date(m.as_str()));

    let capacity = regex(r"Seating\\s+Capacity:?\\s*([0-9,]+)")
        .captures(&body_text)
        .and_then(|cap| cap.get(1))
        .map(|m| m.as_str().replace(',', ""))
        .and_then(|v| v.parse::<i64>().ok());

    let mut aka_names: Vec<String> = Vec::new();
    if let Some(idx) = body_text.find("Previous Names:") {
        let section = &body_text[idx..body_text.len().min(idx + 300)];
        if let Some(cap) =
            regex(r"Names:?\\s*([A-Z][a-zA-Z\\s&\\-']+?)\\s+(?:Changed|Seating|Venue|Total)")
                .captures(section)
        {
            let cleaned = normalize_whitespace(cap.get(1).map(|m| m.as_str()).unwrap_or(""));
            if cleaned.len() > 3 {
                aka_names.push(cleaned);
            }
        }
    }
    if let Some(cap) =
        regex(r"(?i)(?:formerly|previously)\\s+(?:known as\\s+)?([^\\.]+)").captures(&body_text)
    {
        let cleaned = normalize_whitespace(cap.get(1).map(|m| m.as_str()).unwrap_or(""));
        if cleaned.len() > 3 && !aka_names.contains(&cleaned) {
            aka_names.push(cleaned);
        }
    }

    let mut top_songs: Vec<Value> = Vec::new();
    if let Some(song_sel) = selector_or_warn(
        "a[href*='/songs/summary.aspx'][href*='sid=']",
        "a[href*='/songs/summary.aspx'][href*='sid=']",
    ) {
        warn_if_empty(&document, &song_sel, "venue_stats.top_songs", "song_link");
        if let Some(row_selector) = selector_or_warn("tr", "tr") {
            warn_if_empty(&document, &row_selector, "venue_stats.top_songs", "tr");
            for row in document.select(&row_selector) {
                let Some(song_link) = row.select(&song_sel).next() else {
                    continue;
                };
                let song_title = normalize_whitespace(&song_link.text().collect::<String>());
                if song_title.is_empty() {
                    continue;
                }
                let song_id = song_link
                    .value()
                    .attr("href")
                    .and_then(|href| regex(r"sid=(\\d+)").captures(href))
                    .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()));
                if song_id.as_deref().unwrap_or("").is_empty() {
                    warn_missing_field("venue_stats", "songId");
                }
                let row_text = normalize_whitespace(&row.text().collect::<String>());
                let play_count_capture = regex(r"\\b(\\d+)\\b")
                    .captures(&row_text)
                    .and_then(|cap| cap.get(1))
                    .map(|m| m.as_str().to_string());
                let play_count = play_count_capture
                    .as_deref()
                    .and_then(|value| value.parse::<i64>().ok())
                    .unwrap_or_else(|| {
                        warn_missing_field("venue_stats.top_songs", "playCount");
                        1
                    });
                if !top_songs.iter().any(|v| {
                    v.get("title")
                        .and_then(|t| t.as_str())
                        .map(|t| t.eq_ignore_ascii_case(&song_title))
                        .unwrap_or(false)
                }) {
                    top_songs.push(json!({
                        "title": song_title,
                        "playCount": play_count,
                        "songId": song_id,
                    }));
                }
            }
        }
    }
    top_songs.sort_by(|a, b| {
        b.get("playCount")
            .and_then(|v| v.as_i64())
            .cmp(&a.get("playCount").and_then(|v| v.as_i64()))
    });
    top_songs.truncate(20);

    let mut notable_performances: Vec<String> = Vec::new();
    if let Some(idx) = body_text.find("Longest Performance:") {
        let section = &body_text[idx..body_text.len().min(idx + 200)];
        if let Some(cap) =
            regex(r"Performance:[\\s\\S]*?(\\d{1,2}\\.\\d{2}\\.\\d{2,4}.+?\\([0-9:]+\\))")
                .captures(section)
        {
            let perf = normalize_whitespace(cap.get(1).map(|m| m.as_str()).unwrap_or(""));
            if !perf.is_empty() {
                notable_performances.push(perf);
            }
        }
    }
    if let Some(img_sel) = selector_or_warn(
        "img[src*='cd'], img[src*='dvd'], img[src*='cast']",
        "img[src*='cd'], img[src*='dvd'], img[src*='cast']",
    ) {
        for img in document.select(&img_sel) {
            if let Some(alt) = img.value().attr("alt") {
                let cleaned = normalize_whitespace(alt);
                if !cleaned.is_empty() && !notable_performances.contains(&cleaned) {
                    notable_performances.push(cleaned);
                }
            }
        }
    }
    for cap in regex(r"(?i)first\\s+(?:played?|performance|show|gig)[^\\.]{0,100}")
        .captures_iter(&body_text)
    {
        let cleaned = normalize_whitespace(cap.get(0).map(|m| m.as_str()).unwrap_or(""));
        if cleaned.len() > 10 && !notable_performances.contains(&cleaned) {
            notable_performances.push(cleaned);
        }
    }
    for cap in regex(r"(?i)last\\s+(?:played?|performance|show|gig)[^\\.]{0,100}")
        .captures_iter(&body_text)
    {
        let cleaned = normalize_whitespace(cap.get(0).map(|m| m.as_str()).unwrap_or(""));
        if cleaned.len() > 10 && !notable_performances.contains(&cleaned) {
            notable_performances.push(cleaned);
        }
    }
    notable_performances.truncate(10);

    let mut notes: Option<String> = None;
    if let Some(idx) = body_text.find("Description") {
        let section = &body_text[idx..body_text.len().min(idx + 500)];
        if let Some(cap) =
            regex(r"Description[\\s\\S]*?(The .+?)(?=Sort|Order|Alphabetically|\\n\\s*\\n|$)")
                .captures(section)
        {
            let cleaned = normalize_whitespace(cap.get(1).map(|m| m.as_str()).unwrap_or(""));
            if cleaned.len() > 10 {
                notes = Some(cleaned);
            }
        }
    }

    let shows = parse_venue_show_history(&document);
    if total_shows > 0 && shows.is_empty() {
        warn_missing_field("venue_stats", "shows");
    }
    if total_shows > 0 && top_songs.is_empty() {
        warn_missing_field("venue_stats", "topSongs");
    }

    let mut partial = false;
    if total_shows > 0 && shows.is_empty() {
        partial = true;
    }
    if total_shows > 0 && top_songs.is_empty() {
        partial = true;
    }

    let mut result = json!({
        "originalId": venue_id,
        "venueName": venue_name,
        "city": city,
        "state": state,
        "country": country,
        "firstShowDate": first_show_date,
        "lastShowDate": last_show_date,
        "totalShows": total_shows,
        "capacity": capacity,
        "akaNames": aka_names,
        "topSongs": top_songs,
        "notes": notes,
        "notablePerformances": notable_performances,
        "shows": shows
    });
    validate_required_fields(
        "venue_stats",
        &result,
        &["originalId", "venueName", "city", "totalShows"],
    );
    if partial {
        if let Some(obj) = result.as_object_mut() {
            obj.insert("_partial".to_string(), Value::Bool(true));
        }
    }
    Some(result)
}

fn parse_venue_show_history(document: &Html) -> Vec<Value> {
    let Some(row_selector) = selector_or_warn("tr", "tr") else {
        return Vec::new();
    };
    let Some(show_link_selector) = selector_or_warn(
        "a[href*='TourShowSet.aspx'], a[href*='ShowSetlist.aspx']",
        "a[href*='TourShowSet.aspx'], a[href*='ShowSetlist.aspx']",
    ) else {
        return Vec::new();
    };
    warn_if_empty(document, &row_selector, "venue_stats.show_history", "tr");
    warn_if_empty(
        document,
        &show_link_selector,
        "venue_stats.show_history",
        "show_link",
    );
    let release_selector = selector_or_warn(
        "img[src*='album'], img[src*='cd']",
        "img[src*='album'], img[src*='cd']",
    );
    let mut shows = Vec::new();
    for row in document.select(&row_selector) {
        let Some(show_link) = row.select(&show_link_selector).next() else {
            continue;
        };
        let show_id = show_link
            .value()
            .attr("href")
            .and_then(|href| regex(r"id=(\\d+)").captures(href))
            .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()));
        let date_text = normalize_whitespace(&show_link.text().collect::<String>());
        let parsed_date = parse_mdy_any(&date_text);
        if parsed_date.is_none() {
            warn_missing_field("venue_stats.show_history", "date");
        }
        let date = parsed_date.unwrap_or_else(|| date_text.clone());
        let year = date
            .get(0..4)
            .and_then(|s| s.parse::<i64>().ok())
            .unwrap_or_else(|| {
                warn_missing_field("venue_stats.show_history", "year");
                0
            });
        let mut song_count = 0;
        if let Some(td_sel) = selector_or_warn("td", "td") {
            for cell in row.select(&td_sel) {
                let text = normalize_whitespace(&cell.text().collect::<String>());
                if regex(r"^\\d+$").is_match(&text) {
                    song_count =
                        parse_i64_or_warn(Some(&text), "venue_stats.show_history", "songCount");
                }
            }
        }
        let has_release = release_selector
            .as_ref()
            .map(|selector| row.select(selector).next().is_some())
            .unwrap_or(false);
        shows.push(json!({
            "showId": show_id,
            "date": date,
            "year": year,
            "songCount": song_count,
            "isOnRelease": has_release
        }));
    }
    let missing_show_id = shows.iter().any(|show| match show.get("showId") {
        None | Some(Value::Null) => true,
        Some(Value::String(text)) if text.trim().is_empty() => true,
        _ => false,
    });
    if missing_show_id {
        warn_missing_field("venue_stats.show_history", "showId");
    }
    shows
}

#[cfg(test)]
#[allow(clippy::items_after_test_module)]
mod tests {
    use super::*;

    fn parse_show_page_html(html: &str, id: &str) -> Show {
        let document = Html::parse_document(html);
        warn_if_no_selector_match(
            &document,
            "show",
            "dateSelector",
            &["select option:selected", ".show-date", "h1", "h2"],
        );
        let date = extract_show_date_with_body(&document);
        if date.is_none() {
            warn_missing_field("show", "date");
        }
        let date = date.unwrap_or_else(|| "1990-01-01".to_string());
        let year = date
            .get(0..4)
            .and_then(|s| s.parse::<i32>().ok())
            .unwrap_or(1990);
        let (venue_id, song_count) = extract_show_meta(&document);
        Show {
            id: parse_i32_or_warn(Some(id), "show", "id"),
            date,
            venue_id,
            tour_id: Some(1990),
            year,
            song_count,
            rarity_index: None,
        }
    }

    #[test]
    fn snapshot_song_stats_extracts_core_fields() {
        with_warning_lock(|| {
            let html = include_str!("../tests/fixtures/song_stats.html");
            let parsed = parse_song_stats_page(html, 42, "Test Song");
            assert_eq!(parsed.get("totalPlays").and_then(|v| v.as_i64()), Some(12));
            assert_eq!(
                parsed.get("firstPlayedDate").and_then(|v| v.as_str()),
                Some("1999-01-01")
            );
            assert_eq!(
                parsed.get("lastPlayedDate").and_then(|v| v.as_str()),
                Some("2000-12-31")
            );
            assert_eq!(
                parsed.get("avgLengthSeconds").and_then(|v| v.as_i64()),
                Some(330)
            );

            let longest = parsed
                .get("longestVersion")
                .expect("longestVersion missing");
            assert_eq!(longest.get("showId").and_then(|v| v.as_str()), Some("123"));
            assert_eq!(
                longest.get("venue").and_then(|v| v.as_str()),
                Some("Test Venue")
            );
            let shortest = parsed
                .get("shortestVersion")
                .expect("shortestVersion missing");
            assert_eq!(shortest.get("showId").and_then(|v| v.as_str()), Some("123"));

            let plays = parsed
                .get("playsByYear")
                .and_then(|v| v.as_array())
                .expect("playsByYear missing");
            assert_eq!(plays.len(), 1);
            assert_eq!(plays[0].get("year").and_then(|v| v.as_i64()), Some(2001));
            assert_eq!(plays[0].get("plays").and_then(|v| v.as_i64()), Some(12));

            let segues = parsed
                .get("topSeguesInto")
                .and_then(|v| v.as_array())
                .expect("topSeguesInto missing");
            assert_eq!(segues.len(), 1);
            assert_eq!(
                segues[0].get("songId").and_then(|v| v.as_str()),
                Some("100")
            );

            let segues_from = parsed
                .get("topSeguesFrom")
                .and_then(|v| v.as_array())
                .expect("topSeguesFrom missing");
            assert_eq!(segues_from.len(), 1);
            assert_eq!(
                segues_from[0].get("songId").and_then(|v| v.as_str()),
                Some("200")
            );

            let version_types = parsed
                .get("versionTypes")
                .and_then(|v| v.as_object())
                .expect("versionTypes missing");
            assert_eq!(version_types.get("full").and_then(|v| v.as_i64()), Some(10));
            assert_eq!(version_types.get("tease").and_then(|v| v.as_i64()), Some(1));

            let release_counts = parsed
                .get("releaseCounts")
                .and_then(|v| v.as_object())
                .expect("releaseCounts missing");
            assert_eq!(
                release_counts.get("total").and_then(|v| v.as_i64()),
                Some(10)
            );
            assert_eq!(
                release_counts.get("studio").and_then(|v| v.as_i64()),
                Some(2)
            );
            assert_eq!(release_counts.get("live").and_then(|v| v.as_i64()), Some(3));
            assert_eq!(
                release_counts.get("dmblive").and_then(|v| v.as_i64()),
                Some(1)
            );
            assert_eq!(
                release_counts.get("warehouse").and_then(|v| v.as_i64()),
                Some(1)
            );
            assert_eq!(
                release_counts.get("liveTrax").and_then(|v| v.as_i64()),
                Some(2)
            );
            assert_eq!(
                release_counts.get("broadcasts").and_then(|v| v.as_i64()),
                Some(1)
            );

            let artist_stats = parsed
                .get("artistStats")
                .and_then(|v| v.as_array())
                .expect("artistStats missing");
            assert_eq!(artist_stats.len(), 2);
            assert_eq!(
                artist_stats[0].get("playCount").and_then(|v| v.as_i64()),
                Some(8)
            );
            assert_eq!(
                artist_stats[1].get("playCount").and_then(|v| v.as_i64()),
                Some(4)
            );
            let counts = warning_counts();
            assert_eq!(counts, (0, 0));
        });
    }

    #[test]
    fn snapshot_venue_stats_extracts_core_fields() {
        with_warning_lock(|| {
            let html = include_str!("../tests/fixtures/venue_stats.html");
            let parsed = parse_venue_stats_page(html, 99);
            assert!(parsed.is_some(), "venue stats missing");
            let parsed = parsed.expect("venue stats missing");
            assert_eq!(
                parsed.get("venueName").and_then(|v| v.as_str()),
                Some("The Gorge Amphitheatre")
            );
            assert_eq!(parsed.get("city").and_then(|v| v.as_str()), Some("George"));
            assert_eq!(parsed.get("state").and_then(|v| v.as_str()), Some("WA"));
            assert_eq!(parsed.get("totalShows").and_then(|v| v.as_i64()), Some(10));
            assert_eq!(
                parsed.get("firstShowDate").and_then(|v| v.as_str()),
                Some("1995-01-01")
            );
            let shows = parsed
                .get("shows")
                .and_then(|v| v.as_array())
                .expect("shows missing");
            assert!(!shows.is_empty());
            assert_eq!(shows[0].get("showId").and_then(|v| v.as_str()), Some("321"));
            let counts = warning_counts();
            assert_eq!(counts, (0, 0));
        });
    }

    #[test]
    fn snapshot_guest_shows_extracts_core_fields() {
        with_warning_lock(|| {
            let html = include_str!("../tests/fixtures/guest_shows.html");
            let parsed = parse_guest_shows_page(html, 7, "Guest X");
            assert_eq!(
                parsed.get("totalAppearances").and_then(|v| v.as_i64()),
                Some(1)
            );
            assert_eq!(
                parsed.get("firstAppearanceDate").and_then(|v| v.as_str()),
                Some("2003-01-02")
            );
            let appearances = parsed
                .get("appearances")
                .and_then(|v| v.as_array())
                .expect("appearances missing");
            assert_eq!(appearances.len(), 1);
            assert_eq!(
                appearances[0].get("showId").and_then(|v| v.as_str()),
                Some("555")
            );
            let songs = appearances[0]
                .get("songs")
                .and_then(|v| v.as_array())
                .expect("songs missing");
            assert_eq!(songs[0].get("songId").and_then(|v| v.as_str()), Some("77"));
            let counts = warning_counts();
            assert_eq!(counts, (0, 0));
        });
    }

    #[test]
    fn snapshot_liberations_extracts_core_fields() {
        with_warning_lock(|| {
            let html = include_str!("../tests/fixtures/liberations.html");
            let document = Html::parse_document(html);
            let entries = parse_song_liberations(&document);
            assert_eq!(entries.len(), 1);
            assert_eq!(
                entries[0].get("lastPlayedShowId").and_then(|v| v.as_str()),
                Some("100")
            );
            assert_eq!(
                entries[0].get("liberationShowId").and_then(|v| v.as_str()),
                Some("200")
            );
            assert_eq!(
                entries[0].get("daysSince").and_then(|v| v.as_i64()),
                Some(10)
            );
            assert_eq!(
                entries[0].get("showsSince").and_then(|v| v.as_i64()),
                Some(2)
            );
            let counts = warning_counts();
            assert_eq!(counts, (0, 0));
        });
    }

    #[test]
    fn snapshot_venue_show_history_extracts_core_fields() {
        with_warning_lock(|| {
            let html = include_str!("../tests/fixtures/venue_show_history.html");
            let document = Html::parse_document(html);
            let shows = parse_venue_show_history(&document);
            assert_eq!(shows.len(), 1);
            assert_eq!(shows[0].get("showId").and_then(|v| v.as_str()), Some("222"));
            assert_eq!(
                shows[0].get("date").and_then(|v| v.as_str()),
                Some("1996-01-03")
            );
            assert_eq!(shows[0].get("songCount").and_then(|v| v.as_i64()), Some(20));
            assert_eq!(
                shows[0].get("isOnRelease").and_then(|v| v.as_bool()),
                Some(true)
            );
            let counts = warning_counts();
            assert_eq!(counts, (0, 0));
        });
    }

    #[test]
    fn snapshot_song_performances_extracts_core_fields() {
        with_warning_lock(|| {
            let html = include_str!("../tests/fixtures/song_performances.html");
            let document = Html::parse_document(html);
            let performances = parse_song_performances(&document);
            assert_eq!(performances.len(), 6);
            assert_eq!(
                performances[0].get("showId").and_then(|v| v.as_str()),
                Some("1")
            );
            assert_eq!(
                performances[0].get("duration").and_then(|v| v.as_str()),
                Some("4:32")
            );
            assert_eq!(
                performances[0].get("isTease").and_then(|v| v.as_bool()),
                Some(true)
            );
            assert_eq!(
                performances[0].get("isSegue").and_then(|v| v.as_bool()),
                Some(true)
            );
            assert_eq!(
                performances[0].get("isOnRelease").and_then(|v| v.as_bool()),
                Some(true)
            );
            let counts = warning_counts();
            assert_eq!(counts, (0, 0));
        });
    }

    #[test]
    fn snapshot_lists_extracts_core_fields() {
        with_warning_lock(|| {
            let html = include_str!("../tests/fixtures/lists.html");
            let lists = parse_lists_page(html);
            assert_eq!(lists.len(), 2);
            assert_eq!(lists[0].get("id").and_then(|v| v.as_str()), Some("101"));
            assert_eq!(
                lists[0].get("title").and_then(|v| v.as_str()),
                Some("Top Shows")
            );
            assert_eq!(
                lists[0].get("category").and_then(|v| v.as_str()),
                Some("Fan Lists")
            );
            let counts = warning_counts();
            assert_eq!(counts, (0, 0));
        });
    }

    #[test]
    fn apply_max_items_truncates() {
        let mut items = vec![1, 2, 3, 4];
        apply_max_items(&mut items, Some(2));
        assert_eq!(items, vec![1, 2]);
    }

    #[test]
    fn warns_on_missing_release_ids() {
        with_warning_lock(|| {
            let html = include_str!("../tests/fixtures/release_links_missing_id.html");
            let document = Html::parse_document(html);
            let releases = parse_release_links(&document);
            assert!(!releases.is_empty());
            let (_, missing) = warning_counts();
            assert!(missing >= 1);
            let missing_by_field = warning_missing_by_field();
            assert!(missing_by_field
                .get("release.id")
                .or_else(|| missing_by_field.get("release"))
                .is_some());
        });
    }

    #[test]
    fn release_page_fixture_reports_missing_date() {
        with_warning_lock(|| {
            let html = include_str!("../tests/fixtures/release_missing_date.html");
            let release = parse_release_page_html(html, 101, "Mock Release");
            assert_eq!(release.id, 101);
            let (_, missing) = warning_counts();
            assert!(missing >= 1);
        });
    }

    #[test]
    fn show_page_fixture_has_required_selectors() {
        with_warning_lock(|| {
            let html = include_str!("../tests/fixtures/show_page.html");
            let show = parse_show_page_html(html, "1234");
            assert_eq!(show.id, 1234);
            let counts = warning_counts();
            assert_eq!(counts, (0, 0));
        });
    }

    #[test]
    fn warning_report_includes_error_counts() {
        with_warning_lock(|| {
            reset_warning_state();
            record_scrape_error(
                ScrapeErrorKind::HttpStatus,
                "http",
                "https://example.com",
                Some("status 500"),
            );
            let temp_dir = std::env::temp_dir().join(format!(
                "dmb_scrape_report_{}",
                rand::thread_rng().gen::<u64>()
            ));
            fs::create_dir_all(&temp_dir).expect("create temp dir");
            let report_path = temp_dir.join("warning-report.json");
            write_warning_report(&report_path, 0, 0, None).expect("write warning report");
            let contents = fs::read_to_string(&report_path).expect("read warning report");
            let parsed: Value = serde_json::from_str(&contents).expect("parse warning report json");
            let error_counts = parsed
                .get("errorCounts")
                .expect("missing errorCounts")
                .as_object()
                .expect("errorCounts is not object");
            assert_eq!(
                error_counts.get("http_status").and_then(|v| v.as_i64()),
                Some(1)
            );
            let error_summary = parsed
                .get("errorEventsSummary")
                .expect("missing errorEventsSummary")
                .as_object()
                .expect("errorEventsSummary is not object");
            assert_eq!(
                error_summary.get("http_status").and_then(|v| v.as_i64()),
                Some(1)
            );
        });
    }

    #[test]
    fn scrape_summary_includes_error_counts() {
        with_warning_lock(|| {
            reset_warning_state();
            record_scrape_error(
                ScrapeErrorKind::CacheRead,
                "cache",
                "dummy",
                Some("read failure"),
            );
            let temp_dir = std::env::temp_dir().join(format!(
                "dmb_scrape_summary_{}",
                rand::thread_rng().gen::<u64>()
            ));
            fs::create_dir_all(&temp_dir).expect("create temp dir");
            let report_path = temp_dir.join("warning-report.json");
            write_scrape_summary(&report_path, 0, 0).expect("write scrape summary");
            let summary_path = temp_dir.join("scrape-summary.json");
            let contents = fs::read_to_string(&summary_path).expect("read scrape summary");
            let parsed: Value = serde_json::from_str(&contents).expect("parse scrape summary json");
            let error_counts = parsed
                .get("errorCounts")
                .expect("missing errorCounts")
                .as_object()
                .expect("errorCounts is not object");
            assert_eq!(
                error_counts.get("cache_read").and_then(|v| v.as_i64()),
                Some(1)
            );
            let error_summary = parsed
                .get("errorEventsSummary")
                .expect("missing errorEventsSummary")
                .as_object()
                .expect("errorEventsSummary is not object");
            assert_eq!(
                error_summary.get("cache_read").and_then(|v| v.as_i64()),
                Some(1)
            );
        });
    }

    #[test]
    fn selector_parse_error_is_tracked() {
        with_warning_lock(|| {
            reset_warning_state();
            let selector = selector_or_warn("bad", "a[");
            assert!(selector.is_none());
            let counts = error_counts();
            assert_eq!(counts.get("selector_parse").copied(), Some(1));
            let events = error_events();
            assert!(events.iter().any(|event| {
                event
                    .get("kind")
                    .and_then(|v| v.as_str())
                    .map(|kind| kind == "selector_parse")
                    .unwrap_or(false)
            }));
        });
    }

    #[test]
    fn regex_parse_error_is_tracked() {
        with_warning_lock(|| {
            reset_warning_state();
            let _ = regex("[");
            let counts = error_counts();
            assert_eq!(counts.get("regex_parse").copied(), Some(1));
        });
    }

    #[test]
    fn cache_read_error_is_tracked() {
        with_warning_lock(|| {
            reset_warning_state();
            let temp_dir = std::env::temp_dir().join(format!(
                "dmb_scrape_cache_read_{}",
                rand::thread_rng().gen::<u64>()
            ));
            fs::create_dir_all(&temp_dir).expect("create temp dir");
            let url = "https://example.com/BadCache.html";
            let hash = blake3::hash(url.as_bytes()).to_hex().to_string();
            let cache_path = temp_dir.join(format!("{hash}.html"));
            fs::write(&cache_path, [0xff, 0xfe, 0xfd]).expect("write invalid cache");
            let client =
                ScrapeClient::new(temp_dir.clone(), 0, 0, 0, None, true, None).expect("client");
            let result = client.fetch_html(url);
            assert!(result.is_err());
            let counts = error_counts();
            assert_eq!(counts.get("cache_read").copied(), Some(1));
        });
    }

    #[test]
    fn cache_missing_error_is_tracked() {
        with_warning_lock(|| {
            reset_warning_state();
            let temp_dir = std::env::temp_dir().join(format!(
                "dmb_scrape_cache_missing_{}",
                rand::thread_rng().gen::<u64>()
            ));
            fs::create_dir_all(&temp_dir).expect("create temp dir");
            let client = ScrapeClient::new(temp_dir, 0, 0, 0, None, true, None).expect("client");
            let result = client.fetch_html("https://example.com/Miss.html");
            assert!(result.is_err());
            let counts = error_counts();
            assert_eq!(counts.get("cache_missing").copied(), Some(1));
        });
    }

    #[test]
    fn show_date_falls_back_to_body_text() {
        with_warning_lock(|| {
            let html = "<html><body><div>Show Date: 2002-05-03</div></body></html>";
            let show = parse_show_page_html(html, "77");
            assert_eq!(show.date, "2002-05-03");
            let (_, missing) = warning_counts();
            assert!(missing >= 1);
        });
    }

    #[test]
    fn venue_page_missing_location_warns() {
        with_warning_lock(|| {
            let html = "<html><body><h1>Test Venue</h1></body></html>";
            let venue = parse_venue_page_html(html, "https://example.com/VenueStats.aspx?vid=99");
            assert!(venue.is_ok(), "venue parse ok");
            let venue = venue.expect("venue parse ok");
            let venue = venue.expect("venue missing");
            assert_eq!(venue.name, "Test Venue");
            assert_eq!(venue.city, "");
            let (_, missing) = warning_counts();
            assert!(missing >= 1);
        });
    }

    #[test]
    fn parse_show_date_supports_multiple_formats() {
        assert_eq!(
            parse_show_date("2004-07-04"),
            Some("2004-07-04".to_string())
        );
        assert_eq!(
            parse_show_date("2004/07/04"),
            Some("2004-07-04".to_string())
        );
        assert_eq!(
            parse_show_date("07/04/2004"),
            Some("2004-07-04".to_string())
        );
    }

    #[test]
    fn selector_missing_events_are_recorded() {
        with_warning_lock(|| {
            let html = "<html><body><div>No selectors</div></body></html>";
            let document = Html::parse_document(html);
            warn_if_no_selector_match(
                &document,
                "show",
                "dateSelector",
                &["select option:selected", ".show-date"],
            );
            let events = SCRAPE_WARNING_EVENTS
                .lock()
                .map(|events| events.clone())
                .unwrap_or_default();
            assert!(events.iter().any(|event| {
                event
                    .get("kind")
                    .and_then(|v| v.as_str())
                    .map(|kind| kind == "selector_missing")
                    .unwrap_or(false)
            }));
        });
    }

    #[test]
    fn warns_on_empty_segues_and_plays_by_year() {
        let html = include_str!("../tests/fixtures/song_stats_missing.html");
        let document = Html::parse_document(html);

        with_warning_lock(|| {
            let segues = parse_top_segues(&document, true);
            assert!(segues.is_empty());
            let (_, missing) = warning_counts();
            assert!(missing >= 1);
        });

        with_warning_lock(|| {
            let plays = parse_plays_by_year(&document);
            assert!(plays.is_empty());
            let (_, missing) = warning_counts();
            assert!(missing >= 1);
        });
    }

    #[test]
    fn warns_on_missing_song_id_in_segues() {
        with_warning_lock(|| {
            let html = include_str!("../tests/fixtures/song_stats_missing_sid.html");
            let document = Html::parse_document(html);
            let segues = parse_top_segues(&document, true);
            assert_eq!(segues.len(), 1);
            assert_eq!(segues[0].get("songId").and_then(|v| v.as_str()), Some(""));
            let (_, missing) = warning_counts();
            assert!(missing >= 1);
            let missing_by_field = warning_missing_by_field();
            assert!(
                missing_by_field.contains_key("song_stats")
                    || missing_by_field.contains_key("song_stats.songId")
            );
        });
    }

    #[test]
    fn release_type_detection_handles_unknowns() {
        with_warning_lock(|| {
            let html = include_str!("../tests/fixtures/release_unknown.html");
            let release = parse_release_page_html(html, 1, "Mystery Release");
            assert!(release.release_type.is_none());
            let (_, missing) = warning_counts();
            assert!(missing >= 1);
        });
    }

    #[test]
    fn detect_release_type_recognizes_known_patterns() {
        assert_eq!(
            detect_release_type("Live Trax volume 10"),
            Some("live_trax".to_string())
        );
        assert_eq!(
            detect_release_type("Warehouse 10 Vol. 3"),
            Some("warehouse".to_string())
        );
        assert_eq!(
            detect_release_type("Greatest Hits compilation"),
            Some("compilation".to_string())
        );
    }

    #[test]
    fn warns_on_missing_release_date() {
        with_warning_lock(|| {
            let html = include_str!("../tests/fixtures/release_missing_date.html");
            let release = parse_release_page_html(html, 2, "No Date Release");
            assert_eq!(release.title, "No Date Release");
            let (_, missing) = warning_counts();
            assert!(missing >= 1);
        });
    }

    #[test]
    fn warns_on_missing_show_id_performances() {
        with_warning_lock(|| {
            let html = include_str!("../tests/fixtures/song_performances_missing_id.html");
            let document = Html::parse_document(html);
            let performances = parse_song_performances(&document);
            assert!(!performances.is_empty());
            let (_, missing) = warning_counts();
            assert!(missing >= 1);
            let missing_by_field = warning_missing_by_field();
            assert!(
                missing_by_field
                    .get("song_stats.performances.showId")
                    .copied()
                    .unwrap_or(0)
                    >= 1
            );
        });
    }

    #[test]
    fn warns_on_missing_liberation_link() {
        with_warning_lock(|| {
            let html = include_str!("../tests/fixtures/liberations_missing_link.html");
            let document = Html::parse_document(html);
            let entries = parse_song_liberations(&document);
            assert_eq!(entries.len(), 1);
            let (_, missing) = warning_counts();
            assert!(missing >= 1);
        });
    }

    #[test]
    fn warns_on_missing_guest_song_id() {
        with_warning_lock(|| {
            let html = include_str!("../tests/fixtures/guest_shows_missing_song_id.html");
            let parsed = parse_guest_shows_page(html, 11, "Guest Y");
            assert_eq!(
                parsed.get("totalAppearances").and_then(|v| v.as_i64()),
                Some(1)
            );
            let (_, missing) = warning_counts();
            assert!(missing >= 1);
            let missing_by_field = warning_missing_by_field();
            assert!(
                missing_by_field
                    .get("guest_shows.songId")
                    .copied()
                    .unwrap_or(0)
                    >= 1
            );
        });
    }

    #[test]
    fn warns_on_missing_venue_history_show_id() {
        with_warning_lock(|| {
            let html = include_str!("../tests/fixtures/venue_show_history_missing_show_id.html");
            let document = Html::parse_document(html);
            let shows = parse_venue_show_history(&document);
            assert_eq!(shows.len(), 1);
            let (_, missing) = warning_counts();
            assert!(missing >= 1);
            let missing_by_field = warning_missing_by_field();
            assert!(
                missing_by_field
                    .get("venue_stats.show_history.showId")
                    .copied()
                    .unwrap_or(0)
                    >= 1
            );
        });
    }

    #[test]
    fn warns_on_song_stats_selector_drift() {
        with_warning_lock(|| {
            let html = include_str!("../tests/fixtures/song_stats_selector_drift.html");
            let _ = parse_song_stats_page(html, 7, "Drift Song");
            let (_, missing) = warning_counts();
            assert!(missing >= 1);
            let missing_by_field = warning_missing_by_field();
            assert!(
                missing_by_field
                    .get("song_stats.performanceSelector")
                    .copied()
                    .unwrap_or(0)
                    >= 1
            );
        });
    }

    #[test]
    fn warns_on_show_selector_drift() {
        with_warning_lock(|| {
            let html = include_str!("../tests/fixtures/show_page_selector_drift.html");
            let document = Html::parse_document(html);
            let _ = extract_show_meta(&document);
            let (_, missing) = warning_counts();
            assert!(missing >= 1);
            let missing_by_field = warning_missing_by_field();
            assert!(
                missing_by_field
                    .get("show.venueLinkSelector")
                    .copied()
                    .unwrap_or(0)
                    >= 1
            );
        });
    }

    #[test]
    fn warns_on_release_selector_drift() {
        with_warning_lock(|| {
            let html = include_str!("../tests/fixtures/release_selector_drift.html");
            let release = parse_release_page_html(html, 33, "");
            assert_eq!(release.title, "");
            let (_, missing) = warning_counts();
            assert!(missing >= 1);
            let missing_by_field = warning_missing_by_field();
            assert!(
                missing_by_field
                    .get("release.titleSelector")
                    .copied()
                    .unwrap_or(0)
                    >= 1
            );
        });
    }

    #[test]
    fn warns_on_endpoint_retry_accounting() {
        with_warning_lock(|| {
            record_endpoint_retry("ShowSetlist.aspx");
            record_endpoint_retry("ShowSetlist.aspx");
            let retries = warning_endpoint_retries();
            assert_eq!(retries.get("ShowSetlist.aspx").copied().unwrap_or(0), 2);
        });
    }

    #[test]
    fn parse_functions_do_not_panic_on_malformed_html() {
        with_warning_lock(|| {
            let html = "<html><body><div>broken</div></body></html>";
            let result = std::panic::catch_unwind(|| {
                let _ = parse_song_stats_page(html, 99, "Broken");
                let _ = parse_guest_shows_page(html, 99, "Broken");
                let _ = parse_venue_stats_page(html, 99);
                let _ = parse_lists_page(html);
            });
            assert!(result.is_ok());
        });
    }

    #[test]
    fn venue_show_history_smoke_no_missing_when_ids_present() {
        with_warning_lock(|| {
            let html = include_str!("../tests/fixtures/venue_stats.html");
            let document = Html::parse_document(html);
            let shows = parse_venue_show_history(&document);
            assert_eq!(shows.len(), 1);
            let (_, missing) = warning_counts();
            assert_eq!(missing, 0);
        });
    }

    #[test]
    fn warns_on_selector_drift_for_venue_show_history() {
        with_warning_lock(|| {
            let html = include_str!("../tests/fixtures/venue_show_history_selector_drift.html");
            let document = Html::parse_document(html);
            let shows = parse_venue_show_history(&document);
            assert_eq!(shows.len(), 0);
            let (empty, _) = warning_counts();
            assert!(empty >= 1);
            let empty_by_selector = warning_empty_by_selector();
            assert!(
                empty_by_selector
                    .get("venue_stats.show_history.show_link")
                    .copied()
                    .unwrap_or(0)
                    >= 1
            );
        });
    }

    #[test]
    fn warns_on_missing_top_song_play_count() {
        with_warning_lock(|| {
            let html = include_str!("../tests/fixtures/venue_stats_top_song_missing_count.html");
            let parsed = parse_venue_stats_page(html, 99);
            assert!(parsed.is_some(), "venue stats missing");
            let parsed = parsed.expect("venue stats missing");
            let top_songs = parsed
                .get("topSongs")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();
            assert_eq!(top_songs.len(), 1);
            let (_, missing) = warning_counts();
            assert!(missing >= 1);
            let missing_by_field = warning_missing_by_field();
            assert!(
                missing_by_field
                    .get("venue_stats.top_songs.playCount")
                    .copied()
                    .unwrap_or(0)
                    >= 1
            );
        });
    }

    #[test]
    fn warns_on_missing_list_id() {
        with_warning_lock(|| {
            let html = include_str!("../tests/fixtures/list_missing_id.html");
            let lists = parse_lists_page(html);
            assert_eq!(lists.len(), 1);
            let (_, missing) = warning_counts();
            assert!(missing >= 1);
        });
    }
}

fn scrape_liberation(client: &ScrapeClient) -> Result<Vec<Value>> {
    let url = format!("{BASE_URL}/Liberation.aspx");
    let html = client.fetch_html(&url)?;
    let document = Html::parse_document(&html);
    let Some(row_selector) = selector_or_warn(
        "table.liberation-list tbody tr",
        "table.liberation-list tbody tr",
    ) else {
        return Ok(Vec::new());
    };
    let Some(song_selector) = selector_or_warn(
        "td.rowcell.lj a[href*='summary.aspx']",
        "td.rowcell.lj a[href*='summary.aspx']",
    ) else {
        return Ok(Vec::new());
    };
    let Some(last_played_selector) = selector_or_warn(
        "td.rowcell.cj a[href*='TourShowSet']",
        "td.rowcell.cj a[href*='TourShowSet']",
    ) else {
        return Ok(Vec::new());
    };
    let Some(days_selector) = selector_or_warn(
        "td.rowcell.cj.d-none.d-sm-table-cell",
        "td.rowcell.cj.d-none.d-sm-table-cell",
    ) else {
        return Ok(Vec::new());
    };
    let notes_selector = selector_or_warn("td.endcell.lj", "td.endcell.lj");
    warn_if_empty(&document, &row_selector, "liberation", "row");
    warn_if_empty(&document, &song_selector, "liberation", "song_link");
    warn_if_empty(
        &document,
        &last_played_selector,
        "liberation",
        "last_played_link",
    );
    warn_if_empty(&document, &days_selector, "liberation", "days_cells");

    let mut entries = Vec::new();
    for row in document.select(&row_selector) {
        let is_liberated = row
            .value()
            .attr("style")
            .map(|v| v.contains("background-color"))
            .unwrap_or(false);
        let song_link = row.select(&song_selector).next();
        let last_played = row.select(&last_played_selector).next();
        if song_link.is_none() || last_played.is_none() {
            continue;
        }
        let Some(song_link) = song_link else {
            continue;
        };
        let song_title = normalize_whitespace(&song_link.text().collect::<String>());
        let song_id = song_link
            .value()
            .attr("href")
            .and_then(|href| regex(r"sid=(\\d+)").captures(href))
            .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()))
            .unwrap_or_default();
        if song_id.is_empty() {
            warn_missing_field("liberation", "songId");
        }

        let Some(last_played_link) = last_played else {
            continue;
        };
        let last_played_date_text =
            normalize_whitespace(&last_played_link.text().collect::<String>());
        let last_played_date = parse_dot_date(&last_played_date_text).unwrap_or_else(|| {
            warn_missing_field("liberation", "lastPlayedDate");
            String::new()
        });
        let last_played_show_id = last_played_link
            .value()
            .attr("href")
            .and_then(|href| regex(r"id=(\\d+)").captures(href))
            .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()))
            .unwrap_or_default();
        if last_played_show_id.is_empty() {
            warn_missing_field("liberation", "lastPlayedShowId");
        }

        let mut days_since = 0;
        let mut shows_since = 0;
        let mut cells = row.select(&days_selector);
        if let Some(cell) = cells.next() {
            let text = normalize_whitespace(&cell.text().collect::<String>());
            days_since = parse_i64_or_warn(Some(&text), "liberation", "daysSince");
        }
        if let Some(cell) = cells.next() {
            let text = normalize_whitespace(&cell.text().collect::<String>());
            shows_since = parse_i64_or_warn(Some(&text), "liberation", "showsSince");
        }

        let notes_cell = notes_selector
            .as_ref()
            .and_then(|selector| row.select(selector).next());
        let mut notes = notes_cell
            .as_ref()
            .map(|cell| normalize_whitespace(&cell.text().collect::<String>()))
            .unwrap_or_default();
        let mut liberated_date = None;
        let mut liberated_show_id = None;
        if let Some(cell) = notes_cell {
            if is_liberated {
                if let Some(link) = cell.select(&last_played_selector).last() {
                    if let Some(href) = link.value().attr("href") {
                        liberated_show_id = regex(r"id=(\\d+)")
                            .captures(href)
                            .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()));
                    }
                    let link_text = normalize_whitespace(&link.text().collect::<String>());
                    liberated_date = parse_dot_date(&link_text);
                }
            }
        }
        if is_liberated && liberated_show_id.as_deref().unwrap_or("").is_empty() {
            warn_missing_field("liberation", "liberatedShowId");
        }

        let notes_lower = notes.to_lowercase();
        let configuration =
            if notes_lower.contains("dave & tim") || notes_lower.contains("dave and tim") {
                "dave_tim"
            } else if notes_lower.contains("dave solo") {
                "dave_solo"
            } else {
                "full_band"
            };
        if notes.contains("LIBERATED") {
            notes = notes.replace("-=LIBERATED", "").trim().to_string();
        }

        entries.push(json!({
            "songId": song_id,
            "songTitle": song_title,
            "lastPlayedDate": last_played_date,
            "lastPlayedShowId": last_played_show_id,
            "daysSince": days_since,
            "showsSince": shows_since,
            "notes": if notes.is_empty() { Value::Null } else { Value::String(notes) },
            "configuration": configuration,
            "isLiberated": is_liberated,
            "liberatedDate": liberated_date,
            "liberatedShowId": liberated_show_id,
        }));
    }

    if entries.is_empty() {
        warn_missing_field("liberation", "entries");
    }
    Ok(entries)
}

fn scrape_rarity(client: &ScrapeClient) -> Result<Vec<Value>> {
    let url = format!("{BASE_URL}/ShowRarity.aspx");
    let html = client.fetch_html(&url)?;
    let mut tours = Vec::new();
    let mut by_year: HashMap<i32, usize> = HashMap::new();
    let mut avg_matches = 0usize;

    let avg_re = regex(
        r"(\\d+)\\s*<a[^>]+TourShow[Ii]nfo\\.aspx\\?tid=(\\d+)[^>]*where=(\\d{4})[^>]*>([^<]+)</a>\\s*\\((\\d+\\.\\d+)\\)",
    );
    for cap in avg_re.captures_iter(&html) {
        avg_matches += 1;
        let Some(rank) = cap.get(1).and_then(|m| m.as_str().parse::<i32>().ok()) else {
            continue;
        };
        let Some(year) = cap.get(3).and_then(|m| m.as_str().parse::<i32>().ok()) else {
            continue;
        };
        let rarity = parse_f64_or_warn(
            cap.get(5).map(|m| m.as_str()),
            "rarity",
            "averageRarityIndex",
        );
        let tour_name = cap
            .get(4)
            .map(|m| normalize_whitespace(m.as_str()))
            .unwrap_or_default();
        let entry = json!({
            "tourName": tour_name,
            "year": year,
            "averageRarityIndex": rarity,
            "differentSongsPlayed": 0,
            "rank": rank,
            "shows": [],
        });
        by_year.insert(year, tours.len());
        tours.push(entry);
    }
    if avg_matches == 0 {
        warn_missing_field("rarity", "averageRarity");
    }

    let songs_re = regex(
        r"<br>(\\d+)\\s*<a[^>]+TourShowInfo\\.aspx\\?tid=(\\d+)[^>]*where=(\\d{4})[^>]*>([^<]+)</a>\\s*\\((\\d+)\\)",
    );
    let mut songs_matches = 0usize;
    for cap in songs_re.captures_iter(&html) {
        songs_matches += 1;
        let Some(year) = cap.get(3).and_then(|m| m.as_str().parse::<i32>().ok()) else {
            continue;
        };
        let songs = parse_i32_or_warn(
            cap.get(5).map(|m| m.as_str()),
            "rarity",
            "differentSongsPlayed",
        );
        if let Some(idx) = by_year.get(&year).copied() {
            if let Some(obj) = tours[idx].as_object_mut() {
                obj.insert("differentSongsPlayed".to_string(), json!(songs));
            }
        }
    }
    if songs_matches == 0 {
        warn_missing_field("rarity", "differentSongsPlayed");
    }

    if tours.is_empty() {
        warn_missing_field("rarity", "tours");
    }
    Ok(tours)
}

fn scrape_history(client: &ScrapeClient) -> Result<Vec<Value>> {
    let mut entries = Vec::new();
    let days_in_month = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    for (month_idx, days) in days_in_month.iter().enumerate() {
        let month = month_idx + 1;
        for day in 1..=*days {
            let url = format!("{BASE_URL}/ThisDayinHistory.aspx?month={month}&day={day}");
            let html = client.fetch_html(&url)?;
            let document = Html::parse_document(&html);
            let Some(selector) = selector_or_warn(
                "a[href*='TourShowSet.aspx'][href*='id=']",
                "a[href*='TourShowSet.aspx'][href*='id=']",
            ) else {
                warn_missing_field("history", "showLinks");
                continue;
            };
            warn_if_empty(&document, &selector, "history", "show_link");
            for link in document.select(&selector) {
                let href = link.value().attr("href").unwrap_or("");
                let show_id = regex(r"id=(\\d+)")
                    .captures(href)
                    .and_then(|cap| cap.get(1))
                    .map(|m| m.as_str().to_string());
                if show_id.as_deref().unwrap_or("").is_empty() {
                    warn_missing_field("history", "showId");
                }
                let text = normalize_whitespace(&link.text().collect::<String>());
                let date = parse_dot_date(&text).unwrap_or_else(|| {
                    let year_match = regex(r"(19|20)\\d{2}")
                        .captures(&text)
                        .and_then(|cap| cap.get(0).map(|m| m.as_str().to_string()));
                    if let Some(year) = year_match {
                        format!("{}-{:02}-{:02}", year, month, day)
                    } else {
                        format!("{}-{:02}-{:02}", chrono::Utc::now().year(), month, day)
                    }
                });
                let year = parse_i32_or_warn(date.get(0..4), "history", "year");
                entries.push(json!({
                    "originalId": show_id,
                    "showDate": date,
                    "year": year,
                    "venueName": text,
                    "city": "",
                    "state": Value::Null,
                    "country": "USA",
                    "notes": Value::Null,
                }));
            }
        }
    }
    if entries.is_empty() {
        warn_missing_field("history", "entries");
    }
    Ok(entries)
}

fn scrape_lists(client: &ScrapeClient) -> Result<Vec<Value>> {
    let url = format!("{BASE_URL}/Lists.aspx");
    let html = client.fetch_html(&url)?;
    Ok(parse_lists_page(&html))
}

pub fn scrape_smoke(config: ScrapeConfig) -> Result<()> {
    let client = ScrapeClient::new(
        config.cache_dir.clone(),
        config.min_delay_ms,
        config.max_delay_ms,
        config.max_retries_override.unwrap_or(config.max_retries),
        config.endpoint_retry_max,
        config.dry_run,
        config.cache_ttl_days,
    )?;
    client.prune_cache()?;

    let checks = vec![
        (
            format!("{BASE_URL}/SongList.aspx"),
            "a[href*='SongStats.aspx'][href*='sid=']",
            "smoke.songs",
            "song_link",
        ),
        (
            format!("{BASE_URL}/VenueList.aspx"),
            "a[href*='VenueStats.aspx'][href*='vid=']",
            "smoke.venues",
            "venue_link",
        ),
        (
            format!("{BASE_URL}/GuestList.aspx"),
            "a[href*='GuestStats.aspx'][href*='gid=']",
            "smoke.guests",
            "guest_link",
        ),
        (
            format!("{BASE_URL}/TourShow.aspx?where=2024"),
            "a[href*='TourShowSet.aspx'][href*='id=']",
            "smoke.tours",
            "show_link",
        ),
        (
            format!("{BASE_URL}/DiscographyList.aspx"),
            "a[href*='ReleaseView.aspx']",
            "smoke.releases",
            "release_link",
        ),
        (
            format!("{BASE_URL}/Lists.aspx"),
            "a[href*='ListView.aspx']",
            "smoke.lists",
            "list_link",
        ),
        (
            format!("{BASE_URL}/Liberation.aspx"),
            "table.liberation-list tbody tr",
            "smoke.liberation",
            "row",
        ),
        (
            format!("{BASE_URL}/ShowRarity.aspx"),
            "table tr",
            "smoke.rarity",
            "row",
        ),
        (
            format!("{BASE_URL}/ThisDayinHistory.aspx?month=1&day=1"),
            "a[href*='TourShowSet.aspx'][href*='id=']",
            "smoke.history",
            "show_link",
        ),
    ];

    for (url, selector, context, label) in checks {
        let html = client.fetch_html(&url)?;
        let document = Html::parse_document(&html);
        if let Some(sel) = selector_or_warn(context, selector) {
            warn_if_empty(&document, &sel, context, label);
        }
    }

    let (empty, missing) = log_scrape_warning_summary();
    log_scrape_http_summary();
    if let Some(path) = &config.warnings_output {
        write_warning_report(path, empty, missing, config.warnings_jsonl.as_deref())?;
        write_scrape_summary(path, empty, missing)?;
    }
    if let Some(max_allowed) = config.warnings_max {
        let total = empty + missing;
        if total > max_allowed {
            bail!(
                "scrape warning budget exceeded: {} warnings (max {})",
                total,
                max_allowed
            );
        }
    }
    Ok(())
}

fn parse_lists_page(html: &str) -> Vec<Value> {
    let document = Html::parse_document(html);
    let Some(category_selector) = selector_or_warn(".release-series", ".release-series") else {
        return Vec::new();
    };
    let Some(header_selector) = selector_or_warn(".headerpanel", ".headerpanel") else {
        return Vec::new();
    };
    let Some(list_link_selector) =
        selector_or_warn("a[href*='ListView.aspx']", "a[href*='ListView.aspx']")
    else {
        return Vec::new();
    };
    warn_if_empty(&document, &list_link_selector, "lists", "list_link");
    let mut lists = Vec::new();

    for series in document.select(&category_selector) {
        let category = series
            .select(&header_selector)
            .next()
            .map(|el| normalize_whitespace(&el.text().collect::<String>()))
            .unwrap_or_else(|| "Lists".to_string());
        for link in series.select(&list_link_selector) {
            let href = link.value().attr("href").unwrap_or("");
            let list_id = regex(r"id=(\\d+)")
                .captures(href)
                .and_then(|cap| cap.get(1))
                .map(|m| m.as_str().to_string());
            let title = normalize_whitespace(&link.text().collect::<String>());
            warn_if_missing_text("lists", "id", list_id.as_deref());
            warn_if_missing_text("lists", "title", Some(title.as_str()));
            lists.push(json!({
                "id": list_id,
                "title": title,
                "category": category,
            }));
        }
    }
    if lists.is_empty() {
        warn_missing_field("lists", "list");
    }
    lists
}
