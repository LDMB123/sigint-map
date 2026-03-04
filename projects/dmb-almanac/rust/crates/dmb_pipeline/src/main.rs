use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use rusqlite::Connection;
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::fs::File;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use dmb_core::{AnnIndexMeta, AnnIvfIndex, EmbeddingChunk, EmbeddingManifest, CORE_SCHEMA_VERSION};
use once_cell::sync::Lazy;
mod data_utils;
mod export;
mod runtime_db;
mod scrape;
mod warning_checks;

use self::data_utils::{
    checksum_file, collect_ids, compare_counts, count_json_entries, ensure_required_fields,
    ensure_unique, load_json_array,
};
use self::warning_checks::{
    compare_endpoint_timings, compare_warning_reports, enforce_empty_by_context,
    enforce_endpoint_retries, enforce_missing_by_context, enforce_missing_by_context_map,
    enforce_warning_thresholds, read_warning_report, read_warning_thresholds,
};

fn env_u64_or_warn(name: &str) -> Option<u64> {
    match std::env::var(name) {
        Ok(raw) => match raw.parse::<u64>() {
            Ok(value) => Some(value),
            Err(err) => {
                tracing::warn!(
                    env = name,
                    value = raw,
                    error = %err,
                    "invalid u64 env var; ignoring"
                );
                None
            }
        },
        Err(std::env::VarError::NotUnicode(_)) => {
            tracing::warn!(env = name, "env var is not valid unicode; ignoring");
            None
        }
        Err(std::env::VarError::NotPresent) => None,
    }
}

#[derive(Parser)]
#[command(name = "dmb_pipeline")]
#[command(about = "DMB Almanac Rust data pipeline", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
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
        /// Fail if any expected manifest record counts are missing for required files.
        #[arg(long, default_value_t = false)]
        strict_manifest: bool,
        /// Fail if any SQLite tables are missing (or count queries fail).
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

