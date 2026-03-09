use anyhow::{bail, Context, Result};
use scraper::Html;
use std::fs;
use std::path::{Path, PathBuf};

use super::super::{
    log_scrape_http_summary, log_scrape_warning_summary, parse_guest_shows_page, parse_lists_page,
    parse_song_liberations, parse_song_performances, parse_song_stats_page,
    parse_venue_show_history, parse_venue_stats_page, selector_or_warn, warn_if_empty,
    write_warning_artifacts, ScrapeClient, ScrapeConfig, BASE_URL,
};

pub(super) fn scrape_fixtures(
    fixtures_dir: &Path,
    warnings_output: Option<PathBuf>,
    warnings_max: Option<usize>,
    warnings_jsonl: Option<PathBuf>,
    fail_on_warning: bool,
) -> Result<()> {
    let song_stats = fs::read_to_string(fixtures_dir.join("song_stats.html"))
        .with_context(|| "read song_stats fixture")?;
    let venue_stats = fs::read_to_string(fixtures_dir.join("venue_stats.html"))
        .with_context(|| "read venue_stats fixture")?;
    let guest_shows = fs::read_to_string(fixtures_dir.join("guest_shows.html"))
        .with_context(|| "read guest_shows fixture")?;
    let liberations = fs::read_to_string(fixtures_dir.join("liberations.html"))
        .with_context(|| "read liberations fixture")?;
    let venue_history = fs::read_to_string(fixtures_dir.join("venue_show_history.html"))
        .with_context(|| "read venue_show_history fixture")?;
    let song_performances = fs::read_to_string(fixtures_dir.join("song_performances.html"))
        .with_context(|| "read song_performances fixture")?;
    let lists = fs::read_to_string(fixtures_dir.join("lists.html"))
        .with_context(|| "read lists fixture")?;

    let _ = parse_song_stats_page(&song_stats, 1, "Fixture Song");
    let _ = parse_venue_stats_page(&venue_stats, 1);
    let _ = parse_guest_shows_page(&guest_shows, 1, "Fixture Guest");
    let document = Html::parse_document(&liberations);
    let _ = parse_song_liberations(&document);
    let document = Html::parse_document(&venue_history);
    let _ = parse_venue_show_history(&document);
    let document = Html::parse_document(&song_performances);
    let _ = parse_song_performances(&document);
    let _ = parse_lists_page(&lists);

    let (empty, missing) = log_scrape_warning_summary();
    if let Some(path) = warnings_output.as_ref() {
        write_warning_artifacts(path, empty, missing, warnings_jsonl.as_deref())?;
    }
    if fail_on_warning && (empty + missing) > 0 {
        bail!("fixture warnings detected: {empty} empty selectors, {missing} missing fields");
    }
    if let Some(max_allowed) = warnings_max {
        let total = empty + missing;
        if total > max_allowed {
            bail!("fixture warning budget exceeded: {total} warnings (max {max_allowed})");
        }
    }
    Ok(())
}

pub(super) fn scrape_smoke(config: ScrapeConfig) -> Result<()> {
    let client = ScrapeClient::new(
        config.cache_dir.clone(),
        config.min_delay_ms,
        config.max_delay_ms,
        config.max_retries_override.unwrap_or(config.max_retries),
        config.endpoint_retry_max,
        config.dry_run,
        config.cache_ttl_days,
    )?;
    client.prune_cache()?;

    let checks = vec![
        (
            format!("{BASE_URL}/SongList.aspx"),
            "a[href*='SongStats.aspx'][href*='sid=']",
            "smoke.songs",
            "song_link",
        ),
        (
            format!("{BASE_URL}/VenueList.aspx"),
            "a[href*='VenueStats.aspx'][href*='vid=']",
            "smoke.venues",
            "venue_link",
        ),
        (
            format!("{BASE_URL}/GuestList.aspx"),
            "a[href*='GuestStats.aspx'][href*='gid=']",
            "smoke.guests",
            "guest_link",
        ),
        (
            format!("{BASE_URL}/TourShow.aspx?where=2024"),
            "a[href*='TourShowSet.aspx'][href*='id=']",
            "smoke.tours",
            "show_link",
        ),
        (
            format!("{BASE_URL}/DiscographyList.aspx"),
            "a[href*='ReleaseView.aspx']",
            "smoke.releases",
            "release_link",
        ),
        (
            format!("{BASE_URL}/Lists.aspx"),
            "a[href*='ListView.aspx']",
            "smoke.lists",
            "list_link",
        ),
        (
            format!("{BASE_URL}/Liberation.aspx"),
            "table.liberation-list tbody tr",
            "smoke.liberation",
            "row",
        ),
        (
            format!("{BASE_URL}/ShowRarity.aspx"),
            "table tr",
            "smoke.rarity",
            "row",
        ),
        (
            format!("{BASE_URL}/ThisDayinHistory.aspx?month=1&day=1"),
            "a[href*='TourShowSet.aspx'][href*='id=']",
            "smoke.history",
            "show_link",
        ),
    ];

    for (url, selector, context, label) in checks {
        let html = client.fetch_html(&url)?;
        let document = Html::parse_document(&html);
        if let Some(sel) = selector_or_warn(context, selector) {
            warn_if_empty(&document, &sel, context, label);
        }
    }

    let (empty, missing) = log_scrape_warning_summary();
    log_scrape_http_summary();
    if let Some(path) = &config.warnings_output {
        write_warning_artifacts(path, empty, missing, config.warnings_jsonl.as_deref())?;
    }
    if let Some(max_allowed) = config.warnings_max {
        let total = empty + missing;
        if total > max_allowed {
            bail!("scrape warning budget exceeded: {total} warnings (max {max_allowed})");
        }
    }
    Ok(())
}
