use anyhow::{Context, Result};
use clap::Parser;
use std::fs::File;
use std::path::PathBuf;

use crate::artifact_contracts::{build_data_manifest, idb_migration_dry_run, write_ai_config};
use crate::asset_packaging::{build_db, build_idb, scrape_seed_data};
use crate::cli_args::{Cli, Command};
use crate::embedding_assets::{build_ann_index, build_embedding_input};
use crate::pipeline_support::env_u64_or_warn;
use crate::sqlite_parity::validate_sqlite_parity;
use crate::validation::validate_data;

pub(crate) fn run() -> Result<()> {
    let cli = Cli::parse();
    run_command(cli.command)
}

fn run_command(command: Command) -> Result<()> {
    match command {
        Command::Scrape {
            live,
            year,
            full,
            strict,
            warnings_output,
            warnings_max,
            warnings_jsonl,
            dry_run,
            warn_only,
            fail_on_warning,
            max_retries,
            endpoint_retry_max,
            cache_ttl_days,
            max_items,
        } => {
            if live {
                let env_max_retries = std::env::var("DMB_SCRAPE_MAX_RETRIES")
                    .ok()
                    .and_then(|v| v.parse::<u32>().ok());
                crate::scrape::scrape_live(crate::scrape::ScrapeConfig {
                    output_dir: PathBuf::from("data/raw"),
                    cache_dir: PathBuf::from("data/cache"),
                    year,
                    full,
                    min_delay_ms: 1000,
                    max_delay_ms: 3000,
                    max_retries: 3,
                    endpoint_retry_max: endpoint_retry_max
                        .or_else(|| env_u64_or_warn("DMB_ENDPOINT_RETRY_MAX")),
                    strict,
                    warnings_output,
                    warnings_max,
                    warnings_jsonl,
                    dry_run,
                    warn_only,
                    fail_on_warning,
                    max_retries_override: max_retries.or(env_max_retries),
                    cache_ttl_days,
                    max_items,
                })?;
                tracing::info!("scrape: live data captured");
            } else {
                if dry_run
                    || warn_only
                    || warnings_max.is_some()
                    || max_retries.is_some()
                    || cache_ttl_days.is_some()
                    || max_items.is_some()
                {
                    tracing::warn!(
                        "scrape flags ignored for seed data (dry-run/warn-only/warnings-max)"
                    );
                }
                scrape_seed_data()?;
                if let Some(path) = warnings_output.as_ref() {
                    write_seed_warning_report(path)?;
                }
                tracing::info!("scrape: seed data captured");
            }
        }
        Command::ScrapeFixtures {
            fixtures_dir,
            warnings_output,
            warnings_max,
            warnings_jsonl,
            fail_on_warning,
        } => {
            crate::scrape::scrape_fixtures(
                &fixtures_dir,
                warnings_output,
                warnings_max,
                warnings_jsonl,
                fail_on_warning,
            )?;
            tracing::info!("scrape-fixtures: completed");
        }
        Command::ScrapeSmoke {
            warnings_output,
            warnings_max,
            warnings_jsonl,
            dry_run,
            max_retries,
            endpoint_retry_max,
            cache_ttl_days,
            fail_on_warning,
        } => {
            let env_max_retries = std::env::var("DMB_SCRAPE_MAX_RETRIES")
                .ok()
                .and_then(|v| v.parse::<u32>().ok());
            crate::scrape::scrape_smoke(crate::scrape::ScrapeConfig {
                output_dir: PathBuf::from("data/raw"),
                cache_dir: PathBuf::from("data/cache"),
                year: None,
                full: false,
                min_delay_ms: 500,
                max_delay_ms: 1500,
                max_retries: 3,
                endpoint_retry_max: endpoint_retry_max
                    .or_else(|| env_u64_or_warn("DMB_ENDPOINT_RETRY_MAX")),
                strict: false,
                warnings_output,
                warnings_max,
                warnings_jsonl,
                dry_run,
                warn_only: false,
                fail_on_warning,
                max_retries_override: max_retries.or(env_max_retries),
                cache_ttl_days,
                max_items: None,
            })?;
            tracing::info!("scrape-smoke: completed");
        }
        Command::BuildDb { source, output } => {
            build_db(&source, &output)?;
            tracing::info!(
                "build-db: copied {} -> {}",
                source.display(),
                output.display()
            );
        }
        Command::BuildRuntimeDb { source_dir, output } => {
            crate::runtime_db::build_runtime_db(&source_dir, &output)?;
            tracing::info!(
                "build-runtime-db: built {} -> {}",
                source_dir.display(),
                output.display()
            );
        }
        Command::BuildIdb {
            source_dir,
            output_dir,
        } => {
            build_idb(&source_dir, &output_dir)?;
            tracing::info!(
                "build-idb: mirrored {} -> {}",
                source_dir.display(),
                output_dir.display()
            );
        }
        Command::ExportJson { source, output_dir } => {
            crate::export::export_json(&source, &output_dir)?;
            tracing::info!(
                "export-json: exported {} -> {}",
                source.display(),
                output_dir.display()
            );
        }
        Command::Validate {
            strict_warnings,
            endpoint_timing_max_pct,
            endpoint_retry_max,
        } => {
            validate_data(strict_warnings, endpoint_timing_max_pct, endpoint_retry_max)?;
            tracing::info!("validate: checks complete");
        }
        Command::ValidateParity {
            manifest,
            sqlite,
            strict_manifest,
            strict_tables,
        } => {
            validate_sqlite_parity(&manifest, &sqlite, strict_manifest, strict_tables)?;
            tracing::info!("validate-parity: checks complete");
        }
        Command::BuildEmbeddingInput { source_dir, output } => {
            build_embedding_input(&source_dir, &output)?;
            tracing::info!("embedding-input: wrote {}", output.display());
        }
        Command::BuildDataManifest { source_dir, output } => {
            write_ai_config(&source_dir)?;
            build_data_manifest(&source_dir, &output)?;
            tracing::info!("data-manifest: wrote {}", output.display());
        }
        Command::BuildAiConfig { output_dir } => {
            write_ai_config(&output_dir)?;
            tracing::info!("ai-config: wrote {}", output_dir.display());
        }
        Command::IdbMigrationDryRun { manifest, output } => {
            idb_migration_dry_run(&manifest, &output)?;
            tracing::info!("idb-migration-dry-run: wrote {}", output.display());
        }
        Command::AnnIndex {
            input_dir,
            output,
            method,
        } => {
            build_ann_index(&input_dir, &output, &method)?;
            tracing::info!("ann-index: completed");
        }
    }

    Ok(())
}

fn write_seed_warning_report(path: &PathBuf) -> Result<()> {
    let report = serde_json::json!({
        "generatedAt": chrono::Utc::now().to_rfc3339(),
        "emptySelectors": 0,
        "missingFields": 0,
        "missingByField": {},
        "missingByContext": {},
        "topMissingFields": [],
        "emptyBySelector": {},
        "emptyByContext": {},
        "endpointTimingsMs": {},
        "endpointRetries": {},
        "signature": null,
        "source": "seed"
    });
    let file = File::create(path).with_context(|| format!("write {}", path.display()))?;
    serde_json::to_writer_pretty(file, &report).context("serialize warning report")?;
    Ok(())
}