#[derive(Debug, serde::Deserialize, serde::Serialize)]
struct EmbeddingInput {
    id: i32,
    kind: String,
    text: Option<String>,
    slug: Option<String>,
    label: Option<String>,
    vector: Option<Vec<f32>>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
struct DataManifest {
    version: String,
    generated_at: String,
    files: Vec<DataFile>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
struct DataFile {
    name: String,
    size: u64,
    checksum: String,
    count: Option<u64>,
}

static PIPELINE_WARN_ONCE: Lazy<Mutex<HashSet<String>>> = Lazy::new(|| Mutex::new(HashSet::new()));

const SETLIST_ENTRIES_FILE: &str = "setlist-entries.json";
const SETLIST_CHUNK_PREFIX: &str = "setlist-entries-chunk-";
const SETLIST_CHUNK_RECORDS: usize = 2_500;

const IDB_REQUIRED_DATA_FILES: &[&str] = &[
    "venues.json",
    "songs.json",
    "tours.json",
    "shows.json",
    "setlist-entries.json",
    "guests.json",
    "guest-appearances.json",
    "liberation-list.json",
    "song-statistics.json",
    "releases.json",
    "release-tracks.json",
    "curated-lists.json",
    "curated-list-items.json",
    "ai-config.json",
    "manifest.json",
    "idb-migration-dry-run.json",
    "ann-index.json",
    "ann-index.bin",
    "ann-index.ivf.json",
    "embedding-manifest.json",
    "embedding-sample.json",
];

fn normalized_data_asset_name(name: &str) -> &str {
    name.strip_suffix(".json.br")
        .or_else(|| name.strip_suffix(".json.gz"))
        .unwrap_or(name)
}

fn is_setlist_chunk_asset_name(normalized_name: &str) -> bool {
    normalized_name.starts_with(SETLIST_CHUNK_PREFIX) && normalized_name.ends_with(".json")
}

fn manifest_record_key(name: &str) -> String {
    let normalized = normalized_data_asset_name(name);
    let stem = normalized.strip_suffix(".json").unwrap_or(normalized);
    if stem.starts_with(SETLIST_CHUNK_PREFIX) {
        "setlist-entries".to_string()
    } else {
        stem.to_string()
    }
}

fn is_supported_data_asset(name: &str) -> bool {
    let normalized = normalized_data_asset_name(name);
    if is_setlist_chunk_asset_name(normalized) {
        return true;
    }
    if IDB_REQUIRED_DATA_FILES.contains(&normalized) {
        return true;
    }
    normalized.starts_with("embedding-chunk-") && normalized.ends_with(".json")
}

fn warn_once(key: String, f: impl FnOnce()) {
    let mut guard = match PIPELINE_WARN_ONCE.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    };
    if guard.insert(key) {
        f();
    }
}

fn json_i64_or_warn(value: Option<&Value>, context: &str, field: &str) -> i64 {
    if let Some(v) = value.and_then(serde_json::Value::as_i64) {
        return v;
    }
    if let Some(v) = value
        .and_then(|v| v.as_str())
        .and_then(|v| v.trim().parse::<i64>().ok())
    {
        return v;
    }
    let key = format!("{context}.{field}");
    warn_once(key, || {
        tracing::warn!(context, field, "missing or invalid i64; defaulting to 0");
    });
    0
}

fn json_i32_or_warn(value: Option<&Value>, context: &str, field: &str) -> i32 {
    let value_i64 = json_i64_or_warn(value, context, field);
    if value_i64 == 0 {
        return 0;
    }
    i32::try_from(value_i64).unwrap_or_else(|_| {
        let key = format!("{context}.{field}.range");
        warn_once(key, || {
            tracing::warn!(
                context,
                field,
                value = value_i64,
                "i64 value out of i32 range; defaulting to 0"
            );
        });
        0
    })
}

#[derive(Debug)]
struct WarningReport {
    empty: u64,
    missing: u64,
    missing_by_field: HashMap<String, u64>,
    missing_by_context: HashMap<String, u64>,
    empty_by_selector: HashMap<String, u64>,
    empty_by_context: HashMap<String, u64>,
    endpoint_timings_ms: HashMap<String, u64>,
    endpoint_retries: HashMap<String, u64>,
    endpoint_retries_total: u64,
    top_endpoint_retries: Vec<EndpointRetrySummary>,
    warning_events_summary: HashMap<String, u64>,
    signature: Option<String>,
}

#[derive(Debug)]
struct EndpointRetrySummary {
    endpoint: String,
    count: u64,
}

fn manifest_counts(manifest: &DataManifest) -> HashMap<String, u64> {
    let mut counts = HashMap::new();
    let mut setlist_single_count = None;
    let mut setlist_chunk_count = 0u64;

    for file in &manifest.files {
        let Some(count) = file.count else { continue };
        let normalized = normalized_data_asset_name(&file.name);

        // When both legacy and chunked setlist files are present, runtime DB import
        // reads the legacy file. Parity must mirror that selection and avoid double counting.
        if normalized == SETLIST_ENTRIES_FILE {
            let total = setlist_single_count.unwrap_or(0u64).saturating_add(count);
            setlist_single_count = Some(total);
            continue;
        }
        if is_setlist_chunk_asset_name(normalized) {
            setlist_chunk_count = setlist_chunk_count.saturating_add(count);
            continue;
        }

        let key = manifest_record_key(&file.name);
        *counts.entry(key).or_insert(0) += count;
    }

    if let Some(single_count) = setlist_single_count {
        counts.insert("setlist-entries".to_string(), single_count);
    } else if setlist_chunk_count > 0 {
        counts.insert("setlist-entries".to_string(), setlist_chunk_count);
    }

    counts
}

fn validate_sqlite_parity(
    manifest_path: &Path,
    sqlite_path: &Path,
    strict_manifest: bool,
    strict_tables: bool,
) -> Result<()> {
    if !manifest_path.exists() {
        anyhow::bail!("manifest not found: {}", manifest_path.display());
    }
    if !sqlite_path.exists() {
        anyhow::bail!("sqlite db not found: {}", sqlite_path.display());
    }
    let manifest_file = File::open(manifest_path)
        .with_context(|| format!("open manifest {}", manifest_path.display()))?;
    let manifest: DataManifest =
        serde_json::from_reader(manifest_file).context("parse manifest")?;
    let counts = manifest_counts(&manifest);
    if counts.is_empty() {
        anyhow::bail!("manifest has no record counts");
    }

    let conn = Connection::open(sqlite_path)
        .with_context(|| format!("open sqlite {}", sqlite_path.display()))?;

    let mapping = [
        ("venues", "venues"),
        ("songs", "songs"),
        ("tours", "tours"),
        ("shows", "shows"),
        ("setlist_entries", "setlist-entries"),
        ("guests", "guests"),
        ("guest_appearances", "guest-appearances"),
        ("liberation_list", "liberation-list"),
        ("song_statistics", "song-statistics"),
        ("releases", "releases"),
        ("release_tracks", "release-tracks"),
        ("curated_lists", "curated-lists"),
        ("curated_list_items", "curated-list-items"),
    ];

    let mut mismatches = Vec::new();
    let mut missing_manifest = Vec::new();
    let mut missing_tables = Vec::new();
    for (table, file) in mapping {
        let expected = match counts.get(file).copied() {
            Some(value) => value,
            None => {
                missing_manifest.push(file.to_string());
                0
            }
        };
        let query = format!("SELECT COUNT(*) FROM {table}");
        let actual: i64 = match conn.query_row(&query, [], |row| row.get(0)) {
            Ok(value) => value,
            Err(err) => {
                // Common failure mode when schema drifted or db is missing tables.
                missing_tables.push(format!("{table}: {err}"));
                continue;
            }
        };
        let actual = actual.max(0) as u64;
        if actual != expected {
            mismatches.push((table.to_string(), expected, actual));
        }
    }

    if strict_manifest && !missing_manifest.is_empty() {
        anyhow::bail!(
            "manifest missing record counts for {} required file(s): {}",
            missing_manifest.len(),
            missing_manifest.join(", ")
        );
    }
    if strict_tables && !missing_tables.is_empty() {
        anyhow::bail!(
            "sqlite missing/failed {} table count(s): {}",
            missing_tables.len(),
            missing_tables.join(" | ")
        );
    }

    if mismatches.is_empty() {
        tracing::info!("sqlite parity ok ({} tables)", mapping.len());
        return Ok(());
    }

    for (table, expected, actual) in &mismatches {
        tracing::warn!(
            table = table.as_str(),
            expected,
            actual,
            "sqlite parity mismatch"
        );
    }
    anyhow::bail!("sqlite parity mismatches: {}", mismatches.len());
}

fn main() -> Result<()> {
    tracing_subscriber::fmt().with_env_filter("info").init();

    let cli = Cli::parse();

    match cli.command {
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
                scrape::scrape_live(scrape::ScrapeConfig {
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
                    let file =
                        File::create(path).with_context(|| format!("write {}", path.display()))?;
                    serde_json::to_writer_pretty(file, &report)
                        .context("serialize warning report")?;
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
            scrape::scrape_fixtures(
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
            scrape::scrape_smoke(scrape::ScrapeConfig {
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
            runtime_db::build_runtime_db(&source_dir, &output)?;
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
            export::export_json(&source, &output_dir)?;
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

fn build_embedding_input(source_dir: &Path, output: &Path) -> Result<()> {
    let songs = load_json_array(&source_dir.join("songs.json"))?;
    let venues = load_json_array(&source_dir.join("venues.json"))?;
    let guests = load_json_array(&source_dir.join("guests.json"))?;
    let tours = load_json_array(&source_dir.join("tours.json"))?;
    let releases = load_json_array(&source_dir.join("releases.json"))?;
    let shows = load_json_array(&source_dir.join("shows.json"))?;

    let mut venue_map = HashMap::<i32, String>::new();
    for venue in &venues {
        if let (Some(id), Some(name)) = (
            venue.get("id").and_then(serde_json::Value::as_i64),
            venue.get("name").and_then(|v| v.as_str()),
        ) {
            let city = venue.get("city").and_then(|v| v.as_str()).unwrap_or("");
            let state = venue.get("state").and_then(|v| v.as_str()).unwrap_or("");
            let country = venue.get("country").and_then(|v| v.as_str()).unwrap_or("");
            let mut location = String::new();
            if !city.is_empty() {
                location.push_str(city);
            }
            if !state.is_empty() {
                if !location.is_empty() {
                    location.push_str(", ");
                }
                location.push_str(state);
            }
            if !country.is_empty() {
                if !location.is_empty() {
                    location.push_str(", ");
                }
                location.push_str(country);
            }
            let label = if location.is_empty() {
                name.to_string()
            } else {
                format!("{name} ({location})")
            };
            venue_map.insert(id as i32, label);
        }
    }

    let mut tour_map = HashMap::<i32, String>::new();
    for tour in &tours {
        if let (Some(id), Some(name)) = (
            tour.get("id").and_then(serde_json::Value::as_i64),
            tour.get("name").and_then(|v| v.as_str()),
        ) {
            let year = json_i64_or_warn(tour.get("year"), "embedding_input.tour", "year");
            let label = if year > 0 {
                format!("{year} {name}")
            } else {
                name.to_string()
            };
            tour_map.insert(id as i32, label);
        }
    }

    let mut items: Vec<EmbeddingInput> = Vec::new();

    for song in songs {
        let id = match song.get("id").and_then(serde_json::Value::as_i64) {
            Some(id) => id as i32,
            None => continue,
        };
        let title = song
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim();
        if title.is_empty() {
            continue;
        }
        let slug = song
            .get("slug")
            .and_then(|v| v.as_str())
            .map(std::string::ToString::to_string);
        let text = format!("song {title}");
        items.push(EmbeddingInput {
            id,
            kind: "song".to_string(),
            text: Some(text),
            slug,
            label: Some(title.to_string()),
            vector: None,
        });
    }

    for venue in venues {
        let id = match venue.get("id").and_then(serde_json::Value::as_i64) {
            Some(id) => id as i32,
            None => continue,
        };
        let name = venue
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim();
        if name.is_empty() {
            continue;
        }
        let city = venue.get("city").and_then(|v| v.as_str()).unwrap_or("");
        let state = venue.get("state").and_then(|v| v.as_str()).unwrap_or("");
        let country = venue.get("country").and_then(|v| v.as_str()).unwrap_or("");
        let text = format!("venue {name} {city} {state} {country}");
        items.push(EmbeddingInput {
            id,
            kind: "venue".to_string(),
            text: Some(text),
            slug: None,
            label: Some(name.to_string()),
            vector: None,
        });
    }

    for guest in guests {
        let id = match guest.get("id").and_then(serde_json::Value::as_i64) {
            Some(id) => id as i32,
            None => continue,
        };
        let name = guest
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim();
        if name.is_empty() {
            continue;
        }
        let slug = guest
            .get("slug")
            .and_then(|v| v.as_str())
            .map(std::string::ToString::to_string);
        items.push(EmbeddingInput {
            id,
            kind: "guest".to_string(),
            text: Some(format!("guest {name}")),
            slug,
            label: Some(name.to_string()),
            vector: None,
        });
    }

    for tour in tours {
        let id = match tour.get("id").and_then(serde_json::Value::as_i64) {
            Some(id) => id as i32,
            None => continue,
        };
        let name = tour
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim();
        if name.is_empty() {
            continue;
        }
        let year = json_i64_or_warn(tour.get("year"), "embedding_input.tour", "year");
        let label = if year > 0 {
            format!("{year} {name}")
        } else {
            name.to_string()
        };
        items.push(EmbeddingInput {
            id,
            kind: "tour".to_string(),
            text: Some(format!("tour {label}")),
            slug: None,
            label: Some(label),
            vector: None,
        });
    }

    for release in releases {
        let id = match release.get("id").and_then(serde_json::Value::as_i64) {
            Some(id) => id as i32,
            None => continue,
        };
        let title = release
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim();
        if title.is_empty() {
            continue;
        }
        let slug = release
            .get("slug")
            .and_then(|v| v.as_str())
            .map(std::string::ToString::to_string);
        let release_type = release
            .get("releaseType")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let text = if release_type.is_empty() {
            format!("release {title}")
        } else {
            format!("release {title} {release_type}")
        };
        items.push(EmbeddingInput {
            id,
            kind: "release".to_string(),
            text: Some(text),
            slug,
            label: Some(title.to_string()),
            vector: None,
        });
    }

    for show in shows {
        let id = match show.get("id").and_then(serde_json::Value::as_i64) {
            Some(id) => id as i32,
            None => continue,
        };
        let date = show
            .get("date")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim();
        if date.is_empty() {
            continue;
        }
        let venue_id = json_i32_or_warn(show.get("venueId"), "embedding_input.show", "venueId");
        let venue_label = venue_map
            .get(&venue_id)
            .cloned()
            .unwrap_or_else(|| "Unknown venue".to_string());
        let tour_id = json_i32_or_warn(show.get("tourId"), "embedding_input.show", "tourId");
        let tour_label = tour_map.get(&tour_id).cloned().unwrap_or_default();
        let label = if tour_label.is_empty() {
            format!("{date} • {venue_label}")
        } else {
            format!("{date} • {venue_label} • {tour_label}")
        };
        let text = format!("show {date} at {venue_label} {tour_label}");
        items.push(EmbeddingInput {
            id,
            kind: "show".to_string(),
            text: Some(text),
            slug: None,
            label: Some(label),
            vector: None,
        });
    }

    if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent)
            .with_context(|| format!("create output dir {}", parent.display()))?;
    }

    let file = File::create(output)
        .with_context(|| format!("write embedding input {}", output.display()))?;
    serde_json::to_writer_pretty(file, &items).context("serialize embedding input")?;
    Ok(())
}

fn build_data_manifest(source_dir: &Path, output: &Path) -> Result<()> {
    if !source_dir.exists() {
        anyhow::bail!("data dir not found: {}", source_dir.display());
    }

    let mut files: Vec<DataFile> = Vec::new();

    for entry in std::fs::read_dir(source_dir)
        .with_context(|| format!("read dir {}", source_dir.display()))?
    {
        let entry = entry?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(name) => name.to_string(),
            None => continue,
        };
        if !is_supported_data_asset(&name) {
            tracing::debug!(file = %name, "build-data-manifest: skipping unsupported file");
            continue;
        }
        let is_json =
            name.ends_with(".json") || name.ends_with(".json.gz") || name.ends_with(".json.br");
        let is_bin = name.ends_with(".bin");
        if !(is_json || is_bin) {
            continue;
        }

        let size = path.metadata()?.len();
        let checksum = checksum_file(&path)?;
        let count = if is_json && (name.ends_with(".json") || name.ends_with(".json.gz")) {
            count_json_entries(&path)?
        } else {
            None
        };

        files.push(DataFile {
            name,
            size,
            checksum,
            count,
        });
    }

    files.sort_by(|a, b| a.name.cmp(&b.name));

    let manifest = DataManifest {
        version: CORE_SCHEMA_VERSION.to_string(),
        generated_at: chrono::Utc::now().to_rfc3339(),
        files,
    };

    validate_data_manifest(&manifest)?;

    if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent)
            .with_context(|| format!("create output dir {}", parent.display()))?;
    }

    serde_json::to_writer_pretty(
        File::create(output).with_context(|| format!("write {}", output.display()))?,
        &manifest,
    )
    .context("serialize data manifest")?;

    Ok(())
}

fn write_ai_config(output_dir: &Path) -> Result<()> {
    if !output_dir.exists() {
        std::fs::create_dir_all(output_dir)
            .with_context(|| format!("create {}", output_dir.display()))?;
    }
    let output = output_dir.join("ai-config.json");
    let payload = serde_json::json!({
        "version": CORE_SCHEMA_VERSION,
        "generatedAt": chrono::Utc::now().to_rfc3339(),
        "tuning": {
            "probe_override": null,
            "target_latency_ms": 12.0,
            "last_latency_ms": null
        },
        "benchmarkHistory": [],
        "workerThresholdDefault": 35000,
        "annCapOverrideMb": null
    });
    serde_json::to_writer_pretty(
        File::create(&output).with_context(|| format!("write {}", output.display()))?,
        &payload,
    )
    .context("serialize ai config")?;
    Ok(())
}

fn idb_migration_dry_run(manifest_path: &Path, output: &Path) -> Result<()> {
    let file = File::open(manifest_path)
        .with_context(|| format!("open manifest {}", manifest_path.display()))?;
    let manifest: DataManifest = serde_json::from_reader(file).context("parse manifest")?;
    let mut totals: HashMap<String, u64> = HashMap::new();
    for file in &manifest.files {
        if let Some(count) = file.count {
            totals.insert(file.name.clone(), count);
        }
    }
    let summary = serde_json::json!({
        "generatedAt": chrono::Utc::now().to_rfc3339(),
        "manifestVersion": manifest.version,
        "fileCounts": totals,
        "note": "Dry-run report only. Use in client migration checks to compare IDB counts."
    });
    if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent).with_context(|| format!("create {}", parent.display()))?;
    }
    serde_json::to_writer_pretty(
        File::create(output).with_context(|| format!("write {}", output.display()))?,
        &summary,
    )
    .context("serialize idb migration dry run")?;
    Ok(())
}

fn validate_data_manifest(manifest: &DataManifest) -> Result<()> {
    if manifest.version.trim().is_empty() {
        anyhow::bail!("manifest version is empty");
    }
    if manifest.files.is_empty() {
        anyhow::bail!("manifest contains no files");
    }
    let mut seen = HashSet::new();
    for file in &manifest.files {
        if !seen.insert(file.name.as_str()) {
            anyhow::bail!("manifest contains duplicate file entry: {}", file.name);
        }
        if file.checksum.trim().is_empty() {
            anyhow::bail!("manifest missing checksum for {}", file.name);
        }
        if file.size == 0 {
            anyhow::bail!("manifest file size is zero for {}", file.name);
        }
        if !is_supported_data_asset(&file.name) {
            anyhow::bail!("manifest includes unsupported data asset: {}", file.name);
        }
    }

    let names: HashSet<&str> = manifest.files.iter().map(|f| f.name.as_str()).collect();
    if !names.contains("ai-config.json") {
        anyhow::bail!("manifest missing ai-config.json");
    }
    let has_embeddings = names.contains("embedding-manifest.json")
        || names
            .iter()
            .any(|name| name.starts_with("embedding-chunk-"))
        || names.contains("ann-index.json")
        || names.contains("ann-index.bin");
    if has_embeddings {
        if names
            .iter()
            .any(|name| name.starts_with("embedding-chunk-"))
            && !names.contains("embedding-manifest.json")
        {
            anyhow::bail!("manifest has embedding chunks without embedding-manifest.json");
        }
        if !names.contains("ann-index.bin") {
            anyhow::bail!("manifest missing ann-index.bin");
        }
        if !names.contains("ann-index.json") {
            anyhow::bail!("manifest missing ann-index.json");
        }
        if names.contains("ann-index.ivf.json") && !names.contains("ann-index.json") {
            anyhow::bail!("manifest has ann-index.ivf.json without ann-index.json");
        }
    }

    Ok(())
}

fn validate_embedding_manifest(path: &Path) -> Result<()> {
    let file = File::open(path).with_context(|| format!("open {}", path.display()))?;
    let manifest: EmbeddingManifest =
        serde_json::from_reader(file).context("parse embedding manifest")?;
    if manifest.version.trim().is_empty() {
        anyhow::bail!("embedding manifest version is empty");
    }
    if manifest.version != CORE_SCHEMA_VERSION {
        anyhow::bail!(
            "embedding manifest version mismatch: {} vs {}",
            manifest.version,
            CORE_SCHEMA_VERSION
        );
    }
    if manifest.dim == 0 {
        anyhow::bail!("embedding manifest dim is zero");
    }
    if manifest.chunk_count == 0 || manifest.chunks.is_empty() {
        anyhow::bail!("embedding manifest has no chunks");
    }
    if manifest.chunk_count as usize != manifest.chunks.len() {
        anyhow::bail!(
            "embedding manifest chunk_count mismatch: {} vs {}",
            manifest.chunk_count,
            manifest.chunks.len()
        );
    }
    let mut ids = HashSet::new();
    let mut files = HashSet::new();
    for chunk in &manifest.chunks {
        if chunk.file.trim().is_empty() {
            anyhow::bail!("embedding manifest chunk file is empty");
        }
        if chunk.count == 0 {
            anyhow::bail!("embedding manifest chunk {} has zero records", chunk.file);
        }
        if !ids.insert(chunk.chunk_id) {
            anyhow::bail!("embedding manifest duplicate chunk id {}", chunk.chunk_id);
        }
        if !files.insert(chunk.file.as_str()) {
            anyhow::bail!("embedding manifest duplicate chunk file {}", chunk.file);
        }
    }
    Ok(())
}

fn validate_embedding_chunks(manifest: &EmbeddingManifest, data_dir: &Path) -> Result<()> {
    for chunk in &manifest.chunks {
        let path = data_dir.join(&chunk.file);
        if !path.exists() {
            anyhow::bail!("embedding chunk file missing: {}", path.display());
        }
        let file = File::open(&path).with_context(|| format!("open {}", path.display()))?;
        let parsed: EmbeddingChunk =
            serde_json::from_reader(file).context("parse embedding chunk")?;
        if parsed.dim != manifest.dim {
            anyhow::bail!(
                "embedding chunk dim mismatch {}: {} vs {}",
                chunk.file,
                parsed.dim,
                manifest.dim
            );
        }
        if parsed.records.len() != chunk.count as usize {
            anyhow::bail!(
                "embedding chunk count mismatch {}: {} vs {}",
                chunk.file,
                parsed.records.len(),
                chunk.count
            );
        }
        if let Some(sample) = parsed.records.first() {
            if sample.vector.len() != manifest.dim as usize {
                anyhow::bail!(
                    "embedding chunk vector length mismatch {}: {} vs {}",
                    chunk.file,
                    sample.vector.len(),
                    manifest.dim
                );
            }
        }
    }
    Ok(())
}

fn validate_ann_index_files(data_dir: &Path) -> Result<()> {
    let meta_path = data_dir.join("ann-index.json");
    if !meta_path.exists() {
        return Ok(());
    }
    let file = File::open(&meta_path).with_context(|| format!("open {}", meta_path.display()))?;
    let meta: AnnIndexMeta = serde_json::from_reader(file).context("parse ann index meta")?;
    if meta.dim == 0 || meta.record_count == 0 {
        anyhow::bail!("ann index meta missing dim or record_count");
    }
    let bin_path = data_dir.join("ann-index.bin");
    if !bin_path.exists() {
        anyhow::bail!("ann index binary missing: {}", bin_path.display());
    }
    let expected = meta.record_count as u64 * meta.dim as u64 * 4;
    let actual = std::fs::metadata(&bin_path)
        .with_context(|| format!("stat {}", bin_path.display()))?
        .len();
    if actual != expected {
        anyhow::bail!("ann index binary size mismatch: {actual} vs expected {expected}");
    }

    if meta.method == "ivf-flat" {
        let ivf_file = meta
            .index_file
            .clone()
            .unwrap_or_else(|| "ann-index.ivf.json".to_string());
        let ivf_path = data_dir.join(&ivf_file);
        if !ivf_path.exists() {
            anyhow::bail!("ann ivf index missing: {}", ivf_path.display());
        }
        let file = File::open(&ivf_path).with_context(|| format!("open {}", ivf_path.display()))?;
        let ivf: AnnIvfIndex = serde_json::from_reader(file).context("parse ann ivf index")?;
        if ivf.dim != meta.dim {
            anyhow::bail!("ann ivf dim mismatch: {} vs {}", ivf.dim, meta.dim);
        }
        if ivf.cluster_count == 0 || ivf.centroids.is_empty() {
            anyhow::bail!("ann ivf has no centroids");
        }
        let total_list_entries: usize = ivf.lists.iter().map(std::vec::Vec::len).sum();
        if total_list_entries != meta.record_count as usize {
            anyhow::bail!(
                "ann ivf list size mismatch: {} vs {}",
                total_list_entries,
                meta.record_count
            );
        }
    }

    Ok(())
}

fn validate_embedding_sample(path: &Path, dim: u32) -> Result<()> {
    if !path.exists() {
        return Ok(());
    }
    let file = File::open(path).with_context(|| format!("open {}", path.display()))?;
    let entries: Vec<EmbeddingInput> =
        serde_json::from_reader(file).context("parse embedding sample")?;
    if entries.is_empty() {
        anyhow::bail!("embedding sample is empty");
    }
    for entry in entries.iter().take(5) {
        if let Some(vector) = &entry.vector {
            if vector.len() != dim as usize {
                anyhow::bail!(
                    "embedding sample vector dim mismatch: {} vs {}",
                    vector.len(),
                    dim
                );
            }
        } else if entry.text.as_ref().is_none_or(|s| s.trim().is_empty()) {
            anyhow::bail!("embedding sample missing vector or text");
        }
    }
    Ok(())
}

fn build_ann_index(input_dir: &Path, output: &Path, method: &str) -> Result<()> {
    let manifest_path = input_dir.join("embedding-manifest.json");
    let file =
        File::open(&manifest_path).with_context(|| format!("open {}", manifest_path.display()))?;
    let manifest: EmbeddingManifest =
        serde_json::from_reader(file).context("parse embedding manifest")?;

    let record_count = manifest.chunks.iter().map(|c| c.count as u64).sum::<u64>() as u32;
    let mut flat_vectors: Vec<f32> = Vec::new();

    for chunk in &manifest.chunks {
        let chunk_path = input_dir.join(&chunk.file);
        let chunk_file =
            File::open(&chunk_path).with_context(|| format!("open {}", chunk_path.display()))?;
        let payload: EmbeddingChunk =
            serde_json::from_reader(chunk_file).context("parse embedding chunk")?;
        for record in payload.records {
            flat_vectors.extend_from_slice(&record.vector);
        }
    }

    let bin_path = output.with_extension("bin");
    let bytes: &[u8] = bytemuck::cast_slice(&flat_vectors);
    std::fs::write(&bin_path, bytes).with_context(|| format!("write {}", bin_path.display()))?;

    let method = method.to_lowercase();
    let mut meta = AnnIndexMeta {
        id: "default".to_string(),
        method: method.clone(),
        dim: manifest.dim,
        record_count,
        built_at: chrono::Utc::now().to_rfc3339(),
        source_manifest: manifest_path.to_string_lossy().to_string(),
        index_file: None,
        cluster_count: None,
        probe_count: None,
    };

    if method == "ivf-flat" {
        let dim = manifest.dim as usize;
        let record_total = (flat_vectors.len() / dim).max(1);
        let (cluster_count, probe_count) = suggest_ivf_params(record_total);
        let ivf = build_ivf_index(&flat_vectors, dim, cluster_count, probe_count, 3)?;
        let ivf_path = output.with_extension("ivf.json");
        serde_json::to_writer_pretty(
            File::create(&ivf_path).with_context(|| format!("write {}", ivf_path.display()))?,
            &ivf,
        )
        .context("serialize ivf index")?;

        meta.index_file = ivf_path
            .file_name()
            .map(|name| name.to_string_lossy().to_string());
        meta.cluster_count = Some(ivf.cluster_count);
        meta.probe_count = Some(ivf.probe_count);
    }

    serde_json::to_writer_pretty(
        File::create(output).with_context(|| format!("write {}", output.display()))?,
        &meta,
    )
    .context("serialize ann index metadata")?;

    tracing::info!(
        "ann-index: wrote {} vectors to {}",
        record_count,
        bin_path.display()
    );

    Ok(())
}

fn build_ivf_index(
    vectors: &[f32],
    dim: usize,
    cluster_count: usize,
    probe_count: u32,
    iterations: usize,
) -> Result<dmb_core::AnnIvfIndex> {
    if dim == 0 || vectors.is_empty() {
        anyhow::bail!("ivf index: empty vectors");
    }
    let count = vectors.len() / dim;
    if count == 0 || !vectors.len().is_multiple_of(dim) {
        anyhow::bail!("ivf index: vector length mismatch");
    }
    let cluster_count = cluster_count.clamp(1, count);
    let mut rng = rand::thread_rng();
    let mut centroids: Vec<Vec<f32>> = (0..cluster_count)
        .map(|_| {
            let idx = rand::Rng::gen_range(&mut rng, 0..count);
            let start = idx * dim;
            let end = start + dim;
            let mut centroid = vectors[start..end].to_vec();
            dmb_core::l2_normalize(&mut centroid);
            centroid
        })
        .collect();

    let mut assignments = vec![0usize; count];
    for iter in 0..iterations.max(1) {
        let mut sums = vec![vec![0.0; dim]; cluster_count];
        let mut counts = vec![0u32; cluster_count];

        for (idx, assignment) in assignments.iter_mut().enumerate() {
            let start = idx * dim;
            let end = start + dim;
            let vector = &vectors[start..end];
            let mut best = 0usize;
            let mut best_score = f32::MIN;
            for (c_idx, centroid) in centroids.iter().enumerate() {
                let score = centroid
                    .iter()
                    .zip(vector.iter())
                    .map(|(a, b)| a * b)
                    .sum::<f32>();
                if score > best_score {
                    best_score = score;
                    best = c_idx;
                }
            }
            *assignment = best;
            counts[best] += 1;
            for d in 0..dim {
                sums[best][d] += vector[d];
            }
        }

        if iter + 1 != iterations {
            for (c_idx, centroid) in centroids.iter_mut().enumerate() {
                let count = counts[c_idx].max(1) as f32;
                for d in 0..dim {
                    centroid[d] = sums[c_idx][d] / count;
                }
                dmb_core::l2_normalize(centroid);
            }
        }
    }

    let mut lists: Vec<Vec<u32>> = vec![Vec::new(); cluster_count];
    for (idx, cluster) in assignments.iter().enumerate() {
        lists[*cluster].push(idx as u32);
    }

    Ok(dmb_core::AnnIvfIndex {
        method: "ivf-flat".to_string(),
        dim: dim as u32,
        cluster_count: cluster_count as u32,
        probe_count,
        centroids,
        lists,
    })
}

fn suggest_ivf_params(record_total: usize) -> (usize, u32) {
    let sqrt_k = (record_total as f32).sqrt().round() as usize;
    let cluster_count = if record_total < 1000 {
        sqrt_k.clamp(8, 64)
    } else if record_total < 5000 {
        sqrt_k.clamp(32, 128)
    } else {
        sqrt_k.clamp(64, 256)
    }
    .min(record_total.max(1));

    let probe_count = ((cluster_count as f32) / 8.0).ceil() as u32;
    let probe_count = probe_count.clamp(2, 16).min(cluster_count as u32);

    (cluster_count, probe_count)
}

#[cfg(test)]
mod ivf_tests {
    use super::suggest_ivf_params;

