use anyhow::Result;
use dmb_core::Release;
use scraper::Html;
use std::collections::HashSet;

use super::{
    BASE_URL, ScrapeClient, detect_release_type, normalize_whitespace, parse_date, regex,
    select_first_text_with_fallback, selector_or_warn, slugify, stable_id_from_string,
    warn_if_empty, warn_if_no_selector_match, warn_missing_field,
};

pub(super) fn scrape_releases(client: &ScrapeClient) -> Result<Vec<Release>> {
    let url = format!("{BASE_URL}/DiscographyList.aspx");
    let html = client.fetch_html(&url)?;
    let document = Html::parse_document(&html);
    let links = parse_release_links(&document);
    let mut releases = Vec::new();
    let mut seen = HashSet::new();
    for (id, title, href) in links {
        if seen.insert(id) {
            let full = if href.starts_with("http") {
                href
            } else if href.starts_with('/') {
                format!("{BASE_URL}{href}")
            } else {
                format!("{BASE_URL}/{href}")
            };
            if let Some(release) = parse_release_page(client, &full, id, &title)? {
                releases.push(release);
            }
        }
    }
    if releases.is_empty() {
        tracing::warn!("scrape_releases: no releases found");
        warn_missing_field("releases", "list");
    }
    Ok(releases)
}

pub(super) fn parse_release_links(document: &Html) -> Vec<(i32, String, String)> {
    let Some(selector) = selector_or_warn("release link selector", "a[href*='ReleaseView.aspx']")
    else {
        return Vec::new();
    };
    warn_if_empty(document, &selector, "releases", "list_link");
    let mut releases = Vec::new();
    for element in document.select(&selector) {
        let Some(href) = element.value().attr("href") else {
            warn_missing_field("release", "href");
            continue;
        };
        let title = normalize_whitespace(&element.text().collect::<String>());
        let id = if let Some(cap) = regex(r"release=([^&]+)").captures(href) {
            let id_str = cap.get(1).map_or("", |m| m.as_str());
            stable_id_from_string(id_str)
        } else {
            warn_missing_field("release", "id");
            0
        };
        if id == 0 {
            warn_missing_field("release", "id");
        }
        releases.push((id, title, href.to_string()));
    }
    if releases.is_empty() {
        warn_missing_field("releases", "list");
    }
    releases
}

fn parse_release_page(
    client: &ScrapeClient,
    url: &str,
    id: i32,
    fallback_title: &str,
) -> Result<Option<Release>> {
    let html = client.fetch_html(url)?;
    Ok(Some(parse_release_page_html(&html, id, fallback_title)))
}

pub(super) fn parse_release_page_html(html: &str, id: i32, fallback_title: &str) -> Release {
    let document = Html::parse_document(html);
    warn_if_no_selector_match(
        &document,
        "release",
        "titleSelector",
        &["div.subtitle", ".subtitle", "h1", "title"],
    );

    let mut title = select_first_text_with_fallback(
        &document,
        "release",
        "title",
        &["div.subtitle", ".subtitle", "h1"],
        &["title", ".page-title"],
    );
    if title.is_empty() {
        title = fallback_title.to_string();
    }
    if title.is_empty() {
        warn_missing_field("release", "title");
    }

    let body_text = document.root_element().text().collect::<Vec<_>>().join(" ");
    let release_type = detect_release_type(&body_text);
    if release_type.is_none() {
        warn_missing_field("release", "releaseType");
    }

    let release_date = regex(r"Released on\s*[:\s]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})")
        .captures(&body_text)
        .and_then(|cap| cap.get(1))
        .map(|m| parse_date(m.as_str()));
    if release_date.is_none() {
        warn_missing_field("release", "releaseDate");
    }

    Release {
        id,
        title: title.clone(),
        slug: slugify(&title),
        release_type,
        release_date,
        search_text: Some(title.to_lowercase()),
    }
}
