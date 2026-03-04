use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use serde_json::Value;
use std::{collections::BTreeSet, fs, path::PathBuf};

#[derive(Parser)]
#[command(name = "xtask")]
#[command(about = "DMB Almanac build orchestration", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    BuildHydratePkg {
        #[arg(long, default_value_t = true)]
        release: bool,
        #[arg(long, default_value_t = false)]
        ai_diagnostics_full: bool,
    },
    Verify {
        #[arg(long, default_value_t = false)]
        skip_wasm: bool,
        #[arg(long, default_value_t = false)]
        skip_tests: bool,
    },
    DataRelease {
        #[arg(long, default_value = "data/dmb-almanac.db")]
        sqlite: PathBuf,
        #[arg(long, default_value_t = false)]
        skip_parity: bool,
        #[arg(long, default_value_t = false)]
        skip_sw_bump: bool,
    },
    GenerateSw {
        #[arg(long)]
        version: Option<String>,
    },
    ScrapeQa {
        #[arg(long, default_value = "data/warnings-fixtures.json")]
        warnings_output: PathBuf,
        #[arg(long, default_value = "data/warnings.baseline.json")]
        baseline: PathBuf,
        #[arg(long, default_value = "data/warnings.max-by-field.json")]
        max_by_field: PathBuf,
        #[arg(long, default_value = "data/warnings.max-by-selector.json")]
        max_by_selector: PathBuf,
    },
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Command::BuildHydratePkg {
            release,
            ai_diagnostics_full,
        } => build_hydrate_pkg(release, ai_diagnostics_full),
        Command::Verify {
            skip_wasm,
            skip_tests,
        } => verify(skip_wasm, skip_tests),
        Command::DataRelease {
            sqlite,
            skip_parity,
            skip_sw_bump,
        } => data_release(&sqlite, skip_parity, skip_sw_bump),
        Command::GenerateSw { version } => generate_sw(version),
        Command::ScrapeQa {
            warnings_output,
            baseline,
            max_by_field,
            max_by_selector,
        } => run_scrape_qa(&warnings_output, &baseline, &max_by_field, &max_by_selector),
    }
}

fn verify(skip_wasm: bool, skip_tests: bool) -> Result<()> {
    let rust_dir = rust_workspace_dir()?;

    run_command("cargo", &["fmt", "--all", "--", "--check"], &rust_dir, &[])?;

    run_command(
        "cargo",
        &[
            "clippy",
            "-p",
            "dmb_app",
            "--features",
            "hydrate",
            "--all-targets",
            "--",
            "-D",
            "warnings",
        ],
        &rust_dir,
        &[],
    )?;

    run_command(
        "cargo",
        &[
            "clippy",
            "-p",
            "dmb_app",
            "--features",
            "ssr",
            "--all-targets",
            "--",
            "-D",
            "warnings",
        ],
        &rust_dir,
        &[],
    )?;

    if !skip_wasm {
        // `cargo build --target wasm32-unknown-unknown` validates compilation, but it does not
        // produce the JS glue bundle that the SSR server expects to serve for hydration.
        // `wasm-pack` builds both the WASM and the JS loader into `rust/static/pkg`.
        build_hydrate_pkg(true, false)?;
    }

    if !skip_tests {
        // Hydrate-only logic (manifest parsing/import integrity) is not exercised by the
        // default workspace test run because dmb_app tests compile in SSR mode by default.
        // Run hydrate lib tests explicitly so parity/import regressions are caught pre-cutover.
        run_command(
            "cargo",
            &["test", "-p", "dmb_app", "--features", "hydrate", "--lib"],
            &rust_dir,
            &[],
        )?;

        run_command("cargo", &["test", "--workspace"], &rust_dir, &[])?;
    }

    Ok(())
}

fn build_hydrate_pkg(release: bool, ai_diagnostics_full: bool) -> Result<()> {
    let repo_root = repo_root_dir()?;
    let rust_dir = repo_root.join("rust");
    let app_dir = rust_dir.join("crates/dmb_app");

    let mut args = vec![
        "build",
        "--target",
        "web",
        "--out-dir",
        "../../static/pkg",
        "--out-name",
        "dmb_app",
    ];
    if release {
        args.push("--release");
    }
    args.push("--");
    let feature_set = if ai_diagnostics_full {
        "hydrate ai_diagnostics_full"
    } else {
        "hydrate"
    };
    args.extend(["--features", feature_set]);

    run_command("wasm-pack", &args, &app_dir, &[]).context(
        "wasm-pack build failed (install wasm-pack and ensure wasm32-unknown-unknown target exists)",
    )?;

    Ok(())
}

