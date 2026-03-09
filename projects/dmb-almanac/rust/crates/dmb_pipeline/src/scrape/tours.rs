use anyhow::Result;
use chrono::Datelike;
use dmb_core::Tour;
use scraper::Html;
use std::collections::{HashMap, HashSet};

use super::{BASE_URL, ScrapeClient, selector_or_warn, warn_if_empty, warn_missing_field};

pub(super) type ToursWithShows = (Vec<Tour>, HashMap<i32, Vec<String>>);

pub(super) fn scrape_tours(
    client: &ScrapeClient,
    year_filter: Option<i32>,
) -> Result<ToursWithShows> {
    let current_year = chrono::Utc::now().year();
    let start_year = 1991;
    let mut tours = Vec::new();
    let mut show_urls_by_year = HashMap::new();

    let years: Vec<i32> = if let Some(year) = year_filter {
        vec![year]
    } else {
        (start_year..=current_year).collect()
    };

    for year in years {
        let urls = get_show_urls_for_year(client, year)?;
        if urls.is_empty() {
            warn_missing_field("tour", "shows");
        }
        show_urls_by_year.insert(year, urls.clone());
        tours.push(Tour {
            id: year,
            year,
            name: format!("{year} Tour"),
            total_shows: Some(i32::try_from(urls.len()).unwrap_or(i32::MAX)),
            search_text: Some(format!("{year} tour")),
        });
    }

    if tours.is_empty() {
        warn_missing_field("tours", "list");
    }
    Ok((tours, show_urls_by_year))
}

fn get_show_urls_for_year(client: &ScrapeClient, year: i32) -> Result<Vec<String>> {
    let url = format!("{BASE_URL}/TourShow.aspx?where={year}");
    let html = client.fetch_html(&url)?;
    let document = Html::parse_document(&html);
    let Some(selector) = selector_or_warn(
        "show link selector",
        "a[href*='TourShowSet.aspx'][href*='id=']",
    ) else {
        return Ok(Vec::new());
    };
    warn_if_empty(&document, &selector, "tour", "show_links");
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
        tracing::warn!(
            "get_show_urls_for_year: no show links found for year {}",
            year
        );
        warn_missing_field("tour", "showUrls");
    }
    Ok(urls)
}
