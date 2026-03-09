use anyhow::{Context, Result};
use serde_json::Value;
use std::{fs, path::PathBuf};

use crate::{repo_root_dir, run_command, run_command_optional};

pub(super) fn run_scrape_qa(
    warnings_output: &PathBuf,
    baseline: &PathBuf,
    max_by_field: &PathBuf,
    max_by_selector: &PathBuf,
) -> Result<()> {
    let repo_root = repo_root_dir()?;
    let rust_dir = repo_root.join("rust");
    let warnings_output = rust_dir.join(warnings_output);
    let baseline = rust_dir.join(baseline);
    let max_by_field = rust_dir.join(max_by_field);
    let max_by_selector = rust_dir.join(max_by_selector);

    let warnings_events = rust_dir.join("data/warnings-events.jsonl");
    let warnings_summary = rust_dir.join("data/warnings-summary.json");

    run_command(
        "cargo",
        &[
            "run",
            "-p",
            "dmb_pipeline",
            "--",
            "scrape-fixtures",
            "--warnings-output",
            warnings_output
                .to_str()
                .unwrap_or("data/warnings-fixtures.json"),
            "--warnings-jsonl",
            warnings_events
                .to_str()
                .unwrap_or("data/warnings-events.jsonl"),
            "--warnings-max",
            "0",
            "--fail-on-warning",
        ],
        &rust_dir,
        &[],
    )?;

    run_command(
        "cargo",
        &["run", "-p", "dmb_pipeline", "--", "validate"],
        &rust_dir,
        &[
            (
                "DMB_VALIDATE_WARNING_REPORT",
                warnings_output.to_str().unwrap_or_default(),
            ),
            ("DMB_WARNING_MAX_EMPTY", "0"),
            ("DMB_WARNING_MAX_MISSING", "0"),
            (
                "DMB_WARNING_BASELINE",
                baseline.to_str().unwrap_or_default(),
            ),
            (
                "DMB_WARNING_MAX_BY_FIELD",
                max_by_field.to_str().unwrap_or_default(),
            ),
            (
                "DMB_WARNING_MAX_BY_PAGE",
                rust_dir
                    .join("data/warnings.max-by-page.json")
                    .to_str()
                    .unwrap_or_default(),
            ),
            (
                "DMB_WARNING_MAX_BY_SELECTOR",
                max_by_selector.to_str().unwrap_or_default(),
            ),
            (
                "DMB_WARNING_MAX_EMPTY_BY_CONTEXT",
                rust_dir
                    .join("data/warnings.max-by-context.json")
                    .to_str()
                    .unwrap_or_default(),
            ),
            (
                "DMB_WARNING_MAX_MISSING_BY_CONTEXT",
                rust_dir
                    .join("data/warnings.max-missing-by-context.json")
                    .to_str()
                    .unwrap_or_default(),
            ),
            ("DMB_WARNING_SIGNATURE_STRICT", "1"),
            ("DMB_REQUIRE_VENUE_SHOWS", "1"),
        ],
    )?;

    write_warning_summary(&warnings_output, &warnings_events, &warnings_summary)?;

    let compare_script = repo_root.join("scripts/compare-warning-reports.py");
    if compare_script.exists() {
        let args = &[
            compare_script
                .to_str()
                .unwrap_or("scripts/compare-warning-reports.py"),
            "--current",
            warnings_output.to_str().unwrap_or_default(),
            "--baseline",
            baseline.to_str().unwrap_or_default(),
            "--fail-on-signature",
        ];
        if !run_command_optional("python", args, &repo_root, &[])? {
            let _ = run_command_optional("python3", args, &repo_root, &[])?;
        }
    }

    Ok(())
}

fn write_warning_summary(
    report_path: &PathBuf,
    events_path: &PathBuf,
    output_path: &PathBuf,
) -> Result<()> {
    let report_bytes =
        fs::read(report_path).with_context(|| format!("read {}", report_path.display()))?;
    let report: Value = serde_json::from_slice(&report_bytes).context("parse warning report")?;

    let mut selector_missing_counts: std::collections::HashMap<String, u64> =
        std::collections::HashMap::default();
    if events_path.exists() {
        let contents = fs::read_to_string(events_path)
            .with_context(|| format!("read {}", events_path.display()))?;
        for line in contents.lines() {
            let Ok(event) = serde_json::from_str::<Value>(line) else {
                continue;
            };
            if event.get("kind").and_then(|v| v.as_str()) != Some("selector_missing") {
                continue;
            }
            let context = event
                .get("context")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            let detail = event
                .get("detail")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            let key = format!("{context}.{detail}");
            *selector_missing_counts.entry(key).or_insert(0) += 1;
        }
    }

    let summary = serde_json::json!({
        "generatedAt": chrono::Utc::now().to_rfc3339(),
        "topMissingFields": report.get("topMissingFields").cloned().unwrap_or(Value::Array(vec![])),
        "selectorMissingCounts": selector_missing_counts
            .into_iter()
            .map(|(key, count)| serde_json::json!({"selector": key, "count": count}))
            .collect::<Vec<_>>()
    });

    fs::write(output_path, serde_json::to_vec_pretty(&summary)?)
        .with_context(|| format!("write {}", output_path.display()))?;
    Ok(())
}