fn data_release(sqlite: &PathBuf, skip_parity: bool, skip_sw_bump: bool) -> Result<()> {
    let rust_dir = rust_workspace_dir()?;

    let sw_version = if skip_sw_bump {
        read_current_sw_version()?
    } else {
        None
    };
    generate_sw(sw_version)?;

    run_command(
        "cargo",
        &[
            "run",
            "-p",
            "dmb_pipeline",
            "--",
            "build-ai-config",
            "--output-dir",
            "static/data",
        ],
        &rust_dir,
        &[],
    )?;

    run_command(
        "cargo",
        &[
            "run",
            "-p",
            "dmb_pipeline",
            "--",
            "build-data-manifest",
            "--source-dir",
            "static/data",
            "--output",
            "static/data/manifest.json",
        ],
        &rust_dir,
        &[],
    )?;

    run_command(
        "cargo",
        &[
            "run",
            "-p",
            "dmb_pipeline",
            "--",
            "idb-migration-dry-run",
            "--manifest",
            "static/data/manifest.json",
            "--output",
            "static/data/idb-migration-dry-run.json",
        ],
        &rust_dir,
        &[],
    )?;

    if skip_parity {
        return Ok(());
    }

    let sqlite_path = rust_dir.join(sqlite);
    if !sqlite_path.exists() {
        println!(
            "Skipping validate-parity ({} not present)",
            sqlite_path.display()
        );
        return Ok(());
    }

    run_command(
        "cargo",
        &[
            "run",
            "-p",
            "dmb_pipeline",
            "--",
            "validate-parity",
            "--manifest",
            "static/data/manifest.json",
            "--sqlite",
            sqlite.to_str().unwrap_or("data/dmb-almanac.db"),
            "--strict-manifest",
            "--strict-tables",
        ],
        &rust_dir,
        &[],
    )?;

    Ok(())
}

fn generate_sw(version: Option<String>) -> Result<()> {
    let repo_root = repo_root_dir()?;
    let static_dir = repo_root.join("rust/static");
    let template_path = static_dir.join("sw.template.js");
    let sw_path = repo_root.join("rust/static/sw.js");
    let template = fs::read_to_string(&template_path).context("read sw.template.js")?;

    let new_version = version.unwrap_or_else(|| chrono::Utc::now().format("%Y-%m-%d").to_string());
    let shell_assets = collect_shell_assets(&repo_root)?;
    let data_assets = collect_data_assets(&repo_root);

    let rendered = template
        .replace("__DMB_SW_VERSION__", &new_version)
        .replace("__DMB_SW_SHELL_ASSETS__", &render_js_array(&shell_assets))
        .replace("__DMB_SW_DATA_ASSETS__", &render_js_array(&data_assets));
    fs::write(&sw_path, rendered).context("write sw.js")?;
    println!(
        "Generated sw.js version={new_version} shell_assets={} data_assets={}",
        shell_assets.len(),
        data_assets.len()
    );
    Ok(())
}

fn read_current_sw_version() -> Result<Option<String>> {
    let repo_root = repo_root_dir()?;
    let sw_path = repo_root.join("rust/static/sw.js");
    if !sw_path.exists() {
        return Ok(None);
    }
    let source = fs::read_to_string(&sw_path).context("read sw.js")?;
    let marker = "const VERSION = '";
    let Some(start) = source.find(marker).map(|idx| idx + marker.len()) else {
        return Ok(None);
    };
    let Some(end_rel) = source[start..].find("';") else {
        return Ok(None);
    };
    let end = start + end_rel;
    let value = source[start..end].trim();
    if value.is_empty() {
        Ok(None)
    } else {
        Ok(Some(value.to_string()))
    }
}

fn collect_shell_assets(repo_root: &std::path::Path) -> Result<Vec<String>> {
    let routes = parse_rust_routes(repo_root)?;
    let mut assets = BTreeSet::new();

    for route in routes {
        if !route.starts_with('/') || route.contains(':') || route.contains('*') {
            continue;
        }
        assets.insert(route);
    }

    for asset in [
        "/app.css",
        "/manifest.json",
        "/webgpu.js",
        "/webgpu-worker.js",
        "/offline.html",
        "/icons/icon-192.png",
        "/icons/icon-512.png",
    ] {
        assets.insert(asset.to_string());
    }

    Ok(assets.into_iter().collect())
}

fn collect_data_assets(repo_root: &std::path::Path) -> Vec<String> {
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

fn run_scrape_qa(
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

fn run_command(program: &str, args: &[&str], cwd: &PathBuf, envs: &[(&str, &str)]) -> Result<()> {
    let mut command = std::process::Command::new(program);
    command.args(args).current_dir(cwd);
    for (key, value) in envs {
        command.env(key, value);
    }
    let status = command
        .status()
        .with_context(|| format!("spawn {program}"))?;
    if !status.success() {
        anyhow::bail!("{program} failed with status: {status}");
    }
    Ok(())
}

fn run_command_optional(
    program: &str,
    args: &[&str],
    cwd: &PathBuf,
    envs: &[(&str, &str)],
) -> Result<bool> {
    let status = std::process::Command::new(program)
        .arg("--version")
        .status();
    if status.is_err() {
        println!("Skipping {program}: not found in PATH");
        return Ok(false);
    }
    run_command(program, args, cwd, envs)?;
    Ok(true)
}

fn repo_root_dir() -> Result<PathBuf> {
    let cwd = std::env::current_dir().context("read current dir")?;
    if cwd.join("rust/Cargo.toml").exists() {
        return Ok(cwd);
    }
    if cwd.file_name().and_then(|v| v.to_str()) == Some("rust") && cwd.join("Cargo.toml").exists() {
        return Ok(cwd
            .parent()
            .map(std::path::Path::to_path_buf)
            .unwrap_or(cwd.clone()));
    }
    for ancestor in cwd.ancestors() {
        if ancestor.join("rust/Cargo.toml").exists() {
            return Ok(ancestor.to_path_buf());
        }
    }
    anyhow::bail!(
        "unable to locate repo root from {} (expected rust/Cargo.toml)",
        cwd.display()
    );
}

fn rust_workspace_dir() -> Result<PathBuf> {
    Ok(repo_root_dir()?.join("rust"))
}
