use anyhow::Result;
use serde_json::{json, Value};
use std::collections::HashMap;

use super::{
    normalize_whitespace, parse_f64_or_warn, parse_i32_or_warn, regex, warn_missing_field,
    ScrapeClient, BASE_URL,
};

pub(super) fn scrape_rarity(client: &ScrapeClient) -> Result<Vec<Value>> {
    let url = format!("{BASE_URL}/ShowRarity.aspx");
    let html = client.fetch_html(&url)?;
    Ok(parse_rarity_page(&html))
}

fn parse_rarity_page(html: &str) -> Vec<Value> {
    let mut tours = Vec::new();
    let mut by_year: HashMap<i32, usize> = HashMap::new();
    let mut avg_matches = 0usize;

    let avg_re = regex(
        r"(\\d+)\\s*<a[^>]+TourShow[Ii]nfo\\.aspx\\?tid=(\\d+)[^>]*where=(\\d{4})[^>]*>([^<]+)</a>\\s*\\((\\d+\\.\\d+)\\)",
    );
    for cap in avg_re.captures_iter(html) {
        avg_matches += 1;
        let Some(rank) = cap.get(1).and_then(|m| m.as_str().parse::<i32>().ok()) else {
            continue;
        };
        let Some(year) = cap.get(3).and_then(|m| m.as_str().parse::<i32>().ok()) else {
            continue;
        };
        let rarity = parse_f64_or_warn(
            cap.get(5).map(|m| m.as_str()),
            "rarity",
            "averageRarityIndex",
        );
        let tour_name = cap
            .get(4)
            .map(|m| normalize_whitespace(m.as_str()))
            .unwrap_or_default();
        let entry = json!({
            "tourName": tour_name,
            "year": year,
            "averageRarityIndex": rarity,
            "differentSongsPlayed": 0,
            "rank": rank,
            "shows": [],
        });
        by_year.insert(year, tours.len());
        tours.push(entry);
    }
    if avg_matches == 0 {
        warn_missing_field("rarity", "averageRarity");
    }

    let songs_re = regex(
        r"<br>(\\d+)\\s*<a[^>]+TourShowInfo\\.aspx\\?tid=(\\d+)[^>]*where=(\\d{4})[^>]*>([^<]+)</a>\\s*\\((\\d+)\\)",
    );
    let mut songs_matches = 0usize;
    for cap in songs_re.captures_iter(html) {
        songs_matches += 1;
        let Some(year) = cap.get(3).and_then(|m| m.as_str().parse::<i32>().ok()) else {
            continue;
        };
        let songs = parse_i32_or_warn(
            cap.get(5).map(|m| m.as_str()),
            "rarity",
            "differentSongsPlayed",
        );
        if let Some(idx) = by_year.get(&year).copied() {
            if let Some(obj) = tours.get_mut(idx).and_then(Value::as_object_mut) {
                obj.insert("differentSongsPlayed".to_string(), json!(songs));
            } else {
                tracing::warn!(
                    year,
                    idx,
                    total = tours.len(),
                    "rarity: missing tour entry for parsed year"
                );
                warn_missing_field("rarity", "differentSongsPlayed");
            }
        }
    }
    if songs_matches == 0 {
        warn_missing_field("rarity", "differentSongsPlayed");
    }

    if tours.is_empty() {
        warn_missing_field("rarity", "tours");
    }
    tours
}
