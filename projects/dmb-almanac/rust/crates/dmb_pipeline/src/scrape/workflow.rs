use anyhow::{Context, Result, bail};
use std::fs;
use std::path::{Path, PathBuf};

use super::{
    ScrapeClient, ScrapeConfig, log_scrape_http_summary, log_scrape_warning_summary,
    scrape_guest_shows, scrape_guests, scrape_history, scrape_liberation, scrape_lists,
    scrape_rarity, scrape_releases, scrape_shows, scrape_songs, scrape_tours, scrape_venues,
    write_warning_artifacts,
};

#[path = "workflow_checks.rs"]
mod workflow_checks;
#[path = "workflow_support.rs"]
mod workflow_support;

use self::workflow_support::{scrape_song_stats, scrape_venue_stats, write_json_if};

pub(super) fn scrape_live(config: ScrapeConfig) -> Result<()> {
    let output_enabled = !config.dry_run;
    if output_enabled {
        fs::create_dir_all(&config.output_dir)
            .with_context(|| format!("create {}", config.output_dir.display()))?;
    }
    fs::create_dir_all(&config.cache_dir)
        .with_context(|| format!("create {}", config.cache_dir.display()))?;

    let client = ScrapeClient::new(
        config.cache_dir,
        config.min_delay_ms,
        config.max_delay_ms,
        config.max_retries_override.unwrap_or(config.max_retries),
        config.endpoint_retry_max,
        config.dry_run,
        config.cache_ttl_days,
    )?;
    client.prune_cache()?;

    let venues = scrape_venues(&client)?;
    let mut venues = venues;
    apply_max_items(&mut venues, config.max_items);
    write_json_if(
        &config.output_dir.join("venues.json"),
        &venues,
        output_enabled,
    )?;
    tracing::info!(context = "venues", count = venues.len(), "scrape items");

    let songs = scrape_songs(&client)?;
    let mut songs = songs;
    apply_max_items(&mut songs, config.max_items);
    write_json_if(
        &config.output_dir.join("songs.json"),
        &songs,
        output_enabled,
    )?;
    tracing::info!(context = "songs", count = songs.len(), "scrape items");

    let guests = scrape_guests(&client)?;
    let mut guests = guests;
    apply_max_items(&mut guests, config.max_items);
    write_json_if(
        &config.output_dir.join("guests.json"),
        &guests,
        output_enabled,
    )?;
    tracing::info!(context = "guests", count = guests.len(), "scrape items");

    let (tours, show_urls) = scrape_tours(&client, config.year)?;
    let mut tours = tours;
    apply_max_items(&mut tours, config.max_items);
    let mut show_urls = show_urls;
    if let Some(limit) = config.max_items {
        for urls in show_urls.values_mut() {
            if urls.len() > limit {
                urls.truncate(limit);
            }
        }
    }
    write_json_if(
        &config.output_dir.join("tours.json"),
        &tours,
        output_enabled,
    )?;
    tracing::info!(context = "tours", count = tours.len(), "scrape items");

    let shows = scrape_shows(&client, &show_urls)?;
    let mut shows = shows;
    apply_max_items(&mut shows, config.max_items);
    write_json_if(
        &config.output_dir.join("shows.json"),
        &shows,
        output_enabled,
    )?;
    tracing::info!(context = "shows", count = shows.len(), "scrape items");

    let releases = scrape_releases(&client)?;
    let mut releases = releases;
    apply_max_items(&mut releases, config.max_items);
    write_json_if(
        &config.output_dir.join("releases.json"),
        &releases,
        output_enabled,
    )?;
    tracing::info!(context = "releases", count = releases.len(), "scrape items");

    if config.full {
        let venue_stats = scrape_venue_stats(&client, &shows)?;
        let mut venue_stats = venue_stats;
        apply_max_items(&mut venue_stats, config.max_items);
        write_json_if(
            &config.output_dir.join("venue-stats.json"),
            &venue_stats,
            output_enabled,
        )?;
        tracing::info!(
            context = "venue_stats",
            count = venue_stats.len(),
            "scrape items"
        );

        let guest_shows = scrape_guest_shows(&client, &guests)?;
        let mut guest_shows = guest_shows;
        apply_max_items(&mut guest_shows, config.max_items);
        write_json_if(
            &config.output_dir.join("guest-shows.json"),
            &guest_shows,
            output_enabled,
        )?;
        tracing::info!(
            context = "guest_shows",
            count = guest_shows.len(),
            "scrape items"
        );

        let song_stats = scrape_song_stats(&client, &songs)?;
        let mut song_stats = song_stats;
        apply_max_items(&mut song_stats, config.max_items);
        write_json_if(
            &config.output_dir.join("song-stats.json"),
            &song_stats,
            output_enabled,
        )?;
        tracing::info!(
            context = "song_stats",
            count = song_stats.len(),
            "scrape items"
        );

        let liberation = scrape_liberation(&client)?;
        let mut liberation = liberation;
        apply_max_items(&mut liberation, config.max_items);
        write_json_if(
            &config.output_dir.join("liberation.json"),
            &liberation,
            output_enabled,
        )?;
        tracing::info!(
            context = "liberation",
            count = liberation.len(),
            "scrape items"
        );

        let rarity = scrape_rarity(&client)?;
        let mut rarity = rarity;
        apply_max_items(&mut rarity, config.max_items);
        write_json_if(
            &config.output_dir.join("rarity.json"),
            &rarity,
            output_enabled,
        )?;
        tracing::info!(context = "rarity", count = rarity.len(), "scrape items");

        let history = scrape_history(&client)?;
        let mut history = history;
        apply_max_items(&mut history, config.max_items);
        write_json_if(
            &config.output_dir.join("history.json"),
            &history,
            output_enabled,
        )?;
        tracing::info!(context = "history", count = history.len(), "scrape items");

        let lists = scrape_lists(&client)?;
        let mut lists = lists;
        apply_max_items(&mut lists, config.max_items);
        write_json_if(
            &config.output_dir.join("lists.json"),
            &lists,
            output_enabled,
        )?;
        tracing::info!(context = "lists", count = lists.len(), "scrape items");
    }

    let (empty, missing) = log_scrape_warning_summary();
    log_scrape_http_summary();
    if let Some(path) = &config.warnings_output {
        write_warning_artifacts(path, empty, missing, config.warnings_jsonl.as_deref())?;
    }
    let total_warnings = empty + missing;
    if config.fail_on_warning && total_warnings > 0 {
        bail!("scrape warnings detected: {empty} empty selectors, {missing} missing fields");
    }
    if config.strict && !config.warn_only && total_warnings > 0 {
        bail!("scrape strict mode failed: {empty} empty selectors, {missing} missing fields");
    }
    if let Some(max_allowed) = config.warnings_max {
        if config.warn_only {
            return Ok(());
        }
        let total = empty + missing;
        if total > max_allowed {
            bail!("scrape warning budget exceeded: {total} warnings (max {max_allowed})");
        }
    }
    Ok(())
}

pub(super) fn scrape_fixtures(
    fixtures_dir: &Path,
    warnings_output: Option<PathBuf>,
    warnings_max: Option<usize>,
    warnings_jsonl: Option<PathBuf>,
    fail_on_warning: bool,
) -> Result<()> {
    workflow_checks::scrape_fixtures(
        fixtures_dir,
        warnings_output,
        warnings_max,
        warnings_jsonl,
        fail_on_warning,
    )
}

pub(super) fn scrape_smoke(config: ScrapeConfig) -> Result<()> {
    workflow_checks::scrape_smoke(config)
}

pub(super) fn apply_max_items<T>(items: &mut Vec<T>, limit: Option<usize>) {
    workflow_support::apply_max_items(items, limit);
}