    #[test]
    fn ivf_params_within_bounds() {
        for &records in &[10usize, 250, 1200, 6200, 25000] {
            let (clusters, probes) = suggest_ivf_params(records);
            assert!(clusters >= 1);
            assert!(clusters <= records.max(1));
            assert!(probes >= 2);
            assert!(probes <= clusters as u32);
        }
    }
}

fn build_db(source: &Path, output: &Path) -> Result<()> {
    if !source.exists() {
        anyhow::bail!("source db not found: {}", source.display());
    }
    if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent)
            .with_context(|| format!("create db output dir {}", parent.display()))?;
    }
    std::fs::copy(source, output)
        .with_context(|| format!("copy {} -> {}", source.display(), output.display()))?;
    Ok(())
}

fn build_idb(source_dir: &Path, output_dir: &Path) -> Result<()> {
    if !source_dir.exists() {
        anyhow::bail!("source data dir not found: {}", source_dir.display());
    }
    std::fs::create_dir_all(output_dir)
        .with_context(|| format!("create output dir {}", output_dir.display()))?;

    let mut files: Vec<DataFile> = Vec::new();
    let mut source_files: Vec<(String, PathBuf)> = Vec::new();
    for entry in std::fs::read_dir(source_dir)
        .with_context(|| format!("read dir {}", source_dir.display()))?
    {
        let entry = entry?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(name) => name.to_string(),
            None => continue,
        };
        source_files.push((name, path));
    }
    let has_setlist_chunks = source_files
        .iter()
        .any(|(name, _)| is_setlist_chunk_asset_name(normalized_data_asset_name(name)));

    for (name, path) in source_files {
        if !is_supported_data_asset(&name) {
            tracing::debug!(file = %name, "build-idb: skipping unsupported file");
            continue;
        }

        let normalized = normalized_data_asset_name(&name);
        if normalized == SETLIST_ENTRIES_FILE {
            if has_setlist_chunks {
                tracing::info!(
                    file = %name,
                    "build-idb: skipping legacy setlist file because chunk files are present"
                );
                continue;
            }

            let setlist_rows = load_json_array(&path)?;
            let chunk_total = setlist_rows.len().max(1).div_ceil(SETLIST_CHUNK_RECORDS);
            for chunk_index in 0..chunk_total {
                let start = chunk_index * SETLIST_CHUNK_RECORDS;
                let end = (start + SETLIST_CHUNK_RECORDS).min(setlist_rows.len());
                let chunk = &setlist_rows[start..end];
                let chunk_name = format!("{SETLIST_CHUNK_PREFIX}{:04}.json", chunk_index + 1);
                let chunk_path = output_dir.join(&chunk_name);
                serde_json::to_writer_pretty(
                    File::create(&chunk_path)
                        .with_context(|| format!("write {}", chunk_path.display()))?,
                    chunk,
                )
                .with_context(|| format!("serialize {}", chunk_path.display()))?;

                files.push(DataFile {
                    name: chunk_name,
                    size: chunk_path.metadata()?.len(),
                    checksum: checksum_file(&chunk_path)?,
                    count: Some(chunk.len() as u64),
                });
            }

            continue;
        }

        let is_json =
            name.ends_with(".json") || name.ends_with(".json.gz") || name.ends_with(".json.br");
        let is_bin = name.ends_with(".bin");
        if !(is_json || is_bin) {
            continue;
        }

        let dest = output_dir.join(&name);
        std::fs::copy(&path, &dest)
            .with_context(|| format!("copy {} -> {}", path.display(), dest.display()))?;

        let size = dest.metadata()?.len();
        let checksum = checksum_file(&dest)?;
        let count = if is_json && (name.ends_with(".json") || name.ends_with(".json.gz")) {
            count_json_entries(&dest)?
        } else {
            None
        };

        files.push(DataFile {
            name,
            size,
            checksum,
            count,
        });
    }

    files.sort_by(|a, b| a.name.cmp(&b.name));

    let manifest = DataManifest {
        version: CORE_SCHEMA_VERSION.to_string(),
        generated_at: chrono::Utc::now().to_rfc3339(),
        files,
    };

    let manifest_path = output_dir.join("manifest.json");
    serde_json::to_writer_pretty(
        File::create(&manifest_path)
            .with_context(|| format!("write {}", manifest_path.display()))?,
        &manifest,
    )
    .context("serialize data manifest")?;

    Ok(())
}

