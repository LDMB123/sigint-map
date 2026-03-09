use std::collections::HashMap;
use std::path::Path;

use anyhow::{Context, Result};

use crate::pipeline_support::{EndpointRetrySummary, WarningReport};

fn read_u64_field(report: &serde_json::Value, field: &'static str, report_path: &str) -> u64 {
    match report.get(field).and_then(serde_json::Value::as_u64) {
        Some(v) => v,
        None => {
            tracing::warn!(
                report_path,
                field,
                "warning report missing or invalid field; defaulting to 0"
            );
            0
        }
    }
}

fn read_u64_map_field(report: &serde_json::Value, field: &'static str) -> HashMap<String, u64> {
    report
        .get(field)
        .and_then(|v| v.as_object())
        .map(|obj| {
            obj.iter()
                .filter_map(|(k, v)| v.as_u64().map(|val| (k.clone(), val)))
                .collect::<HashMap<_, _>>()
        })
        .unwrap_or_default()
}

pub(crate) fn read_warning_report(path: &Path) -> Result<WarningReport> {
    let contents = std::fs::read_to_string(path)
        .with_context(|| format!("read warning report {}", path.display()))?;
    let report: serde_json::Value =
        serde_json::from_str(&contents).context("parse warning report")?;
    let report_path = path.display().to_string();
    let empty = read_u64_field(&report, "emptySelectors", &report_path);
    let missing = read_u64_field(&report, "missingFields", &report_path);
    let missing_by_field = read_u64_map_field(&report, "missingByField");
    let missing_by_context = read_u64_map_field(&report, "missingByContext");
    let empty_by_selector = read_u64_map_field(&report, "emptyBySelector");
    let empty_by_context = read_u64_map_field(&report, "emptyByContext");
    let endpoint_timings_ms = read_u64_map_field(&report, "endpointTimingsMs");
    let endpoint_retries = read_u64_map_field(&report, "endpointRetries");
    let endpoint_retries_total = report
        .get("endpointRetriesTotal")
        .and_then(serde_json::Value::as_u64)
        .unwrap_or_else(|| endpoint_retries.values().copied().sum());
    let top_endpoint_retries = report
        .get("topEndpointRetries")
        .and_then(|v| v.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|item| {
                    let endpoint = item.get("endpoint")?.as_str()?.to_string();
                    let count = item.get("count")?.as_u64()?;
                    Some(EndpointRetrySummary { endpoint, count })
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    let signature = report
        .get("signature")
        .and_then(|v| v.as_str())
        .map(std::string::ToString::to_string);
    let warning_events_summary = read_u64_map_field(&report, "warningEventsSummary");
    Ok(WarningReport {
        empty,
        missing,
        missing_by_field,
        missing_by_context,
        empty_by_selector,
        empty_by_context,
        endpoint_timings_ms,
        endpoint_retries,
        endpoint_retries_total,
        top_endpoint_retries,
        warning_events_summary,
        signature,
    })
}

pub(crate) fn read_warning_thresholds(path: &Path) -> Result<HashMap<String, u64>> {
    let contents = std::fs::read_to_string(path)
        .with_context(|| format!("read warning thresholds {}", path.display()))?;
    let parsed: serde_json::Value =
        serde_json::from_str(&contents).context("parse warning thresholds")?;
    let Some(map) = parsed.as_object() else {
        tracing::warn!(
            path = %path.display(),
            "warning thresholds json is not an object; ignoring"
        );
        return Ok(HashMap::new());
    };
    let mut out = HashMap::new();
    for (k, v) in map {
        if let Some(val) = v.as_u64() {
            out.insert(k.clone(), val);
        } else {
            tracing::warn!(
                path = %path.display(),
                key = k.as_str(),
                "warning threshold value is not a u64; skipping"
            );
        }
    }
    Ok(out)
}
