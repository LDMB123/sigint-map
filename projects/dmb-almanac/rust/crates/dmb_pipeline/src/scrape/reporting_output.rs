use super::*;

fn clone_locked_state<T: Clone>(state: &Lazy<Mutex<T>>, poisoned_msg: &str) -> T {
    match state.lock() {
        Ok(guard) => guard.clone(),
        Err(poisoned) => {
            tracing::warn!("{}", poisoned_msg);
            poisoned.into_inner().clone()
        }
    }
}

fn summarize_by_context(values: &HashMap<String, usize>) -> HashMap<String, usize> {
    let mut by_context: HashMap<String, usize> = HashMap::new();
    for (key, count) in values {
        let context = key.split('.').next().unwrap_or(key).to_string();
        let entry = by_context.entry(context).or_insert(0);
        *entry = entry.saturating_add(*count);
    }
    by_context
}

fn summarize_events_by_kind(events: &[Value]) -> HashMap<String, usize> {
    let mut summary: HashMap<String, usize> = HashMap::new();
    for event in events {
        if let Some(kind) = event.get("kind").and_then(|v| v.as_str()) {
            *summary.entry(kind.to_string()).or_insert(0) += 1;
        }
    }
    summary
}

fn top_counts(values: &HashMap<String, usize>, limit: usize) -> Vec<(String, usize)> {
    let mut top: Vec<(String, usize)> = values.iter().map(|(k, v)| (k.clone(), *v)).collect();
    top.sort_by(|a, b| b.1.cmp(&a.1));
    top.truncate(limit);
    top
}

fn capture_scrape_report_snapshot() -> ScrapeReportSnapshot {
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

pub(crate) fn write_warning_artifacts(
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
pub(crate) fn write_warning_report(
    path: &Path,
    empty: usize,
    missing: usize,
    warnings_jsonl: Option<&Path>,
) -> Result<()> {
    let snapshot = capture_scrape_report_snapshot();
    write_warning_report_with_snapshot(path, empty, missing, warnings_jsonl, &snapshot)
}

fn write_warning_report_with_snapshot(
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
pub(crate) fn write_scrape_summary(path: &Path, empty: usize, missing: usize) -> Result<()> {
    let snapshot = capture_scrape_report_snapshot();
    write_scrape_summary_with_snapshot(path, empty, missing, &snapshot)
}

fn write_scrape_summary_with_snapshot(
    path: &Path,
    empty: usize,
    missing: usize,
    snapshot: &ScrapeReportSnapshot,
) -> Result<()> {
    let summary_path = path.parent().map_or_else(
        || PathBuf::from("scrape-summary.json"),
        |parent| parent.join("scrape-summary.json"),
    );
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
        writeln!(file, "{line}").context("write warning event")?;
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