fn scrape_seed_data() -> Result<()> {
    let source_dir = PathBuf::from("../data/static-data");
    let output_dir = PathBuf::from("data/raw");
    if !source_dir.exists() {
        anyhow::bail!(
            "seed data not found at {} (ensure ../data/static-data exists)",
            source_dir.display()
        );
    }
    std::fs::create_dir_all(&output_dir)
        .with_context(|| format!("create {}", output_dir.display()))?;

    for entry in
        std::fs::read_dir(&source_dir).with_context(|| format!("read {}", source_dir.display()))?
    {
        let entry = entry?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(name) => name,
            None => continue,
        };
        if !(name.ends_with(".json") || name.ends_with(".json.gz") || name.ends_with(".json.br")) {
            continue;
        }
        let dest = output_dir.join(name);
        std::fs::copy(&path, &dest)
            .with_context(|| format!("copy {} -> {}", path.display(), dest.display()))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;

    #[test]
    fn manifest_includes_bin_assets() -> Result<()> {
        let dir = tempfile::tempdir()?;
        let data_dir = dir.path().join("data");
        std::fs::create_dir_all(&data_dir)?;

        let json_path = data_dir.join("venues.json");
        std::fs::write(&json_path, "[]")?;

        let ai_config_path = data_dir.join("ai-config.json");
        std::fs::write(
            &ai_config_path,
            format!(
                "{{\"version\":\"{CORE_SCHEMA_VERSION}\",\"generatedAt\":\"2026-02-01T00:00:00Z\"}}"
            ),
        )?;

        let meta_path = data_dir.join("ann-index.json");
        std::fs::write(&meta_path, "{\"method\":\"flat\"}")?;

        let bin_path = data_dir.join("ann-index.bin");
        let mut bin = File::create(&bin_path)?;
        bin.write_all(&[1u8, 2, 3, 4])?;

        let output = dir.path().join("manifest.json");
        build_data_manifest(&data_dir, &output)?;

        let manifest_file = File::open(&output)?;
        let manifest: DataManifest = serde_json::from_reader(manifest_file)?;

        let names: Vec<_> = manifest.files.iter().map(|f| f.name.as_str()).collect();
        assert!(names.contains(&"venues.json"));
        assert!(names.contains(&"ann-index.json"));
        assert!(names.contains(&"ann-index.bin"));

        let bin_entry = manifest
            .files
            .iter()
            .find(|f| f.name == "ann-index.bin")
            .expect("ann-index.bin entry missing");
        assert!(bin_entry.count.is_none());

        Ok(())
    }

    #[test]
    fn endpoint_retry_budget_enforced() {
        let mut retries = HashMap::new();
        retries.insert("ShowSetlist.aspx".to_string(), 3);
        let err = enforce_endpoint_retries(&retries, 2).expect_err("expected retry budget error");
        assert!(
            err.to_string().contains("endpoint retry budget exceeded"),
            "unexpected error: {err}"
        );
    }

    #[test]
    fn sqlite_parity_fixture_passes_strict() -> Result<()> {
        let dir = tempfile::tempdir()?;

        let sqlite_path = dir.path().join("parity.db");
        let conn = Connection::open(&sqlite_path)?;

        // Minimal schema for parity checks: COUNT(*) must work for each table.
        let tables = [
            "venues",
            "songs",
            "tours",
            "shows",
            "setlist_entries",
            "guests",
            "guest_appearances",
            "liberation_list",
            "song_statistics",
            "releases",
            "release_tracks",
            "curated_lists",
            "curated_list_items",
        ];
        for table in tables {
            conn.execute(
                &format!("CREATE TABLE {table} (id INTEGER PRIMARY KEY)"),
                [],
            )?;
            // Insert a deterministic number of rows so the manifest mapping stays exercised.
            for id in 1..=3 {
                conn.execute(&format!("INSERT INTO {table} (id) VALUES (?1)"), [id])?;
            }
        }

        let mapping_files = [
            ("venues.json", 3),
            ("songs.json", 3),
            ("tours.json", 3),
            ("shows.json", 3),
            ("setlist-entries.json", 3),
            ("guests.json", 3),
            ("guest-appearances.json", 3),
            ("liberation-list.json", 3),
            ("song-statistics.json", 3),
            ("releases.json", 3),
            ("release-tracks.json", 3),
            ("curated-lists.json", 3),
            ("curated-list-items.json", 3),
        ];
        let files = mapping_files
            .into_iter()
            .map(|(name, count)| DataFile {
                name: name.to_string(),
                size: 0,
                checksum: "fixture".to_string(),
                count: Some(count),
            })
            .collect();
        let manifest = DataManifest {
            version: CORE_SCHEMA_VERSION.to_string(),
            generated_at: "2026-02-01T00:00:00Z".to_string(),
            files,
        };

        let manifest_path = dir.path().join("manifest.json");
        serde_json::to_writer_pretty(File::create(&manifest_path)?, &manifest)?;

        validate_sqlite_parity(&manifest_path, &sqlite_path, true, true)?;
        Ok(())
    }

    #[test]
    fn sqlite_parity_accepts_setlist_chunk_counts() -> Result<()> {
        let dir = tempfile::tempdir()?;

        let sqlite_path = dir.path().join("parity.db");
        let conn = Connection::open(&sqlite_path)?;
        let tables = [
            "venues",
            "songs",
            "tours",
            "shows",
            "setlist_entries",
            "guests",
            "guest_appearances",
            "liberation_list",
            "song_statistics",
            "releases",
            "release_tracks",
            "curated_lists",
            "curated_list_items",
        ];
        for table in tables {
            conn.execute(
                &format!("CREATE TABLE {table} (id INTEGER PRIMARY KEY)"),
                [],
            )?;
            for id in 1..=3 {
                conn.execute(&format!("INSERT INTO {table} (id) VALUES (?1)"), [id])?;
            }
        }

        let mapping_files = [
            ("venues.json", 3),
            ("songs.json", 3),
            ("tours.json", 3),
            ("shows.json", 3),
            ("setlist-entries-chunk-0001.json", 1),
            ("setlist-entries-chunk-0002.json", 2),
            ("guests.json", 3),
            ("guest-appearances.json", 3),
            ("liberation-list.json", 3),
            ("song-statistics.json", 3),
            ("releases.json", 3),
            ("release-tracks.json", 3),
            ("curated-lists.json", 3),
            ("curated-list-items.json", 3),
        ];
        let files = mapping_files
            .into_iter()
            .map(|(name, count)| DataFile {
                name: name.to_string(),
                size: 1,
                checksum: "fixture".to_string(),
                count: Some(count),
            })
            .collect();
        let manifest = DataManifest {
            version: CORE_SCHEMA_VERSION.to_string(),
            generated_at: "2026-02-01T00:00:00Z".to_string(),
            files,
        };

        let manifest_path = dir.path().join("manifest.json");
        serde_json::to_writer_pretty(File::create(&manifest_path)?, &manifest)?;

        validate_sqlite_parity(&manifest_path, &sqlite_path, true, true)?;
        Ok(())
    }

    #[test]
    fn sqlite_parity_prefers_setlist_single_file_when_chunks_also_present() -> Result<()> {
        let dir = tempfile::tempdir()?;

        let sqlite_path = dir.path().join("parity.db");
        let conn = Connection::open(&sqlite_path)?;
        let tables = [
            "venues",
            "songs",
            "tours",
            "shows",
            "setlist_entries",
            "guests",
            "guest_appearances",
            "liberation_list",
            "song_statistics",
            "releases",
            "release_tracks",
            "curated_lists",
            "curated_list_items",
        ];
        for table in tables {
            conn.execute(
                &format!("CREATE TABLE {table} (id INTEGER PRIMARY KEY)"),
                [],
            )?;
            for id in 1..=3 {
                conn.execute(&format!("INSERT INTO {table} (id) VALUES (?1)"), [id])?;
            }
        }

        let mapping_files = [
            ("venues.json", 3),
            ("songs.json", 3),
            ("tours.json", 3),
            ("shows.json", 3),
            ("setlist-entries.json", 3),
            ("setlist-entries-chunk-0001.json", 4),
            ("setlist-entries-chunk-0002.json", 5),
            ("guests.json", 3),
            ("guest-appearances.json", 3),
            ("liberation-list.json", 3),
            ("song-statistics.json", 3),
            ("releases.json", 3),
            ("release-tracks.json", 3),
            ("curated-lists.json", 3),
            ("curated-list-items.json", 3),
        ];
        let files = mapping_files
            .into_iter()
            .map(|(name, count)| DataFile {
                name: name.to_string(),
                size: 1,
                checksum: "fixture".to_string(),
                count: Some(count),
            })
            .collect();
        let manifest = DataManifest {
            version: CORE_SCHEMA_VERSION.to_string(),
            generated_at: "2026-02-01T00:00:00Z".to_string(),
            files,
        };

        let manifest_path = dir.path().join("manifest.json");
        serde_json::to_writer_pretty(File::create(&manifest_path)?, &manifest)?;

        validate_sqlite_parity(&manifest_path, &sqlite_path, true, true)?;
        Ok(())
    }
}

