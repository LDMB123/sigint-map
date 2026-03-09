use anyhow::{Context, Result};
use serde_json::Value;
use std::{
    env, fs,
    path::{Path, PathBuf},
};

use crate::sw_support::{
    collect_data_assets, collect_shell_assets, parse_sw_version_from_source, render_sw_template,
};
use crate::xtask_verify::gzip_size_bytes;

#[derive(Debug, Clone)]
pub(crate) struct HydrateBudget {
    wasm_gzip_bytes_max: u64,
    cold_import_avg_ms_max: f64,
    startup_import_delay_ms_max: f64,
    required_data_assets: Vec<String>,
    required_pkg_assets: Vec<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct ImportPerfMetrics {
    pub(crate) tuning_enabled: bool,
    pub(crate) avg_duration_ms: f64,
    pub(crate) avg_import_start_delay_ms: f64,
}

#[derive(Debug, Clone)]
pub(crate) struct ServerBudget {
    pub(crate) required_static_data_assets: Vec<String>,
    pub(crate) default_sqlite_candidates: Vec<String>,
}

pub(super) fn verify_hydrate_artifacts() -> Result<()> {
    let repo_root = super::repo_root_dir()?;
    let budget = read_hydrate_budget(&repo_root)?;
    let static_dir = repo_root.join("rust/static");

    for asset in &budget.required_pkg_assets {
        let path = static_dir.join(asset.trim_start_matches('/'));
        if !path.exists() {
            anyhow::bail!(
                "required hydrate asset missing: {} (run `cargo run -p xtask -- build-hydrate-pkg`)",
                path.display()
            );
        }
    }

    for asset in &budget.required_data_assets {
        let path = static_dir.join(asset.trim_start_matches('/'));
        if !path.exists() {
            anyhow::bail!(
                "required static data asset missing: {} (run the rust data pipeline before verify)",
                path.display()
            );
        }
    }

    Ok(())
}

pub(super) fn verify_service_worker_generated() -> Result<()> {
    let repo_root = super::repo_root_dir()?;
    let static_dir = repo_root.join("rust/static");
    let template_path = static_dir.join("sw.template.js");
    let sw_path = static_dir.join("sw.js");
    let template = fs::read_to_string(&template_path).context("read sw.template.js")?;
    let source = fs::read_to_string(&sw_path).context("read sw.js")?;
    let version = parse_sw_version_from_source(&source).context("sw.js version missing")?;
    let shell_assets = collect_shell_assets(&repo_root)?;
    let data_assets = collect_data_assets(&repo_root);
    let expected = render_sw_template(&template, &version, &shell_assets, &data_assets);

    if source != expected {
        anyhow::bail!(
            "sw.js is out of sync with sw.template.js; run `cargo run -p xtask -- generate-sw`"
        );
    }

    Ok(())
}

pub(super) fn verify_hydrate_budget(override_limit: Option<u64>) -> Result<()> {
    let repo_root = super::repo_root_dir()?;
    let wasm_path = repo_root.join("rust/static/pkg/dmb_app_bg.wasm");
    let gzip_bytes = gzip_size_bytes(&wasm_path)?;
    let max_bytes = resolve_hydrate_wasm_gzip_limit(&repo_root, override_limit)?;

    if gzip_bytes > max_bytes {
        anyhow::bail!(
            "hydrate gzip budget exceeded: {} bytes > {} bytes (see rust/optimization-budgets.json)",
            gzip_bytes,
            max_bytes
        );
    }

    Ok(())
}

pub(super) fn verify_import_perf_report(report: PathBuf) -> Result<()> {
    let repo_root = super::repo_root_dir()?;
    let budget = read_hydrate_budget(&repo_root)?;
    let report_path = resolve_report_path(report)?;
    let bytes =
        fs::read(&report_path).with_context(|| format!("read {}", report_path.display()))?;
    let root: Value = serde_json::from_slice(&bytes).context("parse import perf report")?;
    let metrics = read_import_perf_metrics(&root, "tuned")?;

    if !metrics.tuning_enabled {
        anyhow::bail!(
            "import perf report missing adaptive metrics: tuned.tuningEnabled must be true"
        );
    }

    println!("import perf report: {}", report_path.display());
    println!(
        "adaptive cold import avg ms: {:.3}",
        metrics.avg_duration_ms
    );
    println!(
        "adaptive startup import delay ms: {:.3}",
        metrics.avg_import_start_delay_ms
    );

    if metrics.avg_duration_ms > budget.cold_import_avg_ms_max {
        anyhow::bail!(
            "adaptive cold-import average exceeded: {:.3} ms > {:.3} ms",
            metrics.avg_duration_ms,
            budget.cold_import_avg_ms_max
        );
    }

    if metrics.avg_import_start_delay_ms > budget.startup_import_delay_ms_max {
        anyhow::bail!(
            "adaptive startup import delay exceeded: {:.3} ms > {:.3} ms",
            metrics.avg_import_start_delay_ms,
            budget.startup_import_delay_ms_max
        );
    }

    Ok(())
}

pub(super) fn verify_server_runtime_artifacts(
    require_sqlite: bool,
    sqlite_override: Option<PathBuf>,
) -> Result<()> {
    let repo_root = super::repo_root_dir()?;
    let budget = read_server_budget(&repo_root)?;
    let static_dir = repo_root.join("rust/static");

    for asset in &budget.required_static_data_assets {
        let path = static_dir.join(asset.trim_start_matches('/'));
        if !path.exists() {
            anyhow::bail!(
                "required server static data asset missing: {} (run the rust data pipeline before starting dmb_server)",
                path.display()
            );
        }
    }

    let sqlite_path = resolve_sqlite_candidate(&repo_root, sqlite_override, &budget);
    if require_sqlite && sqlite_path.is_none() {
        anyhow::bail!(
            "sqlite preflight failed: no readable SQLite database found (checked configured override and default candidates)"
        );
    }

    if let Some(path) = sqlite_path {
        println!("sqlite candidate: {}", path.display());
    }

    Ok(())
}

fn read_hydrate_budget(repo_root: &std::path::Path) -> Result<HydrateBudget> {
    let budget_path = repo_root.join("rust/optimization-budgets.json");
    let bytes =
        fs::read(&budget_path).with_context(|| format!("read {}", budget_path.display()))?;
    let root: Value = serde_json::from_slice(&bytes).context("parse optimization budgets")?;
    let hydrate = root
        .get("hydrate")
        .context("optimization budgets missing hydrate section")?;
    let wasm_gzip_bytes_max = hydrate
        .get("wasmGzipBytesMax")
        .and_then(Value::as_u64)
        .context("hydrate.wasmGzipBytesMax missing or invalid")?;
    let cold_import_avg_ms_max = hydrate
        .get("coldImportAvgMsMax")
        .and_then(Value::as_f64)
        .context("hydrate.coldImportAvgMsMax missing or invalid")?;
    let startup_import_delay_ms_max = hydrate
        .get("startupImportDelayMsMax")
        .and_then(Value::as_f64)
        .context("hydrate.startupImportDelayMsMax missing or invalid")?;
    let required_data_assets = read_string_array(
        hydrate,
        "requiredDataAssets",
        "hydrate.requiredDataAssets missing or invalid",
    )?;
    let required_pkg_assets = read_string_array(
        hydrate,
        "requiredPkgAssets",
        "hydrate.requiredPkgAssets missing or invalid",
    )?;

    Ok(HydrateBudget {
        wasm_gzip_bytes_max,
        cold_import_avg_ms_max,
        startup_import_delay_ms_max,
        required_data_assets,
        required_pkg_assets,
    })
}

fn read_server_budget(repo_root: &std::path::Path) -> Result<ServerBudget> {
    let budget_path = repo_root.join("rust/optimization-budgets.json");
    let bytes =
        fs::read(&budget_path).with_context(|| format!("read {}", budget_path.display()))?;
    let root: Value = serde_json::from_slice(&bytes).context("parse optimization budgets")?;
    let server = root
        .get("server")
        .context("optimization budgets missing server section")?;
    let required_static_data_assets = read_string_array(
        server,
        "requiredStaticDataAssets",
        "server.requiredStaticDataAssets missing or invalid",
    )?;
    let default_sqlite_candidates = read_string_array(
        server,
        "defaultSqliteCandidates",
        "server.defaultSqliteCandidates missing or invalid",
    )?;

    Ok(ServerBudget {
        required_static_data_assets,
        default_sqlite_candidates,
    })
}

pub(crate) fn read_string_array(root: &Value, key: &str, err_msg: &str) -> Result<Vec<String>> {
    let array = root
        .get(key)
        .and_then(Value::as_array)
        .ok_or_else(|| anyhow::anyhow!(err_msg.to_string()))?;
    let mut out = Vec::with_capacity(array.len());
    for item in array {
        let value = item
            .as_str()
            .ok_or_else(|| anyhow::anyhow!(err_msg.to_string()))?;
        out.push(value.to_string());
    }
    Ok(out)
}

pub(crate) fn resolve_sqlite_candidate(
    repo_root: &std::path::Path,
    sqlite_override: Option<PathBuf>,
    budget: &ServerBudget,
) -> Option<PathBuf> {
    if let Some(path) = sqlite_override {
        let resolved = if path.is_absolute() {
            path
        } else {
            repo_root.join("rust").join(path)
        };
        if resolved.exists() {
            return Some(resolved);
        }
    }

    for candidate in &budget.default_sqlite_candidates {
        let resolved = repo_root.join("rust").join(candidate);
        if resolved.exists() {
            return Some(resolved);
        }
    }

    None
}

pub(crate) fn resolve_hydrate_wasm_gzip_limit(
    repo_root: &Path,
    override_limit: Option<u64>,
) -> Result<u64> {
    let budget = read_hydrate_budget(repo_root)?;
    Ok(override_limit.unwrap_or(budget.wasm_gzip_bytes_max))
}

pub(crate) fn read_import_perf_metrics(root: &Value, key: &str) -> Result<ImportPerfMetrics> {
    let bucket = root
        .get(key)
        .and_then(Value::as_object)
        .ok_or_else(|| anyhow::anyhow!("import perf report missing `{key}` bucket"))?;

    let tuning_enabled = bucket
        .get("tuningEnabled")
        .and_then(Value::as_bool)
        .ok_or_else(|| anyhow::anyhow!("import perf report `{key}.tuningEnabled` missing"))?;
    let avg_duration_ms = bucket
        .get("avgDurationMs")
        .and_then(Value::as_f64)
        .ok_or_else(|| anyhow::anyhow!("import perf report `{key}.avgDurationMs` missing"))?;
    let avg_import_start_delay_ms = bucket
        .get("avgImportStartDelayMs")
        .and_then(Value::as_f64)
        .ok_or_else(|| {
            anyhow::anyhow!("import perf report `{key}.avgImportStartDelayMs` missing")
        })?;

    Ok(ImportPerfMetrics {
        tuning_enabled,
        avg_duration_ms,
        avg_import_start_delay_ms,
    })
}

fn resolve_report_path(path: PathBuf) -> Result<PathBuf> {
    if path.is_absolute() {
        return Ok(path);
    }
    Ok(env::current_dir().context("read current dir")?.join(path))
}
