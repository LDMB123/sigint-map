use anyhow::Result;
use dmb_core::Venue;
use scraper::Html;
use std::collections::HashSet;

use super::{
    BASE_URL, ScrapeClient, build_search_text, guess_venue_type, parse_i32_or_warn, parse_location,
    regex, select_first_text, selector_or_warn, warn_if_empty, warn_missing_field,
};

pub(super) fn scrape_venues(client: &ScrapeClient) -> Result<Vec<Venue>> {
    let url = format!("{BASE_URL}/VenueStats.aspx");
    let html = client.fetch_html(&url)?;
    let document = Html::parse_document(&html);
    let Some(selector) = selector_or_warn(
        "venue link selector",
        "a[href*='VenueStats.aspx'][href*='vid=']",
    ) else {
        return Ok(Vec::new());
    };
    warn_if_empty(&document, &selector, "venues", "list_link");
    let mut urls = Vec::new();
    let mut seen = HashSet::new();

    for element in document.select(&selector) {
        if let Some(href) = element.value().attr("href") {
            let full = if href.starts_with("http") {
                href.to_string()
            } else if href.starts_with('/') {
                format!("{BASE_URL}{href}")
            } else {
                format!("{BASE_URL}/{href}")
            };
            if seen.insert(full.clone()) {
                urls.push(full);
            }
        }
    }
    if urls.is_empty() {
        tracing::warn!("scrape_venues: no venue links found");
        warn_missing_field("venues", "links");
    }

    let mut venues = Vec::new();
    for venue_url in urls {
        if let Some(venue) = parse_venue_page(client, &venue_url)? {
            venues.push(venue);
        }
    }
    if venues.is_empty() {
        warn_missing_field("venues", "list");
    }
    Ok(venues)
}

fn parse_venue_page(client: &ScrapeClient, url: &str) -> Result<Option<Venue>> {
    let html = client.fetch_html(url)?;
    parse_venue_page_html(&html, url)
}

pub(super) fn parse_venue_page_html(html: &str, url: &str) -> Result<Option<Venue>> {
    let document = Html::parse_document(html);

    let vid = regex(r"vid=(\d+)");
    let id = parse_i32_or_warn(
        vid.captures(url)
            .and_then(|cap| cap.get(1).map(|m| m.as_str())),
        "venue",
        "id",
    );

    let name = select_first_text(
        &document,
        &["h1", "h2", ".venue-name", ".page-title", "#venue-name"],
    );
    if name.is_empty() {
        warn_missing_field("venue", "name");
        return Ok(None);
    }
    if id == 0 {
        warn_missing_field("venue", "id");
    }

    let location_text = select_first_text(
        &document,
        &[
            ".venue-location",
            ".location",
            ".venue-city",
            ".city-state",
            "[itemprop='address']",
        ],
    );
    let body_text = document.root_element().text().collect::<Vec<_>>().join(" ");

    let (city, state, country) = parse_location(&location_text)
        .or_else(|| parse_location(&body_text))
        .unwrap_or_else(|| {
            warn_missing_field("venue", "location");
            (String::new(), None, "USA".to_string())
        });
    if city.is_empty() {
        warn_missing_field("venue", "city");
    }

    let venue_type = guess_venue_type(&name, &body_text);

    let total_shows = regex(r"Total Shows?:\s*(\d+)")
        .captures(&body_text)
        .and_then(|cap| cap.get(1).map(|m| m.as_str()))
        .and_then(|raw| {
            let value = parse_i32_or_warn(Some(raw), "venue", "totalShows");
            (value > 0).then_some(value)
        });

    let country_code =
        if country.eq_ignore_ascii_case("usa") || country.eq_ignore_ascii_case("united states") {
            Some("US".to_string())
        } else {
            None
        };

    let search_text = build_search_text(&[&name, &city, state.as_deref().unwrap_or(""), &country]);

    Ok(Some(Venue {
        id,
        name,
        city,
        state,
        country,
        country_code,
        venue_type,
        total_shows,
        search_text: Some(search_text),
    }))
}