fn validate_data(
    strict_warnings: bool,
    endpoint_timing_max_pct: Option<u64>,
    endpoint_retry_max: Option<u64>,
) -> Result<()> {
    let normalized_dir = PathBuf::from("data/normalized");
    let rust_static_dir = PathBuf::from("static/data");
    let baseline_dir = PathBuf::from("../data/static-data");
    let data_dir = if normalized_dir.exists() {
        normalized_dir
    } else if rust_static_dir.exists() {
        rust_static_dir
    } else {
        baseline_dir.clone()
    };
    let allow_mismatch = std::env::var("DMB_VALIDATE_ALLOW_MISMATCH").ok().is_some();

    let shows = load_json_array(&data_dir.join("shows.json"))?;
    let venues = load_json_array(&data_dir.join("venues.json"))?;
    let songs = load_json_array(&data_dir.join("songs.json"))?;
    let tours = load_json_array(&data_dir.join("tours.json"))?;
    let guests = load_json_array(&data_dir.join("guests.json"))?;
    let releases = load_json_array(&data_dir.join("releases.json"))?;

    let ai_config_path = data_dir.join("ai-config.json");
    validate_ai_config(&ai_config_path)?;
    let embedding_manifest_path = data_dir.join("embedding-manifest.json");
    if embedding_manifest_path.exists() {
        validate_embedding_manifest(&embedding_manifest_path)?;
        let file = File::open(&embedding_manifest_path)
            .with_context(|| format!("open {}", embedding_manifest_path.display()))?;
        let manifest: EmbeddingManifest =
            serde_json::from_reader(file).context("parse embedding manifest")?;
        validate_embedding_chunks(&manifest, &data_dir)?;
        let sample_path = data_dir.join("embedding-sample.json");
        validate_embedding_sample(&sample_path, manifest.dim)?;
    }
    validate_ann_index_files(&data_dir)?;

    let data_manifest_path = data_dir.join("manifest.json");
    if data_manifest_path.exists() {
        let payload = std::fs::read_to_string(&data_manifest_path)
            .with_context(|| format!("read {}", data_manifest_path.display()))?;
        match serde_json::from_str::<DataManifest>(&payload) {
            Ok(manifest) => {
                validate_data_manifest(&manifest)?;
                if manifest.version != CORE_SCHEMA_VERSION {
                    anyhow::bail!(
                        "data manifest version mismatch: {} vs {}",
                        manifest.version,
                        CORE_SCHEMA_VERSION
                    );
                }
                // If a Rust-style manifest is present, we also require the client-side dry-run
                // report used for migration/integrity checks.
                let dry_run_path = data_dir.join("idb-migration-dry-run.json");
                if !dry_run_path.exists() {
                    anyhow::bail!(
                        "idb migration dry-run missing at {} (expected when manifest.json exists)",
                        dry_run_path.display()
                    );
                }
                let file = File::open(&dry_run_path)
                    .with_context(|| format!("open {}", dry_run_path.display()))?;
                let value: serde_json::Value =
                    serde_json::from_reader(file).context("parse idb migration dry run")?;
                let version = value
                    .get("manifestVersion")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                if version != CORE_SCHEMA_VERSION {
                    anyhow::bail!(
                        "idb migration dry-run manifestVersion mismatch: {version} vs {CORE_SCHEMA_VERSION}"
                    );
                }
            }
            Err(err) => {
                tracing::warn!(
                    error = ?err,
                    "manifest.json is not in rust pipeline format; skipping strict checks"
                );
            }
        }
    }

    let venue_ids = collect_ids(&venues, "id");
    let tour_ids = collect_ids(&tours, "id");
    let song_ids = collect_ids(&songs, "id");

    ensure_unique(&shows, "id", "shows")?;
    ensure_unique(&venues, "id", "venues")?;
    ensure_unique(&songs, "id", "songs")?;
    ensure_unique(&tours, "id", "tours")?;
    ensure_unique(&guests, "id", "guests")?;
    ensure_unique(&releases, "id", "releases")?;
    ensure_required_fields(&shows, &["id", "date", "venueId"], "shows")?;
    ensure_required_fields(&venues, &["id", "name"], "venues")?;
    ensure_required_fields(&songs, &["id", "title"], "songs")?;
    ensure_required_fields(&tours, &["id", "year", "name"], "tours")?;
    ensure_required_fields(&guests, &["id", "name"], "guests")?;
    ensure_required_fields(&releases, &["id", "title"], "releases")?;

    // FK-like checks
    for item in &shows {
        let venue_id = item.get("venueId").and_then(serde_json::Value::as_i64);
        if let Some(venue_id) = venue_id {
            if !venue_ids.contains(&(venue_id as i32)) {
                anyhow::bail!("show references missing venue_id={venue_id}");
            }
        }
        let tour_id = item.get("tourId").and_then(serde_json::Value::as_i64);
        if let Some(tour_id) = tour_id {
            if !tour_ids.contains(&(tour_id as i32)) {
                anyhow::bail!("show references missing tour_id={tour_id}");
            }
        }
    }

    // setlist entries optional (accept either single file or chunked files)
    let setlist_path = data_dir.join(SETLIST_ENTRIES_FILE);
    let setlist = if setlist_path.exists() {
        load_json_array(&setlist_path)?
    } else {
        let mut chunk_paths = std::fs::read_dir(&data_dir)
            .with_context(|| format!("read dir {}", data_dir.display()))?
            .filter_map(std::result::Result::ok)
            .filter_map(|entry| {
                let path = entry.path();
                if !path.is_file() {
                    return None;
                }
                let name = path.file_name()?.to_str()?.to_string();
                if is_setlist_chunk_asset_name(normalized_data_asset_name(&name)) {
                    Some((name, path))
                } else {
                    None
                }
            })
            .collect::<Vec<_>>();
        chunk_paths.sort_by(|a, b| a.0.cmp(&b.0));

        let mut merged = Vec::new();
        for (_, chunk_path) in chunk_paths {
            merged.extend(load_json_array(&chunk_path)?);
        }
        merged
    };
    if !setlist.is_empty() {
        ensure_unique(&setlist, "id", "setlistEntries")?;
        ensure_required_fields(
            &setlist,
            &["id", "showId", "songId", "position"],
            "setlistEntries",
        )?;
        for item in &setlist {
            if let Some(song_id) = item.get("songId").and_then(serde_json::Value::as_i64) {
                if !song_ids.contains(&(song_id as i32)) {
                    anyhow::bail!("setlist references missing song_id={song_id}");
                }
            }
        }
    }

    if data_dir != baseline_dir && baseline_dir.exists() {
        compare_counts(
            &data_dir.join("shows.json"),
            &baseline_dir.join("shows.json"),
            "shows",
            allow_mismatch,
        )?;
        compare_counts(
            &data_dir.join("venues.json"),
            &baseline_dir.join("venues.json"),
            "venues",
            allow_mismatch,
        )?;
        compare_counts(
            &data_dir.join("songs.json"),
            &baseline_dir.join("songs.json"),
            "songs",
            allow_mismatch,
        )?;
        compare_counts(
            &data_dir.join("tours.json"),
            &baseline_dir.join("tours.json"),
            "tours",
            allow_mismatch,
        )?;
        compare_counts(
            &data_dir.join("guests.json"),
            &baseline_dir.join("guests.json"),
            "guests",
            allow_mismatch,
        )?;
        compare_counts(
            &data_dir.join("releases.json"),
            &baseline_dir.join("releases.json"),
            "releases",
            allow_mismatch,
        )?;
    }

    let mut warning_summary = None;
    let mut current_warning_report = None;
    if let Ok(report_path) = std::env::var("DMB_VALIDATE_WARNING_REPORT") {
        let report = read_warning_report(Path::new(&report_path))?;
        warning_summary = Some((report.empty, report.missing, report_path.clone()));
        current_warning_report = Some(report);
        let max_empty = env_u64_or_warn("DMB_WARNING_MAX_EMPTY").unwrap_or(0);
        let max_missing = env_u64_or_warn("DMB_WARNING_MAX_MISSING").unwrap_or(0);
        if let Some(report) = current_warning_report.as_ref() {
            if report.empty > max_empty || report.missing > max_missing {
                anyhow::bail!(
                    "warning report exceeded thresholds: emptySelectors={} (max {}), missingFields={} (max {})",
                    report.empty,
                    max_empty,
                    report.missing,
                    max_missing
                );
            }
        }
    }

    if let Some(current) = current_warning_report.as_ref() {
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
            {
                if let (Some(current_sig), Some(baseline_sig)) =
                    (current.signature.as_ref(), baseline.signature.as_ref())
                {
                    if current_sig != baseline_sig {
                        anyhow::bail!("warning signature changed: {current_sig} != {baseline_sig}");
                    }
                }
            }
        }
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
    }

    tracing::info!(
        "validate: shows={}, songs={}, venues={}, tours={}, guests={}, releases={}",
        shows.len(),
        songs.len(),
        venues.len(),
        tours.len(),
        guests.len(),
        releases.len()
    );
    if let Some((empty, missing, path)) = warning_summary {
        tracing::info!(
            "validate warnings: emptySelectors={}, missingFields={} (report: {})",
            empty,
            missing,
            path
        );
        if strict_warnings && (empty + missing) > 0 {
            anyhow::bail!(
                "strict warnings enabled: {empty} empty selectors, {missing} missing fields"
            );
        }
    }

    if let Some(current) = current_warning_report.as_ref() {
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
                anyhow::bail!(
                    "venue stats missing show history: venue_stats.shows warnings={missing}"
                );
            }
        }
    }
    if let Ok(report_path) = std::env::var("DMB_VALIDATE_WARNING_REPORT") {
        tracing::info!("validate warning report path: {}", report_path);
    }

    // Cross-file consistency: song stats total plays vs. performances length.
    let song_stats_path = data_dir.join("song-stats.json");
    if song_stats_path.exists() {
        let song_stats = load_json_array(&song_stats_path)?;
        for stat in &song_stats {
            let total = stat.get("totalPlays").and_then(serde_json::Value::as_i64);
            let performances_len = stat
                .get("performances")
                .and_then(|v| v.as_array())
                .map(|v| v.len() as i64);
            if let (Some(total), Some(len)) = (total, performances_len) {
                if total != len {
                    anyhow::bail!(
                        "song stats mismatch: id={:?} totalPlays={} performances={}",
                        stat.get("songId").or_else(|| stat.get("id")),
                        total,
                        len
                    );
                }
            }
        }
    }

    // Cross-file consistency: venue stats total shows vs shows per venue.
    let venue_stats_path = data_dir.join("venue-stats.json");
    if venue_stats_path.exists() {
        let venue_stats = load_json_array(&venue_stats_path)?;
        let mut show_counts: HashMap<i32, i64> = HashMap::new();
        for show in &shows {
            if let Some(venue_id) = show.get("venueId").and_then(serde_json::Value::as_i64) {
                *show_counts.entry(venue_id as i32).or_insert(0) += 1;
            }
        }
        for stat in &venue_stats {
            let venue_id = stat
                .get("originalId")
                .or_else(|| stat.get("venueId"))
                .and_then(serde_json::Value::as_i64);
            let total_shows = stat.get("totalShows").and_then(serde_json::Value::as_i64);
            if let (Some(venue_id), Some(total_shows)) = (venue_id, total_shows) {
                let count = show_counts.get(&(venue_id as i32)).copied().unwrap_or(0);
                if count != total_shows && !allow_mismatch {
                    anyhow::bail!(
                        "venue stats mismatch: venue_id={venue_id} totalShows={total_shows} shows={count}"
                    );
                }
            }
        }
    }

    Ok(())
}

