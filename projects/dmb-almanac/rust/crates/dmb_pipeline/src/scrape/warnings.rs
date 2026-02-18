use super::*;

pub(super) fn regex(pattern: &str) -> &'static Regex {
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

pub(super) fn selector_or_warn(name: &str, selector: &str) -> Option<Selector> {
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

pub(super) fn warn_if_empty(document: &Html, selector: &Selector, context: &str, label: &str) {
    if document.select(selector).next().is_none() {
        SCRAPE_WARNINGS
            .empty_selectors
            .fetch_add(1, Ordering::Relaxed);
        increment_warning_map(&SCRAPE_WARNING_SELECTORS, format!("{context}.{label}"));
        record_warning_event("empty_selector", context, label);
        tracing::warn!(context, selector = label, "selector matched no elements");
    }
}

pub(super) fn warn_missing_field(context: &str, field: &str) {
    SCRAPE_WARNINGS
        .missing_fields
        .fetch_add(1, Ordering::Relaxed);
    increment_warning_map(&SCRAPE_WARNING_FIELDS, format!("{context}.{field}"));
    record_warning_event("missing_field", context, field);
    tracing::warn!(context, field, "missing critical field");
}

pub(super) fn parse_i32_or_warn(raw: Option<&str>, context: &str, field: &str) -> i32 {
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

pub(super) fn parse_i64_or_warn(raw: Option<&str>, context: &str, field: &str) -> i64 {
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

pub(super) fn parse_f64_or_warn(raw: Option<&str>, context: &str, field: &str) -> f64 {
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

pub(super) fn warn_if_empty_text(context: &str, field: &str, text: &str) {
    if text.trim().is_empty() {
        warn_missing_field(context, field);
    }
}

pub(super) fn increment_warning_map(map: &Lazy<Mutex<HashMap<String, usize>>>, key: String) {
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

pub(super) fn warn_if_missing_value(context: &str, field: &str, value: Option<&Value>) {
    match value {
        None => warn_missing_field(context, field),
        Some(Value::Null) => warn_missing_field(context, field),
        Some(Value::String(text)) if text.trim().is_empty() => warn_missing_field(context, field),
        Some(Value::Array(values)) if values.is_empty() => warn_missing_field(context, field),
        _ => {}
    }
}

pub(super) fn warn_if_missing_text(context: &str, field: &str, value: Option<&str>) {
    match value {
        None => warn_missing_field(context, field),
        Some(text) if text.trim().is_empty() => warn_missing_field(context, field),
        _ => {}
    }
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

pub(super) fn clone_locked_state<T: Clone>(state: &Lazy<Mutex<T>>, poisoned_msg: &str) -> T {
    match state.lock() {
        Ok(guard) => guard.clone(),
        Err(poisoned) => {
            tracing::warn!("{}", poisoned_msg);
            poisoned.into_inner().clone()
        }
    }
}

pub(super) fn summarize_by_context(values: &HashMap<String, usize>) -> HashMap<String, usize> {
    let mut by_context: HashMap<String, usize> = HashMap::new();
    for (key, count) in values {
        let context = key.split('.').next().unwrap_or(key).to_string();
        let entry = by_context.entry(context).or_insert(0);
        *entry = entry.saturating_add(*count);
    }
    by_context
}

pub(super) fn summarize_events_by_kind(events: &[Value]) -> HashMap<String, usize> {
    let mut summary: HashMap<String, usize> = HashMap::new();
    for event in events {
        if let Some(kind) = event.get("kind").and_then(|v| v.as_str()) {
            *summary.entry(kind.to_string()).or_insert(0) += 1;
        }
    }
    summary
}

pub(super) fn top_counts(values: &HashMap<String, usize>, limit: usize) -> Vec<(String, usize)> {
    let mut top: Vec<(String, usize)> = values.iter().map(|(k, v)| (k.clone(), *v)).collect();
    top.sort_by(|a, b| b.1.cmp(&a.1));
    top.truncate(limit);
    top
}

pub(super) fn capture_scrape_report_snapshot() -> ScrapeReportSnapshot {
    let missing_by_field = clone_locked_state(
        &SCRAPE_WARNING_FIELDS,
        "warning field map poisoned; continuing with recovered map",
    );
    let empty_by_selector = clone_locked_state(
        &SCRAPE_WARNING_SELECTORS,
        "warning selector map poisoned; continuing with recovered map",
    );
    let http_status_counts = clone_locked_state(
        &SCRAPE_HTTP_STATUS,
        "http status map poisoned; continuing with recovered map",
    );
    let endpoint_timings = clone_locked_state(
        &SCRAPE_ENDPOINT_TIMINGS,
        "endpoint timings map poisoned; continuing with recovered map",
    );
    let endpoint_retries = clone_locked_state(
        &SCRAPE_ENDPOINT_RETRIES,
        "endpoint retry map poisoned; continuing with recovered map",
    );
    let warning_events = clone_locked_state(
        &SCRAPE_WARNING_EVENTS,
        "warning events map poisoned; continuing with recovered map",
    );
    let error_events = clone_locked_state(
        &SCRAPE_ERROR_EVENTS,
        "error events map poisoned; continuing with recovered map",
    );
    let error_counts = clone_locked_state(
        &SCRAPE_ERROR_COUNTS,
        "error counter map poisoned; continuing with recovered map",
    );

    let missing_by_context = summarize_by_context(&missing_by_field);
    let empty_by_context = summarize_by_context(&empty_by_selector);
    let warning_events_summary = summarize_events_by_kind(&warning_events);
    let error_events_summary = summarize_events_by_kind(&error_events);
    let top_endpoint_retries = top_counts(&endpoint_retries, 10);
    let top_missing_fields = top_counts(&missing_by_field, 5);
    let top_http_status = top_counts(&http_status_counts, 5);
    let top_errors = top_counts(&error_counts, 5);
    let endpoint_retry_total: usize = endpoint_retries.values().copied().sum();
    let signature = warning_signature(&missing_by_field, &empty_by_selector);

    ScrapeReportSnapshot {
        missing_by_field,
        missing_by_context,
        empty_by_selector,
        empty_by_context,
        http_status_counts,
        endpoint_timings,
        endpoint_retries,
        endpoint_retry_total,
        top_endpoint_retries,
        top_missing_fields,
        top_http_status,
        error_counts,
        top_errors,
        warning_events_summary,
        error_events_summary,
        signature,
    }
}

pub(super) fn write_warning_artifacts(
    path: &Path,
    empty: usize,
    missing: usize,
    warnings_jsonl: Option<&Path>,
) -> Result<()> {
    let snapshot = capture_scrape_report_snapshot();
    write_warning_report_with_snapshot(path, empty, missing, warnings_jsonl, &snapshot)?;
    write_scrape_summary_with_snapshot(path, empty, missing, &snapshot)
}

#[cfg(test)]
pub(super) fn write_warning_report(
    path: &Path,
    empty: usize,
    missing: usize,
    warnings_jsonl: Option<&Path>,
) -> Result<()> {
    let snapshot = capture_scrape_report_snapshot();
    write_warning_report_with_snapshot(path, empty, missing, warnings_jsonl, &snapshot)
}

pub(super) fn write_warning_report_with_snapshot(
    path: &Path,
    empty: usize,
    missing: usize,
    warnings_jsonl: Option<&Path>,
    snapshot: &ScrapeReportSnapshot,
) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).with_context(|| format!("create {}", parent.display()))?;
    }
    let report = json!({
        "generatedAt": Utc::now().to_rfc3339(),
        "emptySelectors": empty,
        "missingFields": missing,
        "missingByField": &snapshot.missing_by_field,
        "missingByContext": &snapshot.missing_by_context,
        "topMissingFields": snapshot.top_missing_fields
            .iter()
            .map(|(field, count)| json!({"field": field, "count": count}))
            .collect::<Vec<_>>(),
        "emptyBySelector": &snapshot.empty_by_selector,
        "emptyByContext": &snapshot.empty_by_context,
        "httpStatusCounts": &snapshot.http_status_counts,
        "errorCounts": &snapshot.error_counts,
        "topErrors": snapshot.top_errors
            .iter()
            .map(|(kind, count)| json!({"kind": kind, "count": count}))
            .collect::<Vec<_>>(),
        "topHttpStatus": snapshot.top_http_status
            .iter()
            .map(|(status, count)| json!({"status": status, "count": count}))
            .collect::<Vec<_>>(),
        "endpointTimingsMs": &snapshot.endpoint_timings,
        "endpointRetries": &snapshot.endpoint_retries,
        "endpointRetriesTotal": snapshot.endpoint_retry_total,
        "topEndpointRetries": snapshot.top_endpoint_retries
            .iter()
            .map(|(endpoint, count)| json!({"endpoint": endpoint, "count": count}))
            .collect::<Vec<_>>(),
        "warningEventsSummary": &snapshot.warning_events_summary,
        "errorEventsSummary": &snapshot.error_events_summary,
        "signature": &snapshot.signature
    });
    let file = fs::File::create(path).with_context(|| format!("write {}", path.display()))?;
    serde_json::to_writer_pretty(file, &report).context("serialize warning report")?;
    if let Some(path) = warnings_jsonl {
        write_warning_events(path)?;
    }
    Ok(())
}

#[cfg(test)]
pub(super) fn write_scrape_summary(path: &Path, empty: usize, missing: usize) -> Result<()> {
    let snapshot = capture_scrape_report_snapshot();
    write_scrape_summary_with_snapshot(path, empty, missing, &snapshot)
}

pub(super) fn write_scrape_summary_with_snapshot(
    path: &Path,
    empty: usize,
    missing: usize,
    snapshot: &ScrapeReportSnapshot,
) -> Result<()> {
    let summary_path = path
        .parent()
        .map(|parent| parent.join("scrape-summary.json"))
        .unwrap_or_else(|| PathBuf::from("scrape-summary.json"));
    if let Some(parent) = summary_path.parent() {
        fs::create_dir_all(parent).with_context(|| format!("create {}", parent.display()))?;
    }
    let summary = json!({
        "generatedAt": Utc::now().to_rfc3339(),
        "emptySelectors": empty,
        "missingFields": missing,
        "httpStatusCounts": &snapshot.http_status_counts,
        "errorCounts": &snapshot.error_counts,
        "topHttpStatus": snapshot.top_http_status
            .iter()
            .map(|(status, count)| json!({"status": status, "count": count}))
            .collect::<Vec<_>>(),
        "endpointTimingsMs": &snapshot.endpoint_timings,
        "endpointRetries": &snapshot.endpoint_retries,
        "endpointRetriesTotal": snapshot.endpoint_retry_total,
        "topEndpointRetries": snapshot.top_endpoint_retries
            .iter()
            .map(|(endpoint, count)| json!({"endpoint": endpoint, "count": count}))
            .collect::<Vec<_>>(),
        "warningEventsSummary": &snapshot.warning_events_summary,
        "errorEventsSummary": &snapshot.error_events_summary
    });
    let file = fs::File::create(&summary_path)
        .with_context(|| format!("write {}", summary_path.display()))?;
    serde_json::to_writer_pretty(file, &summary).context("serialize scrape summary")?;
    Ok(())
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

pub(super) fn increment_error_map(key: &str) {
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

pub(super) fn write_warning_events(path: &Path) -> Result<()> {
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

pub(super) fn warning_signature(
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
pub(super) fn reset_warning_state() {
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
pub(super) fn warning_counts() -> (usize, usize) {
    (
        SCRAPE_WARNINGS.empty_selectors.load(Ordering::Relaxed),
        SCRAPE_WARNINGS.missing_fields.load(Ordering::Relaxed),
    )
}

#[cfg(test)]
pub(super) fn warning_missing_by_field() -> HashMap<String, usize> {
    SCRAPE_WARNING_FIELDS
        .lock()
        .map(|map| map.clone())
        .unwrap_or_default()
}

#[cfg(test)]
pub(super) fn warning_empty_by_selector() -> HashMap<String, usize> {
    SCRAPE_WARNING_SELECTORS
        .lock()
        .map(|map| map.clone())
        .unwrap_or_default()
}

#[cfg(test)]
pub(super) fn warning_endpoint_retries() -> HashMap<String, usize> {
    SCRAPE_ENDPOINT_RETRIES
        .lock()
        .map(|map| map.clone())
        .unwrap_or_default()
}

#[cfg(test)]
pub(super) fn error_counts() -> HashMap<String, usize> {
    SCRAPE_ERROR_COUNTS
        .lock()
        .map(|map| map.clone())
        .unwrap_or_default()
}

#[cfg(test)]
pub(super) fn error_events() -> Vec<Value> {
    SCRAPE_ERROR_EVENTS
        .lock()
        .map(|events| events.clone())
        .unwrap_or_default()
}

#[cfg(test)]
static TEST_WARNING_LOCK: Lazy<Mutex<()>> = Lazy::new(|| Mutex::new(()));

#[cfg(test)]
pub(super) fn with_warning_lock<T>(f: impl FnOnce() -> T) -> T {
    let _guard = match TEST_WARNING_LOCK.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    };
    reset_warning_state();
    f()
}

pub(super) fn object_all_zero(value: &Value) -> bool {
    match value {
        Value::Object(map) => map.values().all(|entry| entry.as_i64() == Some(0)),
        _ => false,
    }
}
