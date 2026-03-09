use anyhow::{Context, Result};
use std::{collections::BTreeSet, fs};

pub(super) fn generate_sw(version: Option<String>) -> Result<()> {
    let repo_root = super::repo_root_dir()?;
    let static_dir = repo_root.join("rust/static");
    let template_path = static_dir.join("sw.template.js");
    let sw_path = repo_root.join("rust/static/sw.js");
    let template = fs::read_to_string(&template_path).context("read sw.template.js")?;

    let new_version = version.unwrap_or_else(|| chrono::Utc::now().format("%Y-%m-%d").to_string());
    let shell_assets = collect_shell_assets(&repo_root)?;
    let data_assets = collect_data_assets(&repo_root);

    let rendered = render_sw_template(&template, &new_version, &shell_assets, &data_assets);
    fs::write(&sw_path, rendered).context("write sw.js")?;
    println!(
        "Generated sw.js version={new_version} shell_assets={} data_assets={}",
        shell_assets.len(),
        data_assets.len()
    );
    Ok(())
}

pub(super) fn read_current_sw_version() -> Result<Option<String>> {
    let repo_root = super::repo_root_dir()?;
    let sw_path = repo_root.join("rust/static/sw.js");
    if !sw_path.exists() {
        return Ok(None);
    }
    let source = fs::read_to_string(&sw_path).context("read sw.js")?;
    Ok(parse_sw_version_from_source(&source))
}

pub(crate) fn collect_shell_assets(repo_root: &std::path::Path) -> Result<Vec<String>> {
    let routes = parse_rust_routes(repo_root)?;
    let mut assets = BTreeSet::new();
    let excluded_routes = BTreeSet::from([
        "/assistant",
        "/ai-benchmark",
        "/ai-diagnostics",
        "/ai-smoke",
        "/ai-warmup",
    ]);

    for route in routes {
        if !route.starts_with('/') || route.contains(':') || route.contains('*') {
            continue;
        }
        if excluded_routes.contains(route.as_str()) {
            continue;
        }
        assets.insert(route);
    }

    for asset in [
        "/app.css",
        "/manifest.json",
        "/offline.html",
        "/icons/icon-192.png",
        "/icons/icon-512.png",
    ] {
        assets.insert(asset.to_string());
    }

    Ok(assets.into_iter().collect())
}

pub(crate) fn collect_data_assets(repo_root: &std::path::Path) -> Vec<String> {
    let mut assets = BTreeSet::new();
    let static_dir = repo_root.join("rust/static");
    let required = [
        "/data/manifest.json",
        "/data/ai-config.json",
        "/data/idb-migration-dry-run.json",
    ];
    for asset in required {
        let rel = asset.trim_start_matches('/');
        if static_dir.join(rel).exists() {
            assets.insert(asset.to_string());
        }
    }
    if !assets.contains("/data/manifest.json") {
        assets.insert("/data/manifest.json".to_string());
    }
    assets.into_iter().collect()
}

fn parse_rust_routes(repo_root: &std::path::Path) -> Result<Vec<String>> {
    let lib_path = repo_root.join("rust/crates/dmb_app/src/lib.rs");
    let source = fs::read_to_string(&lib_path).context("read dmb_app/src/lib.rs")?;
    parse_rust_routes_from_source(&source)
}

pub(crate) fn parse_rust_routes_from_source(source: &str) -> Result<Vec<String>> {
    let start_marker = "pub const RUST_ROUTES: &[&str] = &[";
    let start = source
        .find(start_marker)
        .context("RUST_ROUTES declaration missing in dmb_app/src/lib.rs")?
        + start_marker.len();
    let tail = &source[start..];
    let end = tail
        .find("];")
        .context("RUST_ROUTES array terminator missing in dmb_app/src/lib.rs")?;
    let block = &tail[..end];
    let mut routes = Vec::new();
    for line in block.lines() {
        let trimmed = line.trim().trim_end_matches(',');
        if let Some(value) = trimmed
            .strip_prefix('"')
            .and_then(|v| v.strip_suffix('"'))
            .filter(|value| !value.is_empty())
        {
            routes.push(value.to_string());
        }
    }
    if routes.is_empty() {
        anyhow::bail!("no routes parsed from RUST_ROUTES in dmb_app/src/lib.rs");
    }
    Ok(routes)
}

pub(crate) fn parse_sw_version_from_source(source: &str) -> Option<String> {
    let marker = "const VERSION = '";
    let start = source.find(marker).map(|idx| idx + marker.len())?;
    let end_rel = source[start..].find("';")?;
    let end = start + end_rel;
    let value = source[start..end].trim();
    if value.is_empty() {
        None
    } else {
        Some(value.to_string())
    }
}

pub(crate) fn resolve_sw_version_for_data_release(
    skip_sw_bump: bool,
    current_version: Option<String>,
) -> Option<String> {
    if skip_sw_bump { current_version } else { None }
}

pub(crate) fn render_sw_template(
    template: &str,
    version: &str,
    shell_assets: &[String],
    data_assets: &[String],
) -> String {
    template
        .replace("__DMB_SW_VERSION__", version)
        .replace("__DMB_SW_SHELL_ASSETS__", &render_js_array(shell_assets))
        .replace("__DMB_SW_DATA_ASSETS__", &render_js_array(data_assets))
}

fn render_js_array(values: &[String]) -> String {
    let mut out = String::from("[\n");
    for value in values {
        out.push_str("  '");
        out.push_str(value);
        out.push_str("',\n");
    }
    out.push(']');
    out
}