fn validate_ai_config(path: &Path) -> Result<()> {
    if !path.exists() {
        anyhow::bail!("ai-config missing at {}", path.display());
    }
    let file = File::open(path).with_context(|| format!("open {}", path.display()))?;
    let value: serde_json::Value = serde_json::from_reader(file).context("parse ai-config.json")?;
    let version = value.get("version").and_then(|v| v.as_str()).unwrap_or("");
    let generated_at = value
        .get("generatedAt")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if version.is_empty() || generated_at.is_empty() {
        anyhow::bail!("ai-config missing required keys (version/generatedAt)");
    }
    if version != CORE_SCHEMA_VERSION {
        anyhow::bail!("ai-config version mismatch: {version} vs {CORE_SCHEMA_VERSION}");
    }
    if chrono::DateTime::parse_from_rfc3339(generated_at).is_err() {
        anyhow::bail!("ai-config generatedAt is not RFC3339");
    }
    if let Some(worker_threshold) = value
        .get("workerThresholdDefault")
        .and_then(serde_json::Value::as_u64)
    {
        if !(5_000..=1_000_000).contains(&worker_threshold) {
            anyhow::bail!("ai-config workerThresholdDefault out of range");
        }
    }
    if let Some(override_mb) = value
        .get("annCapOverrideMb")
        .and_then(serde_json::Value::as_u64)
    {
        if !(128..=2048).contains(&override_mb) {
            anyhow::bail!("ai-config annCapOverrideMb out of range");
        }
    }
    if let Some(tuning) = value.get("tuning") {
        if let Some(last) = tuning
            .get("last_latency_ms")
            .and_then(serde_json::Value::as_f64)
        {
            if last < 0.0 {
                anyhow::bail!("ai-config last_latency_ms is negative");
            }
        }
        if let Some(target) = tuning
            .get("target_latency_ms")
            .and_then(serde_json::Value::as_f64)
        {
            if !(1.0..=100.0).contains(&target) {
                anyhow::bail!("ai-config target_latency_ms out of range");
            }
        }
        if let Some(probe) = tuning
            .get("probe_override")
            .and_then(serde_json::Value::as_u64)
        {
            if probe == 0 {
                anyhow::bail!("ai-config probe_override must be >= 1");
            }
        }
    }
    Ok(())
}
