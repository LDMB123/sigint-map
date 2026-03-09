use anyhow::Result;
use dmb_core::Song;
use scraper::Html;
use std::collections::HashSet;

use super::{
    create_sort_title, parse_date, parse_i32_or_warn, regex, select_first_text, selector_or_warn,
    slugify, warn_if_empty, warn_if_empty_text, warn_missing_field, ScrapeClient, BASE_URL,
};

pub(super) fn scrape_songs(client: &ScrapeClient) -> Result<Vec<Song>> {
    let url = format!("{BASE_URL}/songs/all-songs.aspx");
    let html = client.fetch_html(&url)?;
    let document = Html::parse_document(&html);
    let Some(selector) =
        selector_or_warn("song link selector", "a[href*='songs/summary.aspx?sid=']")
    else {
        return Ok(Vec::new());
    };
    warn_if_empty(&document, &selector, "songs", "list_link");
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
        tracing::warn!("scrape_songs: no song links found");
        warn_missing_field("songs", "links");
    }

    let mut songs = Vec::new();
    for song_url in urls {
        if let Some(song) = parse_song_page(client, &song_url)? {
            songs.push(song);
        }
    }
    if songs.is_empty() {
        warn_missing_field("songs", "list");
    }
    Ok(songs)
}

fn parse_song_page(client: &ScrapeClient, url: &str) -> Result<Option<Song>> {
    let html = client.fetch_html(url)?;
    let document = Html::parse_document(&html);

    let sid = regex(r"sid=(\d+)");
    let id = parse_i32_or_warn(
        sid.captures(url)
            .and_then(|cap| cap.get(1).map(|m| m.as_str())),
        "song",
        "id",
    );

    let title = select_first_text(
        &document,
        &["h1", ".song-title", ".songTitle", "#songTitle"],
    );
    if title.is_empty() {
        warn_missing_field("song", "title");
        return Ok(None);
    }
    if id == 0 {
        warn_missing_field("song", "id");
    }
    let slug = slugify(&title);
    let sort_title = create_sort_title(&title);
    let search_text = title.to_lowercase();

    let body_text = document.root_element().text().collect::<Vec<_>>().join(" ");
    warn_if_empty_text("song", "body", &body_text);
    let total_performances = {
        let value = parse_i32_or_warn(
            regex(r"(\d+)\s+(?:times?|performances?|shows?)")
                .captures(&body_text)
                .and_then(|cap| cap.get(1).map(|m| m.as_str())),
            "song",
            "totalPerformances",
        );
        (value > 0).then_some(value)
    };
    let last_played_date = regex(r"last(?:\s+played)?[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})")
        .captures(&body_text)
        .and_then(|cap| cap.get(1))
        .map(|m| parse_date(m.as_str()));

    Ok(Some(Song {
        id,
        slug,
        title,
        sort_title: Some(sort_title),
        total_performances,
        last_played_date,
        is_liberated: None,
        opener_count: None,
        closer_count: None,
        encore_count: None,
        search_text: Some(search_text),
    }))
}
