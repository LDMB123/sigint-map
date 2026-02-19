use std::collections::HashMap;
use std::path::Path;

use anyhow::{Context, Result};

use crate::{EndpointRetrySummary, WarningReport};

pub(crate) fn read_warning_report(path: &Path) -> Result<WarningReport> {
    let contents = std::fs::read_to_string(path)
        .with_context(|| format!("read warning report {}", path.display()))?;
    let report: serde_json::Value =
        serde_json::from_str(&contents).context("parse warning report")?;
    let report_path = path.display().to_string();
    let empty = match report
        .get("emptySelectors")
        .and_then(serde_json::Value::as_u64)
    {
        Some(v) => v,
        None => {
            tracing::warn!(
                report_path,
                field = "emptySelectors",
                "warning report missing or invalid field; defaulting to 0"
            );
            0
        }
    };
    let missing = match report
        .get("missingFields")
        .and_then(serde_json::Value::as_u64)
    {
        Some(v) => v,
        None => {
            tracing::warn!(
                report_path,
                field = "missingFields",
                "warning report missing or invalid field; defaulting to 0"
            );
            0
        }
    };
    let missing_by_field = report
        .get("missingByField")
        .and_then(|v| v.as_object())
        .map(|obj| {
            obj.iter()
                .filter_map(|(k, v)| v.as_u64().map(|val| (k.clone(), val)))
                .collect::<HashMap<_, _>>()
        })
        .unwrap_or_default();
    let missing_by_context = report
        .get("missingByContext")
        .and_then(|v| v.as_object())
        .map(|obj| {
            obj.iter()
                .filter_map(|(k, v)| v.as_u64().map(|val| (k.clone(), val)))
                .collect::<HashMap<_, _>>()
        })
        .unwrap_or_default();
    let empty_by_selector = report
        .get("emptyBySelector")
        .and_then(|v| v.as_object())
        .map(|obj| {
            obj.iter()
                .filter_map(|(k, v)| v.as_u64().map(|val| (k.clone(), val)))
                .collect::<HashMap<_, _>>()
        })
        .unwrap_or_default();
    let empty_by_context = report
        .get("emptyByContext")
        .and_then(|v| v.as_object())
        .map(|obj| {
            obj.iter()
                .filter_map(|(k, v)| v.as_u64().map(|val| (k.clone(), val)))
                .collect::<HashMap<_, _>>()
        })
        .unwrap_or_default();
    let endpoint_timings_ms = report
        .get("endpointTimingsMs")
        .and_then(|v| v.as_object())
        .map(|obj| {
            obj.iter()
                .filter_map(|(k, v)| v.as_u64().map(|val| (k.clone(), val)))
                .collect::<HashMap<_, _>>()
        })
        .unwrap_or_default();
    let endpoint_retries = report
        .get("endpointRetries")
        .and_then(|v| v.as_object())
        .map(|obj| {
            obj.iter()
                .filter_map(|(k, v)| v.as_u64().map(|val| (k.clone(), val)))
                .collect::<HashMap<_, _>>()
        })
        .unwrap_or_default();
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
    let warning_events_summary = report
        .get("warningEventsSummary")
        .and_then(|v| v.as_object())
        .map(|obj| {
            obj.iter()
                .filter_map(|(k, v)| v.as_u64().map(|val| (k.clone(), val)))
                .collect::<HashMap<_, _>>()
        })
        .unwrap_or_default();
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

pub(crate) fn compare_warning_reports(
    current: &WarningReport,
    baseline: &WarningReport,
) -> Result<()> {
    if current.empty > baseline.empty {
        anyhow::bail!(
            "warning regression: emptySelectors {} > baseline {}",
            current.empty,
            baseline.empty
        );
    }
    if current.missing > baseline.missing {
        anyhow::bail!(
            "warning regression: missingFields {} > baseline {}",
            current.missing,
            baseline.missing
        );
    }

    for (key, &count) in &current.missing_by_field {
        let baseline_count = baseline.missing_by_field.get(key).copied().unwrap_or(0);
        if count > baseline_count {
            anyhow::bail!(
                "warning regression: missingByField {key} = {count} > baseline {baseline_count}"
            );
        }
    }
    for (key, &count) in &current.missing_by_context {
        let baseline_count = baseline.missing_by_context.get(key).copied().unwrap_or(0);
        if count > baseline_count {
            anyhow::bail!(
                "warning regression: missingByContext {key} = {count} > baseline {baseline_count}"
            );
        }
    }

    for (key, &count) in &current.empty_by_selector {
        let baseline_count = baseline.empty_by_selector.get(key).copied().unwrap_or(0);
        if count > baseline_count {
            anyhow::bail!(
                "warning regression: emptyBySelector {key} = {count} > baseline {baseline_count}"
            );
        }
    }
    for (key, &count) in &current.empty_by_context {
        let baseline_count = baseline.empty_by_context.get(key).copied().unwrap_or(0);
        if count > baseline_count {
            anyhow::bail!(
                "warning regression: emptyByContext {key} = {count} > baseline {baseline_count}"
            );
        }
    }

    Ok(())
}

pub(crate) fn compare_endpoint_timings(
    current: &WarningReport,
    baseline: &WarningReport,
    max_pct: u64,
) -> Result<()> {
    if max_pct == 0 {
        return Ok(());
    }
    for (endpoint, &timing) in &current.endpoint_timings_ms {
        let Some(baseline_timing) = baseline.endpoint_timings_ms.get(endpoint) else {
            continue;
        };
        if *baseline_timing == 0 {
            continue;
        }
        let allowed = baseline_timing.saturating_add(baseline_timing.saturating_mul(max_pct) / 100);
        if timing > allowed {
            anyhow::bail!(
                "endpoint timing regression: {endpoint} {timing}ms > baseline {baseline_timing}ms (max +{max_pct}%)"
            );
        }
    }
    Ok(())
}

pub(crate) fn enforce_endpoint_retries(current: &HashMap<String, u64>, max: u64) -> Result<()> {
    if max == 0 {
        return Ok(());
    }
    for (endpoint, &count) in current {
        if count > max {
            anyhow::bail!("endpoint retry budget exceeded: {endpoint} retries {count} > max {max}");
        }
    }
    Ok(())
}

pub(crate) fn enforce_empty_by_context(
    empty_by_selector: &HashMap<String, u64>,
    thresholds: &HashMap<String, u64>,
) -> Result<()> {
    for (context, max) in thresholds {
        let prefix = format!("{context}.");
        let total: u64 = empty_by_selector
            .iter()
            .filter(|(key, _)| key.starts_with(&prefix))
            .map(|(_, value)| *value)
            .sum();
        if total > *max {
            anyhow::bail!("empty selector budget exceeded: {context} total {total} > max {max}");
        }
    }
    Ok(())
}

pub(crate) fn enforce_missing_by_context(
    missing_by_field: &HashMap<String, u64>,
    thresholds: &HashMap<String, u64>,
) -> Result<()> {
    for (context, max) in thresholds {
        let prefix = format!("{context}.");
        let total: u64 = missing_by_field
            .iter()
            .filter(|(key, _)| key.starts_with(&prefix))
            .map(|(_, value)| *value)
            .sum();
        if total > *max {
            anyhow::bail!("missing field budget exceeded: {context} total {total} > max {max}");
        }
    }
    Ok(())
}

pub(crate) fn enforce_missing_by_context_map(
    missing_by_context: &HashMap<String, u64>,
    thresholds: &HashMap<String, u64>,
) -> Result<()> {
    for (context, max) in thresholds {
        let total = missing_by_context.get(context).copied().unwrap_or(0);
        if total > *max {
            anyhow::bail!("missing field budget exceeded: {context} total {total} > max {max}");
        }
    }
    Ok(())
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

pub(crate) fn enforce_warning_thresholds(
    current: &HashMap<String, u64>,
    thresholds: &HashMap<String, u64>,
) -> Result<()> {
    for (key, max) in thresholds {
        let value = current.get(key).copied().unwrap_or(0);
        if value > *max {
            anyhow::bail!("warning threshold exceeded: {key} = {value} (max {max})");
        }
    }
    Ok(())
}
