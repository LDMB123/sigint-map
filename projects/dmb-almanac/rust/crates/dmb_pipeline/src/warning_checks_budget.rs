use std::collections::HashMap;

use anyhow::Result;

use crate::pipeline_support::WarningReport;

fn compare_u64_maps(
    label: &str,
    current: &HashMap<String, u64>,
    baseline: &HashMap<String, u64>,
) -> Result<()> {
    for (key, &count) in current {
        let baseline_count = baseline.get(key).copied().unwrap_or(0);
        if count > baseline_count {
            anyhow::bail!(
                "warning regression: {label} {key} = {count} > baseline {baseline_count}"
            );
        }
    }
    Ok(())
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

    compare_u64_maps(
        "missingByField",
        &current.missing_by_field,
        &baseline.missing_by_field,
    )?;
    compare_u64_maps(
        "missingByContext",
        &current.missing_by_context,
        &baseline.missing_by_context,
    )?;
    compare_u64_maps(
        "emptyBySelector",
        &current.empty_by_selector,
        &baseline.empty_by_selector,
    )?;
    compare_u64_maps(
        "emptyByContext",
        &current.empty_by_context,
        &baseline.empty_by_context,
    )?;

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
