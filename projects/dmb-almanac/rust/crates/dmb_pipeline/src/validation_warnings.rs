use anyhow::{Context, Result};
use std::path::Path;

use crate::pipeline_support::{WarningReport, env_u64_or_warn};
use crate::warning_checks::{
    compare_endpoint_timings, compare_warning_reports, enforce_empty_by_context,
    enforce_endpoint_retries, enforce_missing_by_context, enforce_missing_by_context_map,
    enforce_warning_thresholds, read_warning_report, read_warning_thresholds,
};

pub(crate) fn validate_warning_state(
    strict_warnings: bool,
    endpoint_timing_max_pct: Option<u64>,
    endpoint_retry_max: Option<u64>,
) -> Result<Option<(u64, u64, String)>> {
    let mut summary = None;
    let mut current = None;
    if let Ok(report_path) = std::env::var("DMB_VALIDATE_WARNING_REPORT") {
        let report = read_warning_report(Path::new(&report_path))?;
        summary = Some((report.empty, report.missing, report_path.clone()));
        let max_empty = env_u64_or_warn("DMB_WARNING_MAX_EMPTY").unwrap_or(0);
        let max_missing = env_u64_or_warn("DMB_WARNING_MAX_MISSING").unwrap_or(0);
        if report.empty > max_empty || report.missing > max_missing {
            anyhow::bail!(
                "warning report exceeded thresholds: emptySelectors={} (max {}), missingFields={} (max {})",
                report.empty,
                max_empty,
                report.missing,
                max_missing
            );
        }
        current = Some(report);
    }

    if let Some(report) = current.as_ref() {
        validate_warning_regressions(report, endpoint_timing_max_pct)?;
        validate_warning_thresholds_and_budgets(report, endpoint_retry_max)?;

        if let Some((empty, missing, _)) = summary.as_ref()
            && strict_warnings
            && (empty + missing) > 0
        {
            anyhow::bail!(
                "strict warnings enabled: {empty} empty selectors, {missing} missing fields"
            );
        }
    }

    if let Ok(report_path) = std::env::var("DMB_VALIDATE_WARNING_REPORT") {
        tracing::info!("validate warning report path: {}", report_path);
    }

    Ok(summary)
}

fn validate_warning_regressions(
    current: &WarningReport,
    endpoint_timing_max_pct: Option<u64>,
) -> Result<()> {
    if let Ok(baseline_path) = std::env::var("DMB_WARNING_BASELINE") {
        let baseline = read_warning_report(Path::new(&baseline_path))?;
        compare_warning_reports(current, &baseline)
            .with_context(|| format!("warning regression vs {baseline_path}"))?;
        let max_pct =
            endpoint_timing_max_pct.or_else(|| env_u64_or_warn("DMB_ENDPOINT_TIMING_MAX_PCT"));
        if let Some(max_pct) = max_pct {
            compare_endpoint_timings(current, &baseline, max_pct)
                .with_context(|| "endpoint timing regression")?;
        }
        if std::env::var("DMB_WARNING_SIGNATURE_STRICT")
            .ok()
            .is_some_and(|val| matches!(val.as_str(), "1" | "true" | "TRUE"))
            && let (Some(current_sig), Some(baseline_sig)) =
                (current.signature.as_ref(), baseline.signature.as_ref())
            && current_sig != baseline_sig
        {
            anyhow::bail!("warning signature changed: {current_sig} != {baseline_sig}");
        }
    }

    Ok(())
}

fn validate_warning_thresholds_and_budgets(
    current: &WarningReport,
    endpoint_retry_max: Option<u64>,
) -> Result<()> {
    if let Ok(thresholds_path) = std::env::var("DMB_WARNING_MAX_BY_FIELD") {
        let thresholds = read_warning_thresholds(Path::new(&thresholds_path))?;
        enforce_warning_thresholds(&current.missing_by_field, &thresholds)
            .with_context(|| format!("warning max by field {thresholds_path}"))?;
    }
    if !current.top_endpoint_retries.is_empty() {
        let summary = current
            .top_endpoint_retries
            .iter()
            .take(3)
            .map(|item| format!("{}({})", item.endpoint, item.count))
            .collect::<Vec<_>>()
            .join(", ");
        tracing::info!(
            "top endpoint retries: total={} [{}]",
            current.endpoint_retries_total,
            summary
        );
    }
    if let Ok(thresholds_path) = std::env::var("DMB_WARNING_MAX_BY_PAGE") {
        let thresholds = read_warning_thresholds(Path::new(&thresholds_path))?;
        enforce_missing_by_context(&current.missing_by_field, &thresholds)
            .with_context(|| format!("warning max by page {thresholds_path}"))?;
    }
    if let Ok(thresholds_path) = std::env::var("DMB_WARNING_MAX_BY_SELECTOR") {
        let thresholds = read_warning_thresholds(Path::new(&thresholds_path))?;
        enforce_warning_thresholds(&current.empty_by_selector, &thresholds)
            .with_context(|| format!("warning max by selector {thresholds_path}"))?;
    }
    if let Ok(thresholds_path) = std::env::var("DMB_WARNING_MAX_BY_EVENT") {
        let thresholds = read_warning_thresholds(Path::new(&thresholds_path))?;
        enforce_warning_thresholds(&current.warning_events_summary, &thresholds)
            .with_context(|| format!("warning max by event {thresholds_path}"))?;
    }

    let retry_max = endpoint_retry_max.or_else(|| env_u64_or_warn("DMB_ENDPOINT_RETRY_MAX"));
    if let Some(max) = retry_max {
        enforce_endpoint_retries(&current.endpoint_retries, max)
            .with_context(|| "endpoint retry budget exceeded")?;
    }
    if let Ok(thresholds_path) = std::env::var("DMB_WARNING_MAX_EMPTY_BY_CONTEXT") {
        let thresholds = read_warning_thresholds(Path::new(&thresholds_path))?;
        enforce_empty_by_context(&current.empty_by_selector, &thresholds)
            .with_context(|| format!("warning max empty by context {thresholds_path}"))?;
    }
    if let Ok(thresholds_path) = std::env::var("DMB_WARNING_MAX_MISSING_BY_CONTEXT") {
        let thresholds = read_warning_thresholds(Path::new(&thresholds_path))?;
        enforce_missing_by_context_map(&current.missing_by_context, &thresholds)
            .with_context(|| format!("warning max missing by context {thresholds_path}"))?;
    }
    if std::env::var("DMB_REQUIRE_VENUE_SHOWS")
        .ok()
        .is_some_and(|val| matches!(val.as_str(), "1" | "true" | "TRUE"))
    {
        let missing = current
            .missing_by_field
            .get("venue_stats.shows")
            .copied()
            .unwrap_or(0);
        if missing > 0 {
            anyhow::bail!("venue stats missing show history: venue_stats.shows warnings={missing}");
        }
    }

    Ok(())
}
