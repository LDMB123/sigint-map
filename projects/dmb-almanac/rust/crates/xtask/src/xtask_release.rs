use super::*;

pub(super) fn data_release(sqlite: &PathBuf, skip_parity: bool, skip_sw_bump: bool) -> Result<()> {
    let rust_dir = rust_workspace_dir()?;

    let current_sw_version = if skip_sw_bump {
        read_current_sw_version()?
    } else {
        None
    };
    let sw_version = resolve_sw_version_for_data_release(skip_sw_bump, current_sw_version);
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
