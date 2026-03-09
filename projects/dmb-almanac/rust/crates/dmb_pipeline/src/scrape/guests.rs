use anyhow::Result;
use dmb_core::Guest;
use scraper::Html;
use std::collections::HashSet;

use super::{
    BASE_URL, ScrapeClient, build_search_text, parse_i32_or_warn, regex, select_first_text,
    selector_or_warn, slugify, warn_if_empty, warn_if_empty_text, warn_missing_field,
};

pub(super) fn scrape_guests(client: &ScrapeClient) -> Result<Vec<Guest>> {
    let url = format!("{BASE_URL}/GuestStats.aspx");
    let html = client.fetch_html(&url)?;
    let document = Html::parse_document(&html);
    let Some(selector) = selector_or_warn(
        "guest link selector",
        "a[href*='GuestStats.aspx'][href*='gid=']",
    ) else {
        return Ok(Vec::new());
    };
    warn_if_empty(&document, &selector, "guests", "list_link");
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
        tracing::warn!("scrape_guests: no guest links found");
        warn_missing_field("guests", "links");
    }

    let mut guests = Vec::new();
    for guest_url in urls {
        if let Some(guest) = parse_guest_page(client, &guest_url)? {
            guests.push(guest);
        }
    }
    if guests.is_empty() {
        warn_missing_field("guests", "list");
    }
    Ok(guests)
}

fn parse_guest_page(client: &ScrapeClient, url: &str) -> Result<Option<Guest>> {
    let html = client.fetch_html(url)?;
    let document = Html::parse_document(&html);

    let gid = regex(r"gid=(\d+)");
    let id = parse_i32_or_warn(
        gid.captures(url)
            .and_then(|cap| cap.get(1).map(|m| m.as_str())),
        "guest",
        "id",
    );
    if id == 0 {
        warn_missing_field("guest", "id");
    }

    let name = select_first_text(&document, &["h1", ".guest-name"]);
    if name.is_empty() {
        warn_missing_field("guest", "name");
        return Ok(None);
    }
    let slug = slugify(&name);

    let body_text = document.root_element().text().collect::<Vec<_>>().join(" ");
    warn_if_empty_text("guest", "body", &body_text);
    let total_appearances = {
        let value = parse_i32_or_warn(
            regex(r"(\d+)\s+(?:appearances?|shows?)")
                .captures(&body_text)
                .and_then(|cap| cap.get(1).map(|m| m.as_str())),
            "guest",
            "totalAppearances",
        );
        (value > 0).then_some(value)
    };

    let search_text = build_search_text(&[&name]);

    Ok(Some(Guest {
        id,
        slug,
        name,
        total_appearances,
        search_text: Some(search_text),
    }))
}
