use super::*;

pub(super) fn verify(skip_wasm: bool, skip_tests: bool) -> Result<()> {
    let rust_dir = rust_workspace_dir()?;

    run_command("cargo", &["fmt", "--all", "--", "--check"], &rust_dir, &[])?;

    for args in [
        vec!["check", "-p", "dmb_app", "--locked"],
        vec!["check", "-p", "dmb_app", "--features", "ssr", "--locked"],
        vec!["check", "-p", "dmb_app", "--features", "hydrate", "--locked"],
        vec!["check", "-p", "dmb_app", "--all-features", "--locked"],
    ] {
        run_command("cargo", &args, &rust_dir, &[])?;
    }

    run_command(
        "cargo",
        &[
            "clippy",
            "-p",
            "dmb_app",
            "--features",
            "hydrate",
            "--all-targets",
            "--locked",
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
            "--locked",
            "--",
            "-D",
            "warnings",
        ],
        &rust_dir,
        &[],
    )?;

    if !skip_wasm {
        build_hydrate_pkg(true, false)?;
        verify_hydrate_artifacts()?;
        verify_service_worker_generated()?;
        verify_hydrate_budget(None)?;
        verify_server_runtime_artifacts(false, None)?;
    }

    if !skip_tests {
        run_command(
            "cargo",
            &["test", "-p", "dmb_app", "--features", "hydrate", "--lib", "--locked"],
            &rust_dir,
            &[],
        )?;

        run_command("cargo", &["test", "--workspace", "--locked"], &rust_dir, &[])?;
    }

    Ok(())
}

pub(super) fn build_hydrate_pkg(release: bool, ai_diagnostics_full: bool) -> Result<()> {
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
    let feature_set = hydrate_feature_set(ai_diagnostics_full);
    args.extend(["--features", feature_set]);

    run_command("wasm-pack", &args, &app_dir, &[]).context(
        "wasm-pack build failed (install wasm-pack and ensure wasm32-unknown-unknown target exists)",
    )?;

    Ok(())
}

pub(super) fn hydrate_feature_set(ai_diagnostics_full: bool) -> &'static str {
    if ai_diagnostics_full {
        "hydrate ai_diagnostics_full"
    } else {
        "hydrate"
    }
}

pub(super) fn check_wasm_size(wasm: Option<PathBuf>, baseline_gzip: Option<u64>) -> Result<()> {
    let repo_root = repo_root_dir()?;
    let wasm_path = wasm.unwrap_or_else(|| repo_root.join("rust/static/pkg/dmb_app_bg.wasm"));
    if !wasm_path.exists() {
        anyhow::bail!("WASM file not found: {}", wasm_path.display());
    }

    let raw_bytes = fs::metadata(&wasm_path)
        .with_context(|| format!("stat {}", wasm_path.display()))?
        .len();
    let gzip_bytes = gzip_size_bytes(&wasm_path)?;

    println!("wasm path:  {}", wasm_path.display());
    println!("raw bytes:  {raw_bytes}");
    println!("gzip bytes: {gzip_bytes}");

    if let Some(baseline) = baseline_gzip {
        let target = baseline.saturating_mul(90) / 100;
        println!("baseline gzip bytes: {baseline}");
        println!("target (<=90%):      {target}");
        if gzip_bytes > target {
            anyhow::bail!("FAIL: gzip size gate not met");
        }
        println!("PASS: gzip size gate met");
    }

    Ok(())
}

pub(super) fn server_preflight(require_sqlite: bool, sqlite: Option<PathBuf>) -> Result<()> {
    verify_hydrate_artifacts()?;
    verify_service_worker_generated()?;
    verify_server_runtime_artifacts(require_sqlite, sqlite)
}

pub(super) fn gzip_size_bytes(path: &std::path::Path) -> Result<u64> {
    let output = std::process::Command::new("gzip")
        .arg("-c")
        .arg(path)
        .output()
        .with_context(|| format!("spawn gzip for {}", path.display()))?;
    if !output.status.success() {
        anyhow::bail!(
            "gzip failed for {} with status {}",
            path.display(),
            output.status
        );
    }
    Ok(u64::try_from(output.stdout.len()).unwrap_or(u64::MAX))
}
