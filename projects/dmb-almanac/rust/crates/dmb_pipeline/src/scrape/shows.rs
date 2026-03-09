use anyhow::Result;
use dmb_core::Show;
use scraper::Html;
use std::collections::HashMap;

use super::{
    parse_i32_or_warn, parse_show_date, regex, selector_or_warn, warn_if_empty,
    warn_if_no_selector_match, warn_if_out_of_range, warn_missing_field, ScrapeClient,
};

pub(super) fn scrape_shows(
    client: &ScrapeClient,
    show_urls_by_year: &HashMap<i32, Vec<String>>,
) -> Result<Vec<Show>> {
    let mut shows = Vec::new();
    for (year, urls) in show_urls_by_year {
        for show_url in urls {
            if let Some(show) = parse_show_page(client, show_url, *year)? {
                shows.push(show);
            }
        }
    }
    if shows.is_empty() {
        warn_missing_field("shows", "list");
    }
    Ok(shows)
}

fn parse_show_page(client: &ScrapeClient, url: &str, tour_year: i32) -> Result<Option<Show>> {
    let html = client.fetch_html(url)?;
    let document = Html::parse_document(&html);

    let show_id = regex(r"id=(\d+)");
    let id = parse_i32_or_warn(
        show_id
            .captures(url)
            .and_then(|cap| cap.get(1).map(|m| m.as_str())),
        "show",
        "id",
    );

    warn_if_no_selector_match(
        &document,
        "show",
        "dateSelector",
        &["select option:selected", ".show-date", "h1", "h2"],
    );
    let date = extract_show_date_with_body(&document);
    if date.is_none() {
        warn_missing_field("show", "date");
    }
    let date = date.unwrap_or_else(|| format!("{tour_year}-01-01"));
    let year = date
        .get(0..4)
        .and_then(|s| s.parse::<i32>().ok())
        .unwrap_or_else(|| {
            warn_missing_field("show", "year");
            tour_year
        });

    let (venue_id, song_count) = extract_show_meta(&document);
    if venue_id == 0 {
        warn_missing_field("show", "venueId");
        return Ok(None);
    }

    Ok(Some(Show {
        id,
        date,
        venue_id,
        tour_id: Some(tour_year),
        year,
        song_count,
        rarity_index: None,
    }))
}

pub(super) fn extract_show_meta(document: &Html) -> (i32, Option<i32>) {
    let mut venue_id = 0;
    let mut venue_id_missing = false;
    warn_if_no_selector_match(
        document,
        "show",
        "venueLinkSelector",
        &["a[href*='VenueStats.aspx']", "a[href*='VenueStats']"],
    );
    if let Some(selector) =
        selector_or_warn("show venue link selector", "a[href*='VenueStats.aspx']")
    {
        warn_if_empty(document, &selector, "show", "venue_link");
        if let Some(link) = document.select(&selector).next() {
            if let Some(href) = link.value().attr("href") {
                if let Some(caps) = regex(r"vid=(\d+)").captures(href) {
                    if let Some(m) = caps.get(1) {
                        venue_id = match m.as_str().parse::<i32>() {
                            Ok(value) => value,
                            Err(err) => {
                                tracing::warn!(
                                    context = "show",
                                    field = "venueId",
                                    value = m.as_str(),
                                    error = ?err,
                                    "failed to parse venue id"
                                );
                                venue_id_missing = true;
                                0
                            }
                        };
                    }
                } else {
                    venue_id_missing = true;
                }
            } else {
                warn_missing_field("show", "venueHref");
                venue_id_missing = true;
            }
        }
    }
    if venue_id == 0 {
        venue_id_missing = true;
    }
    if venue_id_missing {
        warn_missing_field("show", "venueId");
    }

    let mut song_count: i32 = 0;
    if let Some(selector) = selector_or_warn("set table rows", "#SetTable tr") {
        warn_if_empty(document, &selector, "show", "set_rows");
        let link_selector = selector_or_warn(
            "set header song link selector",
            "td.setheadercell a[href*='SongStats'], td.setheadercell a[href*='songs/summary']",
        );
        if link_selector.is_none() {
            warn_missing_field("show", "songCount");
        }
        for row in document.select(&selector) {
            if let Some(link_selector) = link_selector.as_ref() {
                if row.select(link_selector).next().is_some() {
                    song_count += 1;
                }
            }
        }
        if song_count == 0 {
            warn_missing_field("show", "songCount");
        }
    }
    if song_count > 0 {
        warn_if_out_of_range("show", "songCount", i64::from(song_count), 1, 60);
    }

    (
        venue_id,
        if song_count > 0 {
            Some(song_count)
        } else {
            None
        },
    )
}

fn extract_show_date(document: &Html) -> Option<String> {
    if let Some(selector) = selector_or_warn("selected option selector", "select option:selected") {
        warn_if_empty(document, &selector, "show", "date_select");
        for element in document.select(&selector) {
            let text = element.text().collect::<String>();
            if let Some(parsed) = parse_show_date(&text) {
                return Some(parsed);
            }
        }
    }
    if let Some(selector) = selector_or_warn("show date selector", ".show-date, h1, h2") {
        warn_if_empty(document, &selector, "show", "date_text");
        if let Some(element) = document.select(&selector).next() {
            let text = element.text().collect::<String>();
            if let Some(parsed) = parse_show_date(&text) {
                return Some(parsed);
            }
        }
    }
    None
}

pub(super) fn extract_show_date_with_body(document: &Html) -> Option<String> {
    if let Some(date) = extract_show_date(document) {
        return Some(date);
    }
    let body_text = document.root_element().text().collect::<Vec<_>>().join(" ");
    if let Some(parsed) = parse_show_date(&body_text) {
        return Some(parsed);
    }
    None
}
