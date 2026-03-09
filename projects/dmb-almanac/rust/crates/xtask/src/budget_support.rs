use anyhow::{Context, Result};
use serde_json::Value;
use std::{fs, path::PathBuf};

use crate::sw_support::{
    collect_data_assets, collect_shell_assets, parse_sw_version_from_source, render_sw_template,
};
use crate::xtask_verify::gzip_size_bytes;

#[derive(Debug, Clone)]
pub(crate) struct HydrateBudget {
    wasm_gzip_bytes_max: u64,
    required_data_assets: Vec<String>,
    required_pkg_assets: Vec<String>,
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
    let budget = read_hydrate_budget(&repo_root)?;
    let wasm_path = repo_root.join("rust/static/pkg/dmb_app_bg.wasm");
    let gzip_bytes = gzip_size_bytes(&wasm_path)?;
    let max_bytes = override_limit.unwrap_or(budget.wasm_gzip_bytes_max);

    if gzip_bytes > max_bytes {
        anyhow::bail!(
            "hydrate gzip budget exceeded: {} bytes > {} bytes (see rust/optimization-budgets.json)",
            gzip_bytes,
            max_bytes
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
