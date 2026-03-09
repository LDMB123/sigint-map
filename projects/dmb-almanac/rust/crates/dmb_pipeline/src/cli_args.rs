use clap::{Parser, Subcommand};
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "dmb_pipeline")]
#[command(about = "DMB Almanac Rust data pipeline", long_about = None)]
pub(crate) struct Cli {
    #[command(subcommand)]
    pub(crate) command: Command,
}

#[derive(Subcommand)]
pub(crate) enum Command {
    Scrape {
        #[arg(long, default_value_t = false)]
        live: bool,
        #[arg(long)]
        year: Option<i32>,
        #[arg(long, default_value_t = false)]
        full: bool,
        #[arg(long, default_value_t = false)]
        strict: bool,
        #[arg(long)]
        warnings_output: Option<PathBuf>,
        #[arg(long)]
        warnings_max: Option<usize>,
        #[arg(long)]
        warnings_jsonl: Option<PathBuf>,
        #[arg(long, default_value_t = false, alias = "cache-only")]
        dry_run: bool,
        #[arg(long, default_value_t = false)]
        warn_only: bool,
        #[arg(long, default_value_t = false)]
        fail_on_warning: bool,
        #[arg(long)]
        max_retries: Option<u32>,
        #[arg(long)]
        endpoint_retry_max: Option<u64>,
        #[arg(long)]
        cache_ttl_days: Option<u64>,
        #[arg(long)]
        max_items: Option<usize>,
    },
    ScrapeFixtures {
        #[arg(long, default_value = "crates/dmb_pipeline/tests/fixtures")]
        fixtures_dir: PathBuf,
        #[arg(long)]
        warnings_output: Option<PathBuf>,
        #[arg(long)]
        warnings_max: Option<usize>,
        #[arg(long)]
        warnings_jsonl: Option<PathBuf>,
        #[arg(long, default_value_t = false)]
        fail_on_warning: bool,
    },
    ScrapeSmoke {
        #[arg(long)]
        warnings_output: Option<PathBuf>,
        #[arg(long)]
        warnings_max: Option<usize>,
        #[arg(long)]
        warnings_jsonl: Option<PathBuf>,
        #[arg(long, default_value_t = false, alias = "cache-only")]
        dry_run: bool,
        #[arg(long)]
        max_retries: Option<u32>,
        #[arg(long)]
        endpoint_retry_max: Option<u64>,
        #[arg(long)]
        cache_ttl_days: Option<u64>,
        #[arg(long, default_value_t = false)]
        fail_on_warning: bool,
    },
    BuildDb {
        #[arg(long, default_value = "data/dmb-almanac.db")]
        source: PathBuf,
        #[arg(long, default_value = "data/dmb-almanac.db")]
        output: PathBuf,
    },
    BuildRuntimeDb {
        #[arg(long, default_value = "static/data")]
        source_dir: PathBuf,
        #[arg(long, default_value = "data/dmb-almanac.db")]
        output: PathBuf,
    },
    BuildIdb {
        #[arg(long, default_value = "../data/static-data")]
        source_dir: PathBuf,
        #[arg(long, default_value = "static/data")]
        output_dir: PathBuf,
    },
    ExportJson {
        #[arg(long, default_value = "data/dmb-almanac.db")]
        source: PathBuf,
        #[arg(long, default_value = "static/data")]
        output_dir: PathBuf,
    },
    Validate {
        #[arg(long, default_value_t = false)]
        strict_warnings: bool,
        #[arg(long)]
        endpoint_timing_max_pct: Option<u64>,
        #[arg(long)]
        endpoint_retry_max: Option<u64>,
    },
    ValidateParity {
        #[arg(long, default_value = "static/data/manifest.json")]
        manifest: PathBuf,
        #[arg(long, default_value = "data/dmb-almanac.db")]
        sqlite: PathBuf,
        #[arg(long, default_value_t = false)]
        strict_manifest: bool,
        #[arg(long, default_value_t = false)]
        strict_tables: bool,
    },
    BuildEmbeddingInput {
        #[arg(long, default_value = "static/data")]
        source_dir: PathBuf,
        #[arg(long, default_value = "data/embedding-input.json")]
        output: PathBuf,
    },
    BuildDataManifest {
        #[arg(long, default_value = "static/data")]
        source_dir: PathBuf,
        #[arg(long, default_value = "static/data/manifest.json")]
        output: PathBuf,
    },
    BuildAiConfig {
        #[arg(long, default_value = "static/data")]
        output_dir: PathBuf,
    },
    IdbMigrationDryRun {
        #[arg(long, default_value = "static/data/manifest.json")]
        manifest: PathBuf,
        #[arg(long, default_value = "static/data/idb-migration-dry-run.json")]
        output: PathBuf,
    },
    AnnIndex {
        #[arg(long)]
        input_dir: PathBuf,
        #[arg(long)]
        output: PathBuf,
        #[arg(long, default_value = "linear")]
        method: String,
    },
}
